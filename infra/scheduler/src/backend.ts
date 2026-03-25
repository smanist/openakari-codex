/** Agent backend abstraction. Supports Codex CLI, OpenAI/Codex transport, Claude Code SDK, Cursor Agent CLI, and opencode CLI. */

import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import {
  runQuery as claudeRunQuery,
  runQuerySupervised as claudeRunQuerySupervised,
  type QueryOpts,
  type QueryResult,
  type SDKMessage,
} from "./sdk.js";
import { getBackendPreference } from "./backend-preference.js";
import { getSessionCostFromDb } from "./opencode-db.js";

// ── Interfaces ───────────────────────────────────────────────────────────────

export type BackendCapability =
  | "interactive_input"
  | "session_interrupt"
  | "subagents"
  | "native_system_prompt";

export type BackendName = "codex" | "openai" | "claude" | "cursor" | "opencode";
export type BackendPreference = BackendName | "auto";

export interface UserInputMessage {
  content: string;
  sessionId?: string;
}

/** Handle for supervising a running session (watch / ask / stop). */
export interface SessionHandle {
  /** Gracefully interrupt the session. */
  interrupt(): Promise<void>;
  /** Inject a human message into the session when the backend supports it. */
  streamInput?(input: AsyncIterable<UserInputMessage>): Promise<void>;
  /** Backend that produced this handle. */
  readonly backend: BackendName;
  readonly capabilities: ReadonlySet<BackendCapability>;
  supportsCapability(capability: BackendCapability): boolean;
}

/** Common options for running a query through any backend. */
export interface BackendQueryOpts extends QueryOpts {
  /** For Cursor: prepend this to the prompt since CLI has no system prompt flag. */
  systemPromptText?: string;
  /** Capabilities the caller requires when selecting a backend in auto mode. */
  requiredCapabilities?: BackendCapability[];
}

export interface SupervisedResult {
  handle: SessionHandle;
  result: Promise<QueryResult>;
}

export interface AgentBackend {
  readonly name: BackendName;
  readonly capabilities: ReadonlySet<BackendCapability>;
  runQuery(opts: BackendQueryOpts): Promise<QueryResult>;
  runSupervised(opts: BackendQueryOpts): SupervisedResult;
}

function capabilitySet(...caps: BackendCapability[]): ReadonlySet<BackendCapability> {
  return new Set(caps);
}

function makeHandle(
  backend: BackendName,
  capabilities: ReadonlySet<BackendCapability>,
  interrupt: () => Promise<void>,
  streamInput?: (input: AsyncIterable<UserInputMessage>) => Promise<void>,
): SessionHandle {
  return {
    backend,
    capabilities,
    interrupt,
    streamInput,
    supportsCapability(capability: BackendCapability) {
      return capabilities.has(capability);
    },
  };
}

async function materializeUserInput(input: AsyncIterable<UserInputMessage>): Promise<UserInputMessage | null> {
  const chunks: string[] = [];
  let sessionId: string | undefined;
  for await (const item of input) {
    if (!item) continue;
    if (item.sessionId) sessionId = item.sessionId;
    if (item.content) chunks.push(item.content);
  }
  const content = chunks.join("\n").trim();
  if (!content) return null;
  return { content, sessionId };
}

// ── Claude Backend (SDK) ─────────────────────────────────────────────────────

class ClaudeBackend implements AgentBackend {
  readonly name = "claude" as const;
  readonly capabilities = capabilitySet(
    "interactive_input",
    "session_interrupt",
    "subagents",
    "native_system_prompt",
  );

  async runQuery(opts: BackendQueryOpts): Promise<QueryResult> {
    return claudeRunQuery({
      ...opts,
      systemPrompt: opts.systemPrompt ?? { type: "preset", preset: "claude_code" },
      tools: opts.tools ?? { type: "preset", preset: "claude_code" },
    });
  }

  runSupervised(opts: BackendQueryOpts): SupervisedResult {
    const supervised = claudeRunQuerySupervised({
      ...opts,
      systemPrompt: opts.systemPrompt ?? { type: "preset", preset: "claude_code" },
      tools: opts.tools ?? { type: "preset", preset: "claude_code" },
    });
    const handle = makeHandle(
      "claude",
      this.capabilities,
      () => supervised.query.interrupt(),
      async (input) => {
        const msg = await materializeUserInput(input);
        if (!msg) return;
        await supervised.query.streamInput(
          (async function* () {
            yield {
              type: "user" as const,
              message: { role: "user" as const, content: msg.content },
              parent_tool_use_id: null,
              session_id: msg.sessionId ?? "",
            };
          })(),
        );
      },
    );
    return { handle, result: supervised.result };
  }
}

// ── Codex/OpenAI backends (Codex CLI transport) ─────────────────────────────

const CODEX_DEFAULT_MODEL = "gpt-5.2";
const CODEX_MODEL_ALIASES: Record<string, string> = {
  opus: CODEX_DEFAULT_MODEL,
  sonnet: CODEX_DEFAULT_MODEL,
  haiku: CODEX_DEFAULT_MODEL,
};

export function resolveModelForBackend(
  backendName: BackendName,
  model?: string,
): string {
  const requested = model?.trim();
  if (!requested) {
    return backendName === "codex" || backendName === "openai"
      ? CODEX_DEFAULT_MODEL
      : "";
  }

  if (backendName === "codex" || backendName === "openai") {
    return CODEX_MODEL_ALIASES[requested] ?? requested;
  }

  return requested;
}

export function parseCodexMessage(line: string): SDKMessage | null {
  try {
    const msg = JSON.parse(line);
    return parseCodexMessageObject(msg);
  } catch {
    return null;
  }
}

function parseCodexMessageObject(msg: unknown): SDKMessage | null {
  try {
    if (!msg || typeof msg !== "object") return null;
    const parsed = msg as Record<string, unknown>;
    const type = parsed.type;

    // Codex CLI v0.110+ stream-json schema (thread/turn/item events).
    // Example lines captured from `codex exec --json`:
    //   {"type":"thread.started","thread_id":"..."}
    //   {"type":"item.completed","item":{"type":"agent_message","text":"OK"}}
    //   {"type":"item.started","item":{"type":"command_execution","command":"/bin/zsh -lc ls",...}}
    if (type === "thread.started" && (parsed.thread_id || parsed.threadId || parsed.session_id || parsed.sessionId)) {
      return {
        type: "system",
        subtype: "init",
        session_id: parsed.thread_id ?? parsed.threadId ?? parsed.session_id ?? parsed.sessionId,
      } as unknown as SDKMessage;
    }

    const item = parsed.item as Record<string, unknown> | undefined;
    if (type === "item.completed" && item?.type === "agent_message" && typeof item?.text === "string") {
      return {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: item.text as string }] },
      } as unknown as SDKMessage;
    }

    if (type === "item.started" && item?.type === "command_execution" && typeof item?.command === "string") {
      const cmd = item.command as string;
      return { type: "tool_use_summary", summary: `Shell \`${cmd.length > 80 ? cmd.slice(0, 80) + "..." : cmd}\`` } as unknown as SDKMessage;
    }

    if (type === "item.completed" && item?.type === "command_execution") {
      return { type: "tool_call_completed" } as unknown as SDKMessage;
    }

    if (type === "assistant" && (parsed.message as Record<string, unknown> | undefined)?.content) {
      return parsed as unknown as SDKMessage;
    }

    if (type === "system" && parsed.subtype === "init") {
      return {
        type: "system",
        subtype: "init",
        session_id: parsed.session_id ?? parsed.sessionId ?? parsed.id ?? "",
      } as unknown as SDKMessage;
    }

    if (type === "result") {
      return {
        type: "result",
        subtype: parsed.subtype ?? "success",
        duration_ms: parsed.duration_ms ?? parsed.durationMs ?? 0,
        is_error: parsed.is_error ?? false,
        result: parsed.result ?? parsed.output_text ?? "",
        session_id: parsed.session_id ?? parsed.sessionId ?? parsed.id ?? "",
        total_cost_usd: parsed.total_cost_usd ?? 0,
        num_turns: parsed.num_turns ?? 0,
      } as unknown as SDKMessage;
    }

    if (type === "tool_use" || type === "tool_call") {
      const tool = parsed.tool as Record<string, unknown> | undefined;
      const part = parsed.part as Record<string, unknown> | undefined;
      const partState = (part?.state as Record<string, unknown> | undefined)?.input as Record<string, unknown> | undefined;
      const toolName = parsed.name ?? parsed.tool_name ?? tool?.name ?? part?.tool ?? "tool";
      const input = (parsed.input ?? parsed.args ?? partState ?? {}) as Record<string, unknown>;
      let detail = "";
      if (input.command) {
        const cmd = String(input.command);
        detail = ` \`${cmd.length > 80 ? cmd.slice(0, 80) + "..." : cmd}\``;
      } else if (input.file_path) {
        detail = ` ${input.file_path}`;
      } else if (input.path) {
        detail = ` ${input.path}`;
      } else if (input.pattern) {
        detail = ` ${input.pattern}`;
      }
      return { type: "tool_use_summary", summary: `${toolName}${detail}` } as unknown as SDKMessage;
    }

    if (type === "tool_call_completed" || (type === "tool_call" && parsed.subtype === "completed")) {
      return { type: "tool_call_completed" } as unknown as SDKMessage;
    }

    return null;
  } catch {
    return null;
  }
}

export type CodexExecJsonState = {
  sessionId?: string;
  assistantText: string;
  assistantMessageCount: number;
  turnStartedCount: number;
  turnCompletedCount: number;
  reportedTurns?: number;
  reportedText?: string;
  toolFallbackText: string;
  toolFallbackCommandCount: number;
  toolFallbackTruncated: boolean;
  isError: boolean;
};

const CODEX_TOOL_FALLBACK_MAX_CHARS = 20_000;
const CODEX_TOOL_FALLBACK_MAX_COMMANDS = 25;

export function createCodexExecJsonState(): CodexExecJsonState {
  return {
    assistantText: "",
    assistantMessageCount: 0,
    turnStartedCount: 0,
    turnCompletedCount: 0,
    toolFallbackText: "",
    toolFallbackCommandCount: 0,
    toolFallbackTruncated: false,
    isError: false,
  };
}

export function consumeCodexExecJsonMessage(state: CodexExecJsonState, raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  const msg = raw as Record<string, unknown>;
  const type = msg.type;
  if (type === "thread.started") {
    const threadId = (msg.thread_id ?? msg.threadId ?? msg.session_id ?? msg.sessionId);
    if (typeof threadId === "string" && threadId) state.sessionId = threadId;
    return;
  }

  if (type === "turn.started") {
    state.turnStartedCount += 1;
    return;
  }

  if (type === "turn.completed") {
    state.turnCompletedCount += 1;
    return;
  }

  if (type === "item.completed") {
    const item = msg.item as Record<string, unknown> | undefined;
    if (!item || typeof item !== "object") return;
    if (item.type === "agent_message" && typeof item.text === "string") {
      state.assistantMessageCount += 1;
      const text = item.text.trimEnd();
      if (text) {
        if (state.assistantText) state.assistantText += "\n";
        state.assistantText += text;
      }
      return;
    }

    if (item.type === "command_execution") {
      if (state.toolFallbackTruncated) return;
      if (state.toolFallbackCommandCount >= CODEX_TOOL_FALLBACK_MAX_COMMANDS) {
        state.toolFallbackTruncated = true;
        state.toolFallbackText += "\n\n[tool output truncated: too many commands]";
        return;
      }

      const command = typeof item.command === "string" ? item.command : "";
      const output = typeof item.aggregated_output === "string" ? item.aggregated_output : "";
      const exitCode = typeof item.exit_code === "number" ? item.exit_code : null;

      const header = command ? `$ ${command}` : "$ <command>";
      const body = output.trimEnd();
      const suffix = (exitCode != null && exitCode !== 0 && !body) ? `\n(exit_code: ${exitCode})` : "";

      let chunk = header;
      if (body) chunk += `\n${body}`;
      if (suffix) chunk += suffix;

      if (chunk.trim()) {
        if (state.toolFallbackText) state.toolFallbackText += "\n\n";
        state.toolFallbackText += chunk;
        state.toolFallbackCommandCount += 1;
      }

      if (state.toolFallbackText.length > CODEX_TOOL_FALLBACK_MAX_CHARS) {
        state.toolFallbackTruncated = true;
        state.toolFallbackText = state.toolFallbackText.slice(0, CODEX_TOOL_FALLBACK_MAX_CHARS) +
          "\n\n[tool output truncated]";
      }

      return;
    }
  }

  if (type === "result") {
    if (typeof msg.result === "string" && msg.result) state.reportedText = msg.result;
    if (typeof msg.output_text === "string" && msg.output_text) state.reportedText = msg.output_text;
    if (typeof msg.is_error === "boolean" && msg.is_error) state.isError = true;
    if (typeof msg.session_id === "string" && msg.session_id) state.sessionId = msg.session_id;
    if (typeof msg.sessionId === "string" && msg.sessionId) state.sessionId = msg.sessionId;
    if (typeof msg.num_turns === "number" && msg.num_turns > 0) state.reportedTurns = msg.num_turns;
    return;
  }
}

export function finalizeCodexExecJsonState(state: CodexExecJsonState): { text: string; numTurns: number; sessionId?: string; ok: boolean } {
  const text = (state.reportedText ?? state.assistantText).trim();
  const finalText = text || state.toolFallbackText.trim();
  const numTurns = (state.reportedTurns && state.reportedTurns > 0)
    ? state.reportedTurns
    : (state.turnCompletedCount || state.turnStartedCount || state.assistantMessageCount);
  return { text: finalText, numTurns, sessionId: state.sessionId, ok: !state.isError };
}

abstract class BaseCodexBackend implements AgentBackend {
  abstract readonly name: "codex" | "openai";
  abstract readonly capabilities: ReadonlySet<BackendCapability>;

  protected buildPrompt(opts: BackendQueryOpts): string {
    if (opts.systemPromptText) {
      return `<system_instructions>\n${opts.systemPromptText}\n</system_instructions>\n\n${opts.prompt}`;
    }
    return opts.prompt;
  }

  protected buildExecArgs(opts: BackendQueryOpts): string[] {
    const prompt = this.buildPrompt(opts);
    const model = resolveModelForBackend(this.name, opts.model);
    const args = [
      "exec",
      "--json",
      "-C", opts.cwd,
      "--dangerously-bypass-approvals-and-sandbox",
    ];
    args.push("-m", model);
    args.push(prompt);
    return args;
  }

  protected buildResumeArgs(sessionId: string, prompt: string, opts: BackendQueryOpts): string[] {
    const model = resolveModelForBackend(this.name, opts.model);
    const args = [
      "exec",
      "resume",
      "--json",
      "-C", opts.cwd,
      "--dangerously-bypass-approvals-and-sandbox",
    ];
    args.push("-m", model);
    args.push(sessionId, prompt);
    return args;
  }

  protected spawnCodex(
    args: string[],
    opts: BackendQueryOpts,
    onMessage?: (msg: SDKMessage) => void | Promise<void>,
  ): { proc: ChildProcess; result: Promise<QueryResult>; getSessionId: () => string | undefined } {
    const start = Date.now();
    const cwd = opts.cwd;
    const codexBin = process.env["CODEX_BIN"] || "codex";
    console.log(`[${this.name}] Spawning: ${codexBin} ${args.slice(0, 6).join(" ")} ... (cwd=${cwd})`);

    const proc = spawn(codexBin, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    const streamState = createCodexExecJsonState();

    const result = new Promise<QueryResult>((resolve, reject) => {
      let stderr = "";

      if (proc.stdout) {
        const rl = createInterface({ input: proc.stdout });
        rl.on("line", async (line) => {
          let raw: unknown;
          try {
            raw = JSON.parse(line);
          } catch {
            return;
          }

          consumeCodexExecJsonMessage(streamState, raw);
          const msg = parseCodexMessageObject(raw);
          if (!msg) return;

          if (onMessage) {
            try { await onMessage(msg); } catch { /* best-effort */ }
          }

          if (msg.type === "system" && "subtype" in msg && (msg as Record<string, unknown>).subtype === "init") {
            streamState.sessionId = (msg as Record<string, unknown>).session_id as string;
          }

          if (msg.type === "assistant") {
            const content = (msg as Record<string, unknown>).message as { content?: Array<{ type: string; text?: string }> } | undefined;
            if (content?.content) {
              for (const block of content.content) {
                if (block.type === "text" && block.text) {
                  // Keep assistant text accumulation for compatibility, but do not use this
                  // for `numTurns` (Codex CLI emits explicit `turn.*` events).
                  if (streamState.assistantText) streamState.assistantText += "\n";
                  streamState.assistantText += block.text;
                }
              }
            }
          }

          if (msg.type === "result") {
            const r = msg as unknown as { result?: string; is_error?: boolean; session_id?: string; num_turns?: number };
            if (r.result) streamState.reportedText = r.result;
            if (r.is_error) streamState.isError = true;
            if (r.session_id) streamState.sessionId = r.session_id;
            if (typeof r.num_turns === "number" && r.num_turns > 0) streamState.reportedTurns = r.num_turns;
          }
        });
      }

      if (proc.stderr) {
        proc.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
      }

      proc.on("error", (err) => {
        reject(new Error(`${this.name} failed to start: ${err.message}`));
      });

      proc.on("close", (code) => {
        const durationMs = Date.now() - start;
        const finalized = finalizeCodexExecJsonState(streamState);
        const finalText = finalized.text || stderr.trim();
        if (code !== 0 && !finalText) {
          reject(new Error(
            `${this.name} exited with code ${code}${stderr ? `: ${stderr.slice(0, 500)}` : ""}`,
          ));
          return;
        }
        resolve({
          text: finalText,
          ok: finalized.ok,
          sessionId: finalized.sessionId,
          costUsd: undefined,
          numTurns: finalized.numTurns,
          durationMs,
        });
      });
    });

    return { proc, result, getSessionId: () => streamState.sessionId };
  }

  async runQuery(opts: BackendQueryOpts): Promise<QueryResult> {
    const { result } = this.spawnCodex(this.buildExecArgs(opts), opts, opts.onMessage);
    return result;
  }

  runSupervised(opts: BackendQueryOpts): SupervisedResult {
    const { proc, result, getSessionId } = this.spawnCodex(this.buildExecArgs(opts), opts, opts.onMessage);
    const streamInput = this.capabilities.has("interactive_input")
      ? async (input: AsyncIterable<UserInputMessage>) => {
          const msg = await materializeUserInput(input);
          const sessionId = msg?.sessionId ?? getSessionId();
          if (!msg || !sessionId) {
            throw new Error(`${this.name} session has no resumable session id for injected input`);
          }
          const resume = this.spawnCodex(this.buildResumeArgs(sessionId, msg.content, opts), opts, opts.onMessage);
          await resume.result;
        }
      : undefined;

    const handle = makeHandle(
      this.name,
      this.capabilities,
      async () => {
        if (!proc.killed) {
          proc.kill("SIGTERM");
          setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); }, 5000);
        }
      },
      streamInput,
    );

    return { handle, result };
  }
}

class CodexBackend extends BaseCodexBackend {
  readonly name = "codex" as const;
  readonly capabilities = capabilitySet("session_interrupt", "subagents");
}

class OpenAIBackend extends BaseCodexBackend {
  readonly name = "openai" as const;
  readonly capabilities = capabilitySet(
    "interactive_input",
    "session_interrupt",
    "subagents",
    "native_system_prompt",
  );
}

// ── Cursor Backend (CLI) ─────────────────────────────────────────────────────

const CURSOR_DEFAULT_MODEL = "opus-4.6-thinking";

/** Map Claude-compatible short model names to Cursor-specific model IDs.
 *  Profiles use Claude-compatible names (e.g. "opus"); the Cursor backend
 *  translates them here so both backends work from the same profile. */
const CURSOR_MODEL_MAP: Record<string, string> = {
  opus: "opus-4.6-thinking",
};

/** Parse a line of Cursor stream-json output into an SDKMessage-compatible shape. */
export function parseCursorMessage(line: string): SDKMessage | null {
  try {
    const msg = JSON.parse(line);

    // system init
    if (msg.type === "system" && msg.subtype === "init") {
      return msg as SDKMessage;
    }

    // assistant text
    if (msg.type === "assistant" && msg.message?.content) {
      return msg as SDKMessage;
    }

    // result
    if (msg.type === "result") {
      return {
        type: "result",
        subtype: msg.subtype,
        duration_ms: msg.duration_ms,
        is_error: msg.is_error ?? false,
        result: msg.result ?? "",
        session_id: msg.session_id ?? "",
        // Cursor doesn't report cost or turns
        total_cost_usd: 0,
        num_turns: 0,
      } as unknown as SDKMessage;
    }

    // tool_call — summarize as tool_use_summary for watchers
    // Cursor format: tool_call.{globToolCall,readToolCall,shellToolCall,fileEditToolCall,grepToolCall,...}
    if (msg.type === "tool_call" && msg.subtype === "started") {
      const tc = msg.tool_call ?? {};
      let summary = "";
      if (tc.shellToolCall) {
        summary = `Shell \`${(tc.shellToolCall.args?.command ?? "").slice(0, 80)}\``;
      } else if (tc.readToolCall) {
        summary = `Read \`${tc.readToolCall.args?.path ?? "?"}\``;
      } else if (tc.globToolCall) {
        summary = `Glob \`${tc.globToolCall.args?.globPattern ?? "?"}\``;
      } else if (tc.grepToolCall) {
        summary = `Grep \`${tc.grepToolCall.args?.pattern ?? "?"}\``;
      } else if (tc.fileEditToolCall) {
        summary = `Edit \`${tc.fileEditToolCall.args?.filePath ?? tc.fileEditToolCall.args?.path ?? "?"}\``;
      } else if (tc.writeToolCall) {
        summary = `Write \`${tc.writeToolCall.args?.filePath ?? tc.writeToolCall.args?.path ?? "?"}\``;
      } else {
        // Unknown tool — try to extract a name from the keys
        const keys = Object.keys(tc).filter(k => k.endsWith("ToolCall"));
        summary = keys.length > 0 ? keys[0].replace("ToolCall", "") : "tool";
      }
      return { type: "tool_use_summary", summary } as unknown as SDKMessage;
    }

    // tool_call.completed — emit for stall guard to clear timer (ADR R1)
    if (msg.type === "tool_call" && msg.subtype === "completed") {
      return { type: "tool_call_completed" } as unknown as SDKMessage;
    }

    return null;
  } catch {
    return null;
  }
}

class CursorBackend implements AgentBackend {
  readonly name = "cursor" as const;
  readonly capabilities = capabilitySet("session_interrupt");

  private buildPrompt(opts: BackendQueryOpts): string {
    if (opts.systemPromptText) {
      return `<system_instructions>\n${opts.systemPromptText}\n</system_instructions>\n\n${opts.prompt}`;
    }
    return opts.prompt;
  }

  private buildArgs(opts: BackendQueryOpts): string[] {
    const rawModel = opts.model ?? CURSOR_DEFAULT_MODEL;
    const model = CURSOR_MODEL_MAP[rawModel] ?? rawModel;
    const prompt = this.buildPrompt(opts);
    return [
      "-p",
      "--output-format", "stream-json",
      "--yolo", "--trust",
      "--workspace", opts.cwd,
      "--model", model,
      prompt,
    ];
  }

  private spawnAgent(
    opts: BackendQueryOpts,
    onMessage?: (msg: SDKMessage) => void | Promise<void>,
  ): { proc: ChildProcess; result: Promise<QueryResult> } {
    const start = Date.now();
    const args = this.buildArgs(opts);
    const cwd = opts.cwd;

    console.log(`[cursor] Spawning: agent ${args.slice(0, 6).join(" ")} ... (cwd=${cwd})`);

    const proc = spawn("agent", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    const result = new Promise<QueryResult>((resolve, reject) => {
      let text = "";
      let sessionId: string | undefined;
      let numTurns = 0;
      let isError = false;
      let stderr = "";

      if (proc.stdout) {
        const rl = createInterface({ input: proc.stdout });
        rl.on("line", async (line) => {
          const msg = parseCursorMessage(line);
          if (!msg) return;

          if (onMessage) {
            try { await onMessage(msg); } catch { /* best-effort */ }
          }

          if (msg.type === "system" && "subtype" in msg && (msg as Record<string, unknown>).subtype === "init") {
            sessionId = (msg as Record<string, unknown>).session_id as string;
          }

          if (msg.type === "assistant") {
            numTurns++;
            const content = (msg as Record<string, unknown>).message as { content?: Array<{ type: string; text?: string }> } | undefined;
            if (content?.content) {
              for (const block of content.content) {
                if (block.type === "text" && block.text) text = block.text;
              }
            }
          }

          if (msg.type === "result") {
            const r = msg as unknown as { result?: string; is_error?: boolean; session_id?: string };
            if (r.result) text = r.result;
            if (r.is_error) isError = true;
            if (r.session_id) sessionId = r.session_id;
          }
        });
      }

      if (proc.stderr) {
        proc.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
      }

      proc.on("error", (err) => {
        reject(new Error(`Cursor agent failed to start: ${err.message}`));
      });

      proc.on("close", (code) => {
        const durationMs = Date.now() - start;
        if (code !== 0 && !text) {
          reject(new Error(
            `Cursor agent exited with code ${code}${stderr ? `: ${stderr.slice(0, 500)}` : ""}`,
          ));
          return;
        }
        resolve({
          text,
          ok: !isError,
          sessionId,
          costUsd: undefined,
          numTurns,
          durationMs,
        });
      });
    });

    return { proc, result };
  }

  async runQuery(opts: BackendQueryOpts): Promise<QueryResult> {
    const { result } = this.spawnAgent(opts, opts.onMessage);
    return result;
  }

  runSupervised(opts: BackendQueryOpts): SupervisedResult {
    const { proc, result } = this.spawnAgent(opts, opts.onMessage);
    const handle = makeHandle(
      "cursor",
      this.capabilities,
      async () => {
        if (!proc.killed) {
          proc.kill("SIGTERM");
          // Give it a moment, then force kill
          setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); }, 5000);
        }
      },
    );

    return { handle, result };
  }
}

// ── opencode Backend (CLI) ─────────────────────────────────────────────────────

/** opencode backend always uses the locally-hosted GLM5 model. */
const OPENCODE_MODEL = "glm5/zai-org/GLM-5-FP8";

/** Parse a line of opencode stream-json output into an SDKMessage-compatible shape.
 *  opencode --format json outputs NDJSON with types: error, assistant, result, etc. */
export function parseOpenCodeMessage(line: string): SDKMessage | null {
  try {
    const msg = JSON.parse(line);

    // error
    if (msg.type === "error") {
      const errMsg = msg.error?.data?.message ?? msg.error?.name ?? "Unknown error";
      return {
        type: "result",
        subtype: "error",
        is_error: true,
        result: errMsg,
        session_id: msg.sessionID ?? "",
        total_cost_usd: 0,
        num_turns: 0,
        duration_ms: 0,
      } as unknown as SDKMessage;
    }

    // text — final output text from opencode
    if (msg.type === "text" && msg.part?.text) {
      return {
        type: "assistant",
        message: {
          content: [{ type: "text", text: msg.part.text }],
        },
      } as unknown as SDKMessage;
    }

    // assistant text
    if (msg.type === "assistant" && msg.message?.content) {
      return msg as SDKMessage;
    }

    // result
    if (msg.type === "result") {
      return {
        type: "result",
        subtype: msg.subtype,
        duration_ms: msg.duration_ms ?? 0,
        is_error: msg.is_error ?? false,
        result: msg.result ?? "",
        session_id: msg.session_id ?? msg.sessionID ?? "",
        total_cost_usd: msg.total_cost_usd ?? 0,
        num_turns: msg.num_turns ?? 0,
      } as unknown as SDKMessage;
    }

    // tool_use — opencode format: part.tool + part.state.input
    if (msg.type === "tool_use") {
      const toolName = msg.part?.tool ?? msg.name ?? "tool";
      const input = msg.part?.state?.input as Record<string, unknown> | undefined;
      let detail = "";
      if (input) {
        if (input["command"]) {
          const cmd = String(input["command"]);
          detail = ` \`${cmd.length > 80 ? cmd.slice(0, 80) + "..." : cmd}\``;
        } else if (input["file_path"]) {
          detail = ` ${input["file_path"]}`;
        } else if (input["path"]) {
          detail = ` ${input["path"]}`;
        } else if (input["pattern"]) {
          detail = ` ${input["pattern"]}`;
        } else if (input["url"]) {
          detail = ` ${input["url"]}`;
        }
      }
      const summary = `${toolName}${detail}`;
      return { type: "tool_use_summary", summary } as unknown as SDKMessage;
    }

    return null;
  } catch {
    return null;
  }
}

class OpenCodeBackend implements AgentBackend {
  readonly name = "opencode" as const;
  readonly capabilities = capabilitySet("session_interrupt");

  private buildPrompt(opts: BackendQueryOpts): string {
    if (opts.systemPromptText) {
      return `<system_instructions>\n${opts.systemPromptText}\n</system_instructions>\n\n${opts.prompt}`;
    }
    return opts.prompt;
  }

  private buildArgs(opts: BackendQueryOpts): string[] {
    // opencode backend always uses GLM5, ignoring job-level model config
    const prompt = this.buildPrompt(opts);
    return [
      "run",
      "--format", "json",
      "--dir", opts.cwd,
      "--model", OPENCODE_MODEL,
      "--title", "fleet",
      prompt,
    ];
  }

  private spawnAgent(
    opts: BackendQueryOpts,
    onMessage?: (msg: SDKMessage) => void | Promise<void>,
  ): { proc: ChildProcess; result: Promise<QueryResult> } {
    const start = Date.now();
    const args = this.buildArgs(opts);
    const cwd = opts.cwd;

    console.log(`[opencode] Spawning: opencode ${args.slice(0, 6).join(" ")} ... (cwd=${cwd})`);

    const opencodeBin = process.env.OPENCODE_BIN || "/home/user/.opencode/bin/opencode";
    const proc = spawn(opencodeBin, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        OPENCODE_PERMISSION: '{"*":"allow"}',
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "gc.auto",
        GIT_CONFIG_VALUE_0: "0",
      },
    });

    const result = new Promise<QueryResult>((resolve, reject) => {
      let text = "";
      let sessionId: string | undefined;
      let numTurns = 0;
      let isError = false;
      let costUsd: number | undefined;
      let stderr = "";

      if (proc.stdout) {
        const rl = createInterface({ input: proc.stdout });
        rl.on("line", async (line) => {
          const msg = parseOpenCodeMessage(line);
          if (!msg) return;

          if (onMessage) {
            try { await onMessage(msg); } catch { /* best-effort */ }
          }

          if (msg.type === "result") {
            const r = msg as unknown as {
              result?: string;
              is_error?: boolean;
              session_id?: string;
              total_cost_usd?: number;
              num_turns?: number;
            };
            if (r.result) text = r.result;
            if (r.is_error) isError = true;
            if (r.session_id) sessionId = r.session_id;
            if (r.total_cost_usd !== undefined) costUsd = r.total_cost_usd;
            if (r.num_turns !== undefined) numTurns = r.num_turns;
          }

          if (msg.type === "assistant") {
            numTurns++;
            const content = (msg as Record<string, unknown>).message as { content?: Array<{ type: string; text?: string }> } | undefined;
            if (content?.content) {
              for (const block of content.content) {
                if (block.type === "text" && block.text) text = block.text;
              }
            }
          }
        });
      }

      if (proc.stderr) {
        proc.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
      }

      proc.on("error", (err) => {
        reject(new Error(`opencode failed to start: ${err.message}`));
      });

      proc.on("close", (code) => {
        const durationMs = Date.now() - start;
        if (code !== 0 && !text) {
          reject(new Error(
            `opencode exited with code ${code}${stderr ? `: ${stderr.slice(0, 500)}` : ""}`,
          ));
          return;
        }
        if ((costUsd === undefined || costUsd === 0) && sessionId) {
          const dbCost = getSessionCostFromDb(sessionId, "glm5/zai-org/GLM-5-FP8");
          if (dbCost !== null && dbCost > 0) {
            costUsd = dbCost;
          }
        }
        resolve({
          text,
          ok: !isError,
          sessionId,
          costUsd,
          numTurns,
          durationMs,
        });
      });
    });

    return { proc, result };
  }

  async runQuery(opts: BackendQueryOpts): Promise<QueryResult> {
    const { result } = this.spawnAgent(opts, opts.onMessage);
    return result;
  }

  runSupervised(opts: BackendQueryOpts): SupervisedResult {
    const { proc, result } = this.spawnAgent(opts, opts.onMessage);
    const handle = makeHandle(
      "opencode",
      this.capabilities,
      async () => {
        if (!proc.killed) {
          proc.kill("SIGTERM");
          setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); }, 5000);
        }
      },
    );

    return { handle, result };
  }
}

// ── Error helpers ────────────────────────────────────────────────────────────

/** Strict rate-limit check: matches known API rate-limit / usage-limit error patterns. */
export function isRateLimitError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return /rate.?limit|overloaded|usage.?limit|too many requests|429|quota|capacity/.test(msg);
}

/** Billing error check: matches Cursor billing issues (unpaid invoice, payment required). */
export function isBillingError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return /unpaid invoice|payment required|billing|subscription|insufficient credit/.test(msg);
}

export function backendSupportsCapabilities(
  backendName: BackendName,
  requiredCapabilities?: BackendCapability[],
): boolean {
  if (!requiredCapabilities || requiredCapabilities.length === 0) return true;
  const backend = getBackend(backendName);
  return requiredCapabilities.every((capability) => backend.capabilities.has(capability));
}

// ── Backend resolution ───────────────────────────────────────────────────────

/** Returns the configured default backend preference.
 *  Precedence: persisted preference > AGENT_BACKEND env var > "auto".
 *  Reads process.env at call time so .env loading in cli.ts takes effect. */
export function getDefaultBackend(): BackendPreference {
  const persisted = getBackendPreference();
  if (persisted) return persisted;
  return (process.env["AGENT_BACKEND"] as BackendPreference) ?? "auto";
}

const codexBackend = new CodexBackend();
const openaiBackend = new OpenAIBackend();
const claudeBackend = new ClaudeBackend();
const cursorBackend = new CursorBackend();
const opencodeBackend = new OpenCodeBackend();

/** Get the appropriate backend for the given preference.
 *  Auto mode is capability-aware: prefer codex and escalate to openai only
 *  when the caller needs capabilities codex does not provide. */
export function resolveBackend(
  preference?: BackendPreference,
  requiredCapabilities?: BackendCapability[],
): AgentBackend {
  const pref = preference ?? getDefaultBackend();
  switch (pref) {
    case "codex":
      return codexBackend;
    case "openai":
      return openaiBackend;
    case "claude":
      return claudeBackend;
    case "cursor":
      return cursorBackend;
    case "opencode":
      return opencodeBackend;
    case "auto":
      if (backendSupportsCapabilities("codex", requiredCapabilities)) return codexBackend;
      if (backendSupportsCapabilities("openai", requiredCapabilities)) return openaiBackend;
      return codexBackend;
  }
}

/** Get a specific backend by name (no fallback wrapping). */
export function getBackend(name: BackendName): AgentBackend {
  switch (name) {
    case "codex":
      return codexBackend;
    case "openai":
      return openaiBackend;
    case "claude":
      return claudeBackend;
    case "cursor":
      return cursorBackend;
    case "opencode":
      return opencodeBackend;
  }
}

/** Get the effective backend name for skill gating purposes. */
export function getEffectiveBackendName(
  preference?: BackendPreference,
  requiredCapabilities?: BackendCapability[],
): BackendName {
  return resolveBackend(preference, requiredCapabilities).name;
}
