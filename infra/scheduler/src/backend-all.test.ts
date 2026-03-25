/** Tests for backend abstraction and preference persistence. */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
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
} from "./backend.js";
import {
  getBackendPreference,
  setBackendPreference,
  clearBackendPreference,
  setBackendPreferencePath,
  initBackendPreference,
} from "./backend-preference.js";

describe("resolveBackend", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns claude backend when preference is 'claude'", () => {
    const backend = resolveBackend("claude");
    expect(backend.name).toBe("claude");
  });

  it("returns codex backend when preference is 'codex'", () => {
    const backend = resolveBackend("codex");
    expect(backend.name).toBe("codex");
  });

  it("returns openai backend when preference is 'openai'", () => {
    const backend = resolveBackend("openai");
    expect(backend.name).toBe("openai");
  });

  it("returns cursor backend when preference is 'cursor'", () => {
    const backend = resolveBackend("cursor");
    expect(backend.name).toBe("cursor");
  });

  it("returns opencode backend when preference is 'opencode'", () => {
    const backend = resolveBackend("opencode");
    expect(backend.name).toBe("opencode");
  });

  it("returns fallback backend when preference is 'auto'", () => {
    const backend = resolveBackend("auto");
    expect(backend.name).toBe("codex");
  });

  it("routes auto to openai when interactive input is required", () => {
    const backend = resolveBackend("auto", ["interactive_input"]);
    expect(backend.name).toBe("openai");
  });

  it("respects AGENT_BACKEND environment variable", () => {
    process.env["AGENT_BACKEND"] = "codex";
    const backend = resolveBackend();
    expect(backend.name).toBe("codex");
  });

  it("defaults to auto when AGENT_BACKEND is not set", () => {
    delete process.env["AGENT_BACKEND"];
    const backend = resolveBackend();
    expect(backend.name).toBe("codex");
  });
});

describe("getBackend", () => {
  it("returns codex backend by name", () => {
    const backend = getBackend("codex");
    expect(backend.name).toBe("codex");
  });

  it("returns openai backend by name", () => {
    const backend = getBackend("openai");
    expect(backend.name).toBe("openai");
  });

  it("returns claude backend by name", () => {
    const backend = getBackend("claude");
    expect(backend.name).toBe("claude");
  });

  it("returns cursor backend by name", () => {
    const backend = getBackend("cursor");
    expect(backend.name).toBe("cursor");
  });

  it("returns opencode backend by name", () => {
    const backend = getBackend("opencode");
    expect(backend.name).toBe("opencode");
  });
});

describe("getEffectiveBackendName", () => {
  it("returns 'codex' for codex preference", () => {
    expect(getEffectiveBackendName("codex")).toBe("codex");
  });

  it("returns 'openai' for openai preference", () => {
    expect(getEffectiveBackendName("openai")).toBe("openai");
  });

  it("returns 'claude' for claude preference", () => {
    expect(getEffectiveBackendName("claude")).toBe("claude");
  });

  it("returns 'cursor' for cursor preference", () => {
    expect(getEffectiveBackendName("cursor")).toBe("cursor");
  });

  it("returns 'opencode' for opencode preference", () => {
    expect(getEffectiveBackendName("opencode")).toBe("opencode");
  });

  it("returns 'codex' for auto preference (default backend)", () => {
    expect(getEffectiveBackendName("auto")).toBe("codex");
  });

  it("returns 'openai' for auto preference when interactive input is required", () => {
    expect(getEffectiveBackendName("auto", ["interactive_input"])).toBe("openai");
  });

  it("returns 'codex' for undefined preference (defaults to auto)", () => {
    expect(getEffectiveBackendName(undefined)).toBe("codex");
  });
});

describe("resolveModelForBackend", () => {
  it("maps Claude opus alias to a Codex-compatible model", () => {
    expect(resolveModelForBackend("codex", "opus")).toBe("gpt-5.2");
    expect(resolveModelForBackend("openai", "opus")).toBe("gpt-5.2");
  });

  it("maps Claude sonnet and haiku aliases to a Codex-compatible model", () => {
    expect(resolveModelForBackend("codex", "sonnet")).toBe("gpt-5.2");
    expect(resolveModelForBackend("openai", "haiku")).toBe("gpt-5.2");
  });

  it("preserves explicit GPT model ids for Codex-compatible backends", () => {
    expect(resolveModelForBackend("codex", "gpt-5.2")).toBe("gpt-5.2");
    expect(resolveModelForBackend("openai", "gpt-5.2")).toBe("gpt-5.2");
  });

  it("preserves Claude aliases for Claude backend", () => {
    expect(resolveModelForBackend("claude", "opus")).toBe("opus");
    expect(resolveModelForBackend("claude", "sonnet")).toBe("sonnet");
  });

  it("preserves Claude aliases for Cursor backend so its own mapper can translate them", () => {
    expect(resolveModelForBackend("cursor", "opus")).toBe("opus");
    expect(resolveModelForBackend("cursor", "sonnet")).toBe("sonnet");
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

  it("parses Codex CLI thread.started into system init", () => {
    const line = JSON.stringify({
      type: "thread.started",
      thread_id: "thread-123",
    });
    const msg = parseCodexMessage(line);
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("system");
  });

  it("parses Codex CLI agent_message items into assistant messages", () => {
    const line = JSON.stringify({
      type: "item.completed",
      item: { id: "item_0", type: "agent_message", text: "OK" },
    });
    const msg = parseCodexMessage(line);
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("assistant");
  });

  it("parses Codex CLI command_execution items into tool events", () => {
    const startLine = JSON.stringify({
      type: "item.started",
      item: { id: "item_1", type: "command_execution", command: "/bin/zsh -lc ls" },
    });
    const started = parseCodexMessage(startLine);
    expect(started).not.toBeNull();
    expect(started?.type).toBe("tool_use_summary");

    const doneLine = JSON.stringify({
      type: "item.completed",
      item: { id: "item_1", type: "command_execution", command: "/bin/zsh -lc ls", status: "completed", exit_code: 0 },
    });
    const completed = parseCodexMessage(doneLine);
    expect(completed).not.toBeNull();
    expect(completed?.type).toBe("tool_call_completed");
  });

  it("parses session init events with session_id", () => {
    const line = JSON.stringify({
      type: "system",
      subtype: "init",
      session_id: "session-123",
    });
    const msg = parseCodexMessage(line);
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("system");
  });

  it("parses result events", () => {
    const line = JSON.stringify({
      type: "result",
      result: "Done",
      total_cost_usd: 0.12,
      num_turns: 4,
      session_id: "session-123",
    });
    const msg = parseCodexMessage(line);
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("result");
  });

  it("returns null for invalid JSON", () => {
    expect(parseCodexMessage("not json")).toBeNull();
  });
});

describe("Codex CLI json accumulation", () => {
  it("counts turns from turn.completed and falls back to tool output when assistant text is empty", () => {
    const state = createCodexExecJsonState();
    const lines = [
      { type: "thread.started", thread_id: "thread-123" },
      { type: "turn.started" },
      { type: "item.started", item: { id: "item_0", type: "command_execution", command: "/bin/zsh -lc echo hi" } },
      {
        type: "item.completed",
        item: { id: "item_0", type: "command_execution", command: "/bin/zsh -lc echo hi", aggregated_output: "hi\n", exit_code: 0 },
      },
      { type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } },
    ];
    for (const line of lines) consumeCodexExecJsonMessage(state, line);
    const finalized = finalizeCodexExecJsonState(state);
    expect(finalized.sessionId).toBe("thread-123");
    expect(finalized.numTurns).toBe(1);
    expect(finalized.text).toContain("echo hi");
    expect(finalized.text).toContain("hi");
  });

  it("uses Codex CLI turn events for numTurns even when multiple agent_message items appear in one turn", () => {
    const state = createCodexExecJsonState();
    const lines = [
      { type: "thread.started", thread_id: "thread-123" },
      { type: "turn.started" },
      { type: "item.completed", item: { id: "item_0", type: "agent_message", text: "A" } },
      { type: "item.completed", item: { id: "item_1", type: "agent_message", text: "B" } },
      { type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } },
    ];
    for (const line of lines) consumeCodexExecJsonMessage(state, line);
    const finalized = finalizeCodexExecJsonState(state);
    expect(finalized.numTurns).toBe(1);
    expect(finalized.text).toBe("A\nB");
  });

  it("prefers reported result turns/text when present", () => {
    const state = createCodexExecJsonState();
    const lines = [
      { type: "thread.started", thread_id: "thread-123" },
      { type: "turn.started" },
      { type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } },
      { type: "result", result: "Done", num_turns: 3, session_id: "session-abc", is_error: false },
    ];
    for (const line of lines) consumeCodexExecJsonMessage(state, line);
    const finalized = finalizeCodexExecJsonState(state);
    expect(finalized.sessionId).toBe("session-abc");
    expect(finalized.numTurns).toBe(3);
    expect(finalized.text).toBe("Done");
  });
});

describe("parseOpenCodeMessage", () => {
  it("parses tool_use with bash command", () => {
    const line = JSON.stringify({
      type: "tool_use",
      part: {
        tool: "bash",
        state: {
          status: "completed",
          input: { command: "npm test" },
        },
      },
    });
    const msg = parseOpenCodeMessage(line);
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("tool_use_summary");
    expect((msg as unknown as { summary: string }).summary).toBe("bash `npm test`");
  });

  it("parses tool_use with long bash command (truncated)", () => {
    const longCmd = "a".repeat(100);
    const line = JSON.stringify({
      type: "tool_use",
      part: {
        tool: "bash",
        state: {
          input: { command: longCmd },
        },
      },
    });
    const msg = parseOpenCodeMessage(line);
    expect(msg).not.toBeNull();
    expect((msg as unknown as { summary: string }).summary).toBe("bash `" + "a".repeat(80) + "...`");
  });

  it("parses tool_use with file_path", () => {
    const line = JSON.stringify({
      type: "tool_use",
      part: {
        tool: "read",
        state: {
          input: { file_path: "/home/user/test.ts" },
        },
      },
    });
    const msg = parseOpenCodeMessage(line);
    expect(msg).not.toBeNull();
    expect((msg as unknown as { summary: string }).summary).toBe("read /home/user/test.ts");
  });

  it("parses tool_use with pattern", () => {
    const line = JSON.stringify({
      type: "tool_use",
      part: {
        tool: "glob",
        state: {
          input: { pattern: "**/*.ts" },
        },
      },
    });
    const msg = parseOpenCodeMessage(line);
    expect(msg).not.toBeNull();
    expect((msg as unknown as { summary: string }).summary).toBe("glob **/*.ts");
  });

  it("parses tool_use without input (tool name only)", () => {
    const line = JSON.stringify({
      type: "tool_use",
      part: {
        tool: "bash",
      },
    });
    const msg = parseOpenCodeMessage(line);
    expect(msg).not.toBeNull();
    expect((msg as unknown as { summary: string }).summary).toBe("bash");
  });

  it("parses text message", () => {
    const line = JSON.stringify({
      type: "text",
      part: { text: "Hello world" },
    });
    const msg = parseOpenCodeMessage(line);
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("assistant");
  });

  it("parses error message", () => {
    const line = JSON.stringify({
      type: "error",
      error: { data: { message: "Something went wrong" } },
    });
    const msg = parseOpenCodeMessage(line);
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("result");
    expect((msg as unknown as { is_error: boolean }).is_error).toBe(true);
  });

  it("returns null for invalid JSON", () => {
    const msg = parseOpenCodeMessage("not valid json");
    expect(msg).toBeNull();
  });

  it("returns null for unknown message type", () => {
    const line = JSON.stringify({ type: "unknown_type" });
    const msg = parseOpenCodeMessage(line);
    expect(msg).toBeNull();
  });
});

describe("isBillingError", () => {
  it.each([
    ["unpaid invoice", "Cursor agent exited with code 1: b: You have an unpaid invoice", true],
    ["payment required", "Payment required to continue", true],
    ["billing error", "Billing issue detected", true],
    ["subscription error", "Subscription expired", true],
    ["insufficient credit", "Insufficient credit balance", true],
    ["non-billing error", "Connection timeout", false],
  ])("detects %s", (_name, message, expected) => {
    const err = new Error(message);
    expect(isBillingError(err)).toBe(expected);
  });

  it.each([
    ["unpaid invoice", "unpaid invoice", true],
    ["random error", "some random error", false],
  ])("handles string error: %s", (_name, message, expected) => {
    expect(isBillingError(message)).toBe(expected);
  });
});

describe("isRateLimitError", () => {
  it.each([
    ["rate limit", "Rate limit exceeded", true],
    ["429 error", "HTTP 429 Too Many Requests", true],
    ["quota exceeded", "Quota exceeded for this API", true],
    ["overloaded", "Service overloaded, please retry", true],
    ["non-rate-limit error", "Internal server error", false],
    ["billing error", "Unpaid invoice", false],
  ])("detects %s", (_name, message, expected) => {
    const err = new Error(message);
    expect(isRateLimitError(err)).toBe(expected);
  });
});

describe("backend-preference", () => {
  let tmpDir: string;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "akari-backend-test-"));
    setBackendPreferencePath(join(tmpDir, "backend-preference.json"));
  });

  afterEach(async () => {
    setBackendPreferencePath(null);
    process.env = { ...originalEnv };
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null when no preference is set", async () => {
    await clearBackendPreference();
    expect(getBackendPreference()).toBeNull();
  });

  it("sets and retrieves a backend preference", async () => {
    await setBackendPreference("claude");
    expect(getBackendPreference()).toBe("claude");
  });

  it("persists preference across reads", async () => {
    await setBackendPreference("cursor");
    expect(getBackendPreference()).toBe("cursor");
    expect(getBackendPreference()).toBe("cursor");
  });

  it("clears preference", async () => {
    await setBackendPreference("opencode");
    expect(getBackendPreference()).toBe("opencode");

    await clearBackendPreference();
    expect(getBackendPreference()).toBeNull();
  });

  it("supports all valid backends", async () => {
    const backends = ["codex", "openai", "claude", "cursor", "opencode", "auto"] as const;
    for (const backend of backends) {
      await setBackendPreference(backend);
      expect(getBackendPreference()).toBe(backend);
    }
  });

  it("loads persisted preference from file on init", async () => {
    const prefPath = join(tmpDir, "backend-preference.json");
    await writeFile(prefPath, JSON.stringify({ backend: "cursor" }) + "\n", "utf-8");

    setBackendPreferencePath(prefPath);
    initBackendPreference();
    expect(getBackendPreference()).toBe("cursor");
  });

  it("handles missing file gracefully on init", async () => {
    setBackendPreferencePath(join(tmpDir, "nonexistent.json"));
    initBackendPreference();
    expect(getBackendPreference()).toBeNull();
  });

  it("handles invalid JSON gracefully on init", async () => {
    const prefPath = join(tmpDir, "backend-preference.json");
    await writeFile(prefPath, "not valid json", "utf-8");

    setBackendPreferencePath(prefPath);
    initBackendPreference();
    expect(getBackendPreference()).toBeNull();
  });

  it("handles invalid backend value gracefully on init", async () => {
    const prefPath = join(tmpDir, "backend-preference.json");
    await writeFile(prefPath, JSON.stringify({ backend: "invalid" }) + "\n", "utf-8");

    setBackendPreferencePath(prefPath);
    initBackendPreference();
    expect(getBackendPreference()).toBeNull();
  });

  it("writes valid JSON to file", async () => {
    const prefPath = join(tmpDir, "backend-preference.json");
    setBackendPreferencePath(prefPath);
    await setBackendPreference("claude");

    const content = await readFile(prefPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.backend).toBe("claude");
  });

  it("clears file content when preference is cleared", async () => {
    const prefPath = join(tmpDir, "backend-preference.json");
    setBackendPreferencePath(prefPath);
    await setBackendPreference("claude");
    await clearBackendPreference();

    const content = await readFile(prefPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.backend).toBeUndefined();
  });
});
