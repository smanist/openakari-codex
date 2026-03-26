/** Tests for model-driven runtime resolution and legacy preference migration. */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveBackend,
  getBackend,
  parseOpenCodeMessage,
  parseCodexMessage,
  createCodexExecJsonState,
  consumeCodexExecJsonMessage,
  finalizeCodexExecJsonState,
  isBillingError,
  isRateLimitError,
  getEffectiveBackendName,
  resolveModelForBackend,
  OPENCODE_MODEL,
} from "./backend.js";
import {
  getModelPreference,
  setModelPreference,
  clearModelPreference,
  setModelPreferencePath,
  setLegacyBackendPreferencePath,
  initModelPreference,
} from "./model-preference.js";

describe("resolveBackend", () => {
  it("defaults to codex runtime", () => {
    expect(resolveBackend().name).toBe("codex");
  });

  it("routes interactive-input requests to openai", () => {
    expect(resolveBackend({ requiredCapabilities: ["interactive_input"] }).name).toBe("openai");
  });

  it("routes GLM models to opencode", () => {
    expect(resolveBackend({ model: "glm5/zai-org/GLM-5-FP8" }).name).toBe("opencode");
  });
});

describe("getBackend", () => {
  it("returns codex backend by name", () => {
    expect(getBackend("codex").name).toBe("codex");
  });

  it("returns openai backend by name", () => {
    expect(getBackend("openai").name).toBe("openai");
  });

  it("returns opencode backend by name", () => {
    expect(getBackend("opencode").name).toBe("opencode");
  });
});

describe("getEffectiveBackendName", () => {
  it("returns codex by default", () => {
    expect(getEffectiveBackendName()).toBe("codex");
  });

  it("returns openai when interactive input is required", () => {
    expect(getEffectiveBackendName({ requiredCapabilities: ["interactive_input"] })).toBe("openai");
  });

  it("returns opencode for GLM models", () => {
    expect(getEffectiveBackendName({ model: OPENCODE_MODEL })).toBe("opencode");
  });
});

describe("resolveModelForBackend", () => {
  it("maps tier labels and legacy aliases for codex/openai", () => {
    expect(resolveModelForBackend("codex", "fast")).toBe("gpt-5.1-codex-mini");
    expect(resolveModelForBackend("openai", "standard")).toBe("gpt-5.4-mini");
    expect(resolveModelForBackend("codex", "strong")).toBe("gpt-5.3-codex");
    expect(resolveModelForBackend("openai", "frontier")).toBe("gpt-5.4");
    expect(resolveModelForBackend("codex", "opus")).toBe("gpt-5.4");
    expect(resolveModelForBackend("openai", "sonnet")).toBe("gpt-5.4-mini");
  });

  it("uses opencode model default for opencode", () => {
    expect(resolveModelForBackend("opencode")).toBe(OPENCODE_MODEL);
  });
});

describe("parseCodexMessage", () => {
  it("parses assistant output text events", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Hello from Codex" }] },
    });
    const msg = parseCodexMessage(line);
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("assistant");
  });

  it("parses result events", () => {
    const line = JSON.stringify({
      type: "result",
      result: "Done",
      total_cost_usd: 0.12,
      num_turns: 3,
    });
    const msg = parseCodexMessage(line);
    expect(msg).toMatchObject({ type: "result", result: "Done" });
  });
});

describe("parseOpenCodeMessage", () => {
  it("parses text events into assistant messages", () => {
    const line = JSON.stringify({ type: "text", part: { text: "Hello" } });
    expect(parseOpenCodeMessage(line)).toMatchObject({ type: "assistant" });
  });
});

describe("Codex exec json state", () => {
  it("counts turns and falls back to tool output", () => {
    const state = createCodexExecJsonState();
    consumeCodexExecJsonMessage(state, { type: "turn.started" });
    consumeCodexExecJsonMessage(state, { type: "turn.completed" });
    consumeCodexExecJsonMessage(state, {
      type: "item.completed",
      item: { type: "command_execution", command: "ls", aggregated_output: "file-a\nfile-b" },
    });
    const finalized = finalizeCodexExecJsonState(state);
    expect(finalized.numTurns).toBe(1);
    expect(finalized.text).toContain("file-a");
  });

  it("aggregates token usage from turn.completed events", () => {
    const state = createCodexExecJsonState();
    consumeCodexExecJsonMessage(state, {
      type: "turn.completed",
      usage: { input_tokens: 10, cached_input_tokens: 3, output_tokens: 5 },
    });
    consumeCodexExecJsonMessage(state, {
      type: "turn.completed",
      usage: { input_tokens: 7, cached_input_tokens: 2, output_tokens: 11 },
    });

    const finalized = finalizeCodexExecJsonState(state);
    expect(finalized.usage).toEqual({
      inputTokens: 17,
      outputTokens: 16,
      cacheReadInputTokens: 5,
    });
  });
});

describe("error helpers", () => {
  it("detects billing errors", () => {
    expect(isBillingError(new Error("unpaid invoice"))).toBe(true);
  });

  it("detects rate limit errors", () => {
    expect(isRateLimitError(new Error("rate limit exceeded"))).toBe(true);
  });
});

describe("model-preference", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "akari-model-pref-"));
    setModelPreferencePath(join(tempDir, "model-preference.json"));
    setLegacyBackendPreferencePath(join(tempDir, "backend-preference.json"));
    await clearModelPreference();
  });

  afterEach(async () => {
    setModelPreferencePath(null);
    setLegacyBackendPreferencePath(null);
    await rm(tempDir, { recursive: true, force: true });
  });

  it("persists and reloads a model preference", async () => {
    await setModelPreference("gpt-5.2");
    initModelPreference();
    expect(getModelPreference()).toBe("gpt-5.2");
  });

  it("migrates legacy opencode backend preference to a model", async () => {
    await writeFile(join(tempDir, "backend-preference.json"), JSON.stringify({ backend: "opencode" }) + "\n", "utf-8");
    initModelPreference();
    expect(getModelPreference()).toBe(OPENCODE_MODEL);
    const raw = await readFile(join(tempDir, "model-preference.json"), "utf-8");
    expect(raw).toContain(OPENCODE_MODEL);
  });

  it("migrates legacy claude/cursor backend preferences to default routing", async () => {
    await writeFile(join(tempDir, "backend-preference.json"), JSON.stringify({ backend: "claude" }) + "\n", "utf-8");
    initModelPreference();
    expect(getModelPreference()).toBeNull();
  });
});
