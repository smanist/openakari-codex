/** Runtime adapter abstraction. Public configuration is model-driven; runtime routing remains internal. */

import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { QueryOpts, QueryResult, SDKMessage } from "./sdk.js";
import { computeEffectiveModel, DEFAULT_MODEL_BY_TIER } from "./model-tiers.js";

export type BackendCapability =
  | "interactive_input"
  | "session_interrupt"
  | "subagents"
  | "native_system_prompt";

export type BackendName = "codex" | "openai" | "opencode";
export type RuntimeHint = BackendName | "auto";

export interface ResolveBackendOpts {
  model?: string;
  requiredCapabilities?: BackendCapability[];
  routeHint?: RuntimeHint;
}

export interface UserInputMessage {
  content: string;
  sessionId?: string;
}

export interface SessionHandle {
  interrupt(): Promise<void>;
  streamInput?(input: AsyncIterable<UserInputMessage>): Promise<void>;
  readonly backend: BackendName;
  readonly capabilities: ReadonlySet<BackendCapability>;
  supportsCapability(capability: BackendCapability): boolean;
}

export interface BackendQueryOpts extends QueryOpts {
  systemPromptText?: string;
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

export const CODEX_DEFAULT_MODEL = DEFAULT_MODEL_BY_TIER.strong;
export const OPENCODE_MODEL = "glm5/zai-org/GLM-5-FP8";

export function resolveModelForBackend(
  backendName: BackendName,
  model?: string,
): string {
  if (backendName === "opencode") {
    const requested = model?.trim();
    return requested || OPENCODE_MODEL;
  }

  return computeEffectiveModel(model);
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

    if (type === "thread.started" && (parsed.thread_id || parsed.threadId || parsed.session_id || parsed.sessionId)) {
      return {
        type: "system",
        subtype: "init",
        session_id: String(parsed.thread_id ?? parsed.threadId ?? parsed.session_id ?? parsed.sessionId),
      };
    }

    const item = parsed.item as Record<string, unknown> | undefined;
    if (type === "item.completed" && item?.type === "agent_message" && typeof item?.text === "string") {
      return {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: item.text as string }] },
      };
    }

    if (type === "item.started" && item?.type === "command_execution" && typeof item?.command === "string") {
      const cmd = item.command as string;
      return { type: "tool_use_summary", summary: `Shell \`${cmd.length > 80 ? cmd.slice(0, 80) + "..." : cmd}\`` };
    }

    if (type === "item.completed" && item?.type === "command_execution") {
      return { type: "tool_call_completed" };
    }

    const message = parsed.message as { role?: unknown; content?: unknown } | undefined;
    if (type === "assistant" && Array.isArray(message?.content)) {
      return {
        type: "assistant",
        message: {
          role: typeof message.role === "string" ? message.role : undefined,
          content: message.content as Array<Record<string, unknown>>,
        },
      };
    }

    if (type === "system" && parsed.subtype === "init") {
      return {
        type: "system",
        subtype: "init",
        session_id: String(parsed.session_id ?? parsed.sessionId ?? parsed.id ?? ""),
      };
    }

    if (type === "result") {
      return {
        type: "result",
        subtype: typeof parsed.subtype === "string" ? parsed.subtype : "success",
        duration_ms: typeof parsed.duration_ms === "number" ? parsed.duration_ms : Number(parsed.durationMs ?? 0),
        is_error: parsed.is_error === true,
        result: typeof parsed.result === "string" ? parsed.result : String(parsed.output_text ?? ""),
        session_id: String(parsed.session_id ?? parsed.sessionId ?? parsed.id ?? ""),
        total_cost_usd: typeof parsed.total_cost_usd === "number" ? parsed.total_cost_usd : 0,
        num_turns: typeof parsed.num_turns === "number" ? parsed.num_turns : 0,
      };
    }

    if (type === "tool_use" || type === "tool_call") {
      const tool = parsed.tool as Record<string, unknown> | undefined;
      const part = parsed.part as Record<string, unknown> | undefined;
      const partState = (part?.state as Record<string, unknown> | undefined)?.input as Record<string, unknown> | undefined;
      const toolName = String(parsed.name ?? parsed.tool_name ?? tool?.name ?? part?.tool ?? "tool");
      const input = (parsed.input ?? parsed.args ?? partState ?? {}) as Record<string, unknown>;
      let detail = "";
      if (input.command) detail = ` ${String(input.command)}`;
      else if (input.file_path) detail = ` ${String(input.file_path)}`;
      else if (input.path) detail = ` ${String(input.path)}`;
      else if (input.pattern) detail = ` ${String(input.pattern)}`;
      return { type: "tool_use_summary", summary: `${toolName}${detail}` };
    }

    if (type === "tool_call_completed" || (type === "tool_call" && parsed.subtype === "completed")) {
      return { type: "tool_call_completed" };
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
    const threadId = msg.thread_id ?? msg.threadId ?? msg.session_id ?? msg.sessionId;
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
      const suffix = exitCode != null && exitCode !== 0 && !body ? `\n(exit_code: ${exitCode})` : "";
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
    }
  }
  if (type === "result") {
    if (typeof msg.result === "string" && msg.result) state.reportedText = msg.result;
    if (typeof msg.output_text === "string" && msg.output_text) state.reportedText = msg.output_text;
    if (msg.is_error === true) state.isError = true;
    if (typeof msg.session_id === "string" && msg.session_id) state.sessionId = msg.session_id;
    if (typeof msg.sessionId === "string" && msg.sessionId) state.sessionId = msg.sessionId;
    if (typeof msg.num_turns === "number" && msg.num_turns > 0) state.reportedTurns = msg.num_turns;
  }
}

export function finalizeCodexExecJsonState(state: CodexExecJsonState): { text: string; numTurns: number; sessionId?: string; ok: boolean } {
  const text = (state.reportedText ?? state.assistantText).trim();
  const finalText = text || state.toolFallbackText.trim();
  const numTurns = state.reportedTurns && state.reportedTurns > 0
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
    return [
      "exec",
      "--json",
      "-C", opts.cwd,
      "--dangerously-bypass-approvals-and-sandbox",
      "-m", model,
      prompt,
    ];
  }

  protected buildResumeArgs(sessionId: string, prompt: string, opts: BackendQueryOpts): string[] {
    const model = resolveModelForBackend(this.name, opts.model);
    return [
      "exec",
      "resume",
      "--json",
      "-C", opts.cwd,
      "--dangerously-bypass-approvals-and-sandbox",
      "-m", model,
      sessionId,
      prompt,
    ];
  }

  protected spawnCodex(
    args: string[],
    opts: BackendQueryOpts,
    onMessage?: (msg: SDKMessage) => void | Promise<void>,
  ): { proc: ChildProcess; result: Promise<QueryResult>; getSessionId: () => string | undefined } {
    const start = Date.now();
    const cwd = opts.cwd;
    const codexBin = process.env["CODEX_BIN"] || "codex";
    const proc = spawn(codexBin, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...(opts.extraEnv ?? {}) },
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
            try { await onMessage(msg); } catch { /* best effort */ }
          }
        });
      }

      if (proc.stderr) {
        proc.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
      }

      proc.on("error", (err) => reject(new Error(`${this.name} failed to start: ${err.message}`)));
      proc.on("close", (code) => {
        const durationMs = Date.now() - start;
        const finalized = finalizeCodexExecJsonState(streamState);
        const finalText = finalized.text || stderr.trim();
        if (code !== 0 && !finalText) {
          reject(new Error(`${this.name} exited with code ${code}${stderr ? `: ${stderr.slice(0, 500)}` : ""}`));
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
    return this.spawnCodex(this.buildExecArgs(opts), opts, opts.onMessage).result;
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

    return {
      handle: makeHandle(
        this.name,
        this.capabilities,
        async () => {
          if (!proc.killed) {
            proc.kill("SIGTERM");
            setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); }, 5000);
          }
        },
        streamInput,
      ),
      result,
    };
  }
}

class CodexBackend extends BaseCodexBackend {
  readonly name = "codex" as const;
  readonly capabilities = capabilitySet("session_interrupt", "subagents");
}

class OpenAIBackend extends BaseCodexBackend {
  readonly name = "openai" as const;
  readonly capabilities = capabilitySet("interactive_input", "session_interrupt", "subagents", "native_system_prompt");
}

export function parseOpenCodeMessage(line: string): SDKMessage | null {
  try {
    const msg = JSON.parse(line);
    if (msg.type === "error") {
      const errMsg = msg.error?.data?.message ?? msg.error?.name ?? "Unknown error";
      return { type: "result", subtype: "error", is_error: true, result: errMsg, session_id: msg.sessionID ?? "", total_cost_usd: 0, num_turns: 0, duration_ms: 0 };
    }
    if (msg.type === "text" && msg.part?.text) {
      return { type: "assistant", message: { content: [{ type: "text", text: msg.part.text }] } };
    }
    if (msg.type === "assistant" && msg.message?.content) {
      return msg as SDKMessage;
    }
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
      };
    }
    if (msg.type === "tool_use") {
      const toolName = msg.part?.tool ?? msg.name ?? "tool";
      const input = msg.part?.state?.input as Record<string, unknown> | undefined;
      let detail = "";
      if (input?.command) detail = ` ${String(input.command)}`;
      else if (input?.file_path) detail = ` ${String(input.file_path)}`;
      else if (input?.path) detail = ` ${String(input.path)}`;
      else if (input?.pattern) detail = ` ${String(input.pattern)}`;
      else if (input?.url) detail = ` ${String(input.url)}`;
      return { type: "tool_use_summary", summary: `${toolName}${detail}` };
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
    const proc = spawn(process.env.OPENCODE_BIN || "/home/user/.opencode/bin/opencode", args, {
      cwd: opts.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        ...(opts.extraEnv ?? {}),
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
            try { await onMessage(msg); } catch { /* best effort */ }
          }

          if (msg.type === "result") {
            const resultMsg = msg as Extract<SDKMessage, { type: "result" }>;
            if (resultMsg.result) text = resultMsg.result;
            if (resultMsg.is_error) isError = true;
            if (resultMsg.session_id) sessionId = resultMsg.session_id;
            if (typeof resultMsg.total_cost_usd === "number") costUsd = resultMsg.total_cost_usd;
            if (typeof resultMsg.num_turns === "number") numTurns = resultMsg.num_turns;
          }

          if (msg.type === "assistant") {
            numTurns++;
            const content = msg.message?.content;
            if (content) {
              for (const block of content) {
                if ((block as { type?: string }).type === "text" && typeof (block as { text?: unknown }).text === "string") {
                  text = (block as { text: string }).text;
                }
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

      proc.on("error", (err) => reject(new Error(`opencode failed to start: ${err.message}`)));
      proc.on("close", (code) => {
        const durationMs = Date.now() - start;
        if (code !== 0 && !text) {
          reject(new Error(`opencode exited with code ${code}${stderr ? `: ${stderr.slice(0, 500)}` : ""}`));
          return;
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
    return this.spawnAgent(opts, opts.onMessage).result;
  }

  runSupervised(opts: BackendQueryOpts): SupervisedResult {
    const { proc, result } = this.spawnAgent(opts, opts.onMessage);
    return {
      handle: makeHandle(
        "opencode",
        this.capabilities,
        async () => {
          if (!proc.killed) {
            proc.kill("SIGTERM");
            setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); }, 5000);
          }
        },
      ),
      result,
    };
  }
}

export function isRateLimitError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return /rate.?limit|overloaded|usage.?limit|too many requests|429|quota|capacity/.test(msg);
}

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

const codexBackend = new CodexBackend();
const openaiBackend = new OpenAIBackend();
const opencodeBackend = new OpenCodeBackend();

function runtimeHintForModel(model?: string): RuntimeHint {
  const normalized = model?.trim().toLowerCase();
  if (!normalized) return "auto";
  if (normalized.includes("glm5") || normalized.includes("glm-5") || normalized.includes("zai-org/glm")) {
    return "opencode";
  }
  return "auto";
}

export function resolveBackend(opts: ResolveBackendOpts = {}): AgentBackend {
  const hint = opts.routeHint && opts.routeHint !== "auto" ? opts.routeHint : runtimeHintForModel(opts.model);
  switch (hint) {
    case "codex":
      return codexBackend;
    case "openai":
      return openaiBackend;
    case "opencode":
      return opencodeBackend;
    case "auto":
    default:
      if (runtimeHintForModel(opts.model) === "opencode") return opencodeBackend;
      if (backendSupportsCapabilities("codex", opts.requiredCapabilities)) return codexBackend;
      if (backendSupportsCapabilities("openai", opts.requiredCapabilities)) return openaiBackend;
      return codexBackend;
  }
}

export function getBackend(name: BackendName): AgentBackend {
  switch (name) {
    case "codex":
      return codexBackend;
    case "openai":
      return openaiBackend;
    case "opencode":
      return opencodeBackend;
  }
}

export function getEffectiveBackendName(opts: ResolveBackendOpts = {}): BackendName {
  return resolveBackend(opts).name;
}
