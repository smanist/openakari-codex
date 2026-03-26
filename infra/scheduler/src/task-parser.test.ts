import { describe, it, expect } from "vitest";
import {
  BLOCKED_RE,
  IN_PROGRESS_RE,
  APPROVAL_NEEDED_RE,
  APPROVED_RE,
  REQUIRES_FRONTIER_RE,
  REQUIRES_OPUS_RE,
  FLEET_ELIGIBLE_RE,
  ZERO_RESOURCE_RE,
  ESCALATE_RE,
  isOpenTaskLine,
  isIndentedContinuation,
  extractTaskText,
} from "./task-parser.js";

describe("task-parser", () => {
  describe("tag regexes", () => {
    describe("BLOCKED_RE", () => {
      it.each([
        ["[blocked-by: external-dep]", true],
        ["[BLOCKED-BY: something]", true],
        ["[fleet-eligible]", false],
        ["[in-progress: 2026-01-01]", false],
      ])("matches %s: %s", (input, expected) => {
        expect(BLOCKED_RE.test(input)).toBe(expected);
      });
    });

    describe("IN_PROGRESS_RE", () => {
      it.each([
        ["[in-progress: 2026-01-01]", true],
        ["[IN-PROGRESS: 2026-03-01]", true],
        ["[blocked-by: dep]", false],
      ])("matches %s: %s", (input, expected) => {
        expect(IN_PROGRESS_RE.test(input)).toBe(expected);
      });
    });

    describe("APPROVAL_NEEDED_RE", () => {
      it.each([
        ["[approval-needed]", true],
        ["[APPROVAL-NEEDED]", true],
        ["[approved: 2026-01-01]", false],
      ])("matches %s: %s", (input, expected) => {
        expect(APPROVAL_NEEDED_RE.test(input)).toBe(expected);
      });
    });

    describe("APPROVED_RE", () => {
      it.each([
        ["[approved: 2026-01-01]", true],
        ["[APPROVED: 2026-03-01]", true],
        ["[approval-needed]", false],
      ])("matches %s: %s", (input, expected) => {
        expect(APPROVED_RE.test(input)).toBe(expected);
      });
    });

    describe("REQUIRES_FRONTIER_RE", () => {
      it.each([
        ["[requires-frontier]", true],
        ["[REQUIRES-FRONTIER]", true],
        ["[REQUIRES-OPUS]", true],
        ["[fleet-eligible]", false],
      ])("matches %s: %s", (input, expected) => {
        expect(REQUIRES_FRONTIER_RE.test(input)).toBe(expected);
      });
    });

    describe("REQUIRES_OPUS_RE (deprecated alias)", () => {
      it.each([
        ["[requires-frontier]", true],
        ["[requires-opus]", true],
        ["[fleet-eligible]", false],
      ])("matches %s: %s", (input, expected) => {
        expect(REQUIRES_OPUS_RE.test(input)).toBe(expected);
      });
    });

    describe("FLEET_ELIGIBLE_RE", () => {
      it.each([
        ["[fleet-eligible]", true],
        ["[FLEET-ELIGIBLE]", true],
        ["[requires-frontier]", false],
      ])("matches %s: %s", (input, expected) => {
        expect(FLEET_ELIGIBLE_RE.test(input)).toBe(expected);
      });
    });

    describe("ZERO_RESOURCE_RE", () => {
      it.each([
        ["[zero-resource]", true],
        ["[ZERO-RESOURCE]", true],
        ["[fleet-eligible]", false],
      ])("matches %s: %s", (input, expected) => {
        expect(ZERO_RESOURCE_RE.test(input)).toBe(expected);
      });
    });

    describe("ESCALATE_RE", () => {
      it.each([
        ["[escalate]", true],
        ["[ESCALATE]", true],
        ["[escalate: unexpected complexity]", true],
        ["[ESCALATE: blocker found]", true],
        ["[fleet-eligible]", false],
      ])("matches %s: %s", (input, expected) => {
        expect(ESCALATE_RE.test(input)).toBe(expected);
      });
    });
  });

  describe("isOpenTaskLine", () => {
    it.each([
      ["- [ ] Do something", true, "open task line"],
      ["- [ ] Task with [fleet-eligible]", true, "open task with tag"],
      ["  - [ ] Indented task", true, "indented open task"],
      ["- [x] Done task", false, "completed task (lowercase x)"],
      ["- [X] Done task", false, "completed task (uppercase X)"],
      ["Just text", false, "non-task text"],
      ["  Done when: file exists", false, "continuation line"],
      ["", false, "empty string"],
    ])("returns %s for %s", (input, expected, _desc) => {
      expect(isOpenTaskLine(input)).toBe(expected);
    });
  });

  describe("isIndentedContinuation", () => {
    it.each([
      ["  Why: context", true],
      ["  Done when: file exists", true],
      ["    Priority: high", true],
      ["- [ ] New task", false],
      ["  - [ ] Indented task", false],
      ["Not indented", false],
      ["- List item", false],
      ["  - [x] Done", false],
    ])("returns %s for %s", (input, expected) => {
      expect(isIndentedContinuation(input)).toBe(expected);
    });
  });

  describe("extractTaskText", () => {
    it.each([
      ["- [ ] Write tests", "Write tests"],
      ["  - [ ] Indented task", "Indented task"],
      ["- [ ] Do work [fleet-eligible]", "Do work [fleet-eligible]"],
      ["- [ ] Task   ", "Task"],
      ["- [ ] Implement feature X [requires-frontier] [fleet-eligible]", "Implement feature X [requires-frontier] [fleet-eligible]"],
    ])("extracts from %s", (input, expected) => {
      expect(extractTaskText(input)).toBe(expected);
    });
  });
});
