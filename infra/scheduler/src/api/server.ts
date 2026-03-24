import http from "node:http";
import crypto from "node:crypto";
import { URL } from "node:url";

import type { UnifiedStatus } from "../status.js";
import type { PushRequest, PushResult } from "../push-queue.js";
import { PushQueue } from "../push-queue.js";

export type EnqueueResponse = {
  sessionId: string;
  position: number;
};

export type StatusResponse = {
  status: "queued" | "in-progress" | "completed" | "failed";
  result?: {
    status: string;
    branch?: string;
    error?: string;
  };
  error?: string;
};

export type ApiServerOpts = {
  repoDir: string;
  getStatus: () => Promise<UnifiedStatus>;
  pushQueue: PushQueue;
  executePush: (req: PushRequest) => Promise<PushResult>;
  host?: string;
  port?: number;
};

export type EnqueueRequestBody = {
  sessionId: string;
  cwd: string;
  priority: "opus" | "fleet";
};

export type TaskClaim = {
  claimId: string;
  taskId: string;
  taskText: string;
  project: string;
  agentId: string;
  claimedAt: number;
  expiresAt: number;
};

export type ClaimTaskRequestBody = {
  taskText: string;
  project: string;
  agentId: string;
  ttlMs?: number;
};

export type ReleaseTaskRequestBody = {
  claimId?: string;
  agentId?: string;
};

let server: http.Server | null = null;
let listeningPort: number | null = null;

function sendJson(res: http.ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const limitBytes = 1_000_000;
  let total = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buf.length;
    if (total > limitBytes) throw new Error("request too large");
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return {};
  return JSON.parse(raw);
}

export function parseEnqueueRequest(body: unknown): EnqueueRequestBody {
  const b = body as { sessionId?: unknown; cwd?: unknown; priority?: unknown };
  return {
    sessionId: typeof b.sessionId === "string" ? b.sessionId : "",
    cwd: typeof b.cwd === "string" ? b.cwd : "",
    priority: b.priority === "opus" ? "opus" : "fleet",
  };
}

function parseClaimTaskRequest(body: unknown): ClaimTaskRequestBody {
  const b = body as { taskText?: unknown; project?: unknown; agentId?: unknown; ttlMs?: unknown };
  return {
    taskText: typeof b.taskText === "string" ? b.taskText : "",
    project: typeof b.project === "string" ? b.project : "",
    agentId: typeof b.agentId === "string" ? b.agentId : "",
    ttlMs: typeof b.ttlMs === "number" && Number.isFinite(b.ttlMs) ? b.ttlMs : undefined,
  };
}

function parseReleaseTaskRequest(body: unknown): ReleaseTaskRequestBody {
  const b = body as { claimId?: unknown; agentId?: unknown };
  return {
    claimId: typeof b.claimId === "string" ? b.claimId : undefined,
    agentId: typeof b.agentId === "string" ? b.agentId : undefined,
  };
}

function createTaskId(project: string, taskText: string): string {
  const hash = crypto.createHash("sha1").update(`${project}\n${taskText}`).digest("hex");
  return hash.slice(0, 12);
}

function createClaimId(): string {
  return crypto.randomBytes(8).toString("hex");
}

export class TaskClaimStore {
  private claimsByTaskId = new Map<string, TaskClaim>();
  private taskIdByClaimId = new Map<string, string>();

  private pruneExpired(nowMs: number): void {
    for (const [taskId, claim] of this.claimsByTaskId) {
      if (claim.expiresAt <= nowMs) {
        this.claimsByTaskId.delete(taskId);
        this.taskIdByClaimId.delete(claim.claimId);
      }
    }
  }

  claim(req: ClaimTaskRequestBody, nowMs: number): { ok: true; claim: TaskClaim } | { ok: false; status: 409; claimedBy: string; expiresAt: number } {
    this.pruneExpired(nowMs);
    const ttlMs = req.ttlMs ?? 2_700_000;
    const taskId = createTaskId(req.project, req.taskText);
    const existing = this.claimsByTaskId.get(taskId);
    if (existing) {
      return { ok: false, status: 409, claimedBy: existing.agentId, expiresAt: existing.expiresAt };
    }

    const claim: TaskClaim = {
      claimId: createClaimId(),
      taskId,
      taskText: req.taskText,
      project: req.project,
      agentId: req.agentId,
      claimedAt: nowMs,
      expiresAt: nowMs + ttlMs,
    };

    this.claimsByTaskId.set(taskId, claim);
    this.taskIdByClaimId.set(claim.claimId, taskId);
    return { ok: true, claim };
  }

  list(nowMs: number, project?: string): TaskClaim[] {
    this.pruneExpired(nowMs);
    const claims = Array.from(this.claimsByTaskId.values());
    return project ? claims.filter((c) => c.project === project) : claims;
  }

  release(nowMs: number, body: ReleaseTaskRequestBody): { ok: true; released?: number } | { ok: false; status: 400 | 404; error: string } {
    this.pruneExpired(nowMs);

    if (body.claimId) {
      const taskId = this.taskIdByClaimId.get(body.claimId);
      if (!taskId) return { ok: false, status: 404, error: "claim not found" };
      const claim = this.claimsByTaskId.get(taskId);
      if (claim) this.claimsByTaskId.delete(taskId);
      this.taskIdByClaimId.delete(body.claimId);
      return { ok: true };
    }

    if (body.agentId) {
      let released = 0;
      for (const claim of this.claimsByTaskId.values()) {
        if (claim.agentId === body.agentId) {
          this.claimsByTaskId.delete(claim.taskId);
          this.taskIdByClaimId.delete(claim.claimId);
          released += 1;
        }
      }
      return { ok: true, released };
    }

    return { ok: false, status: 400, error: "Provide claimId or agentId" };
  }
}

const taskClaims = new TaskClaimStore();

export async function startApiServer(opts: ApiServerOpts): Promise<number> {
  if (server && listeningPort != null) return listeningPort;

  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? 8420;

  server = http.createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const path = url.pathname;

      if (method === "GET" && path === "/api/status") {
        const status = await opts.getStatus();
        return sendJson(res, 200, status);
      }

      if (method === "POST" && path === "/api/tasks/claim") {
        let body: unknown;
        try {
          body = await readJson(req);
        } catch (err) {
          return sendJson(res, 400, { ok: false, error: err instanceof Error ? err.message : String(err) });
        }
        const parsed = parseClaimTaskRequest(body);
        if (!parsed.taskText || !parsed.project || !parsed.agentId) {
          return sendJson(res, 400, { ok: false, error: "taskText, project, and agentId required" });
        }

        const result = taskClaims.claim(parsed, Date.now());
        if (!result.ok) {
          return sendJson(res, 409, {
            ok: false,
            error: "Task already claimed",
            claimedBy: result.claimedBy,
            expiresAt: result.expiresAt,
          });
        }
        return sendJson(res, 200, { ok: true, claim: result.claim });
      }

      if (method === "POST" && path === "/api/tasks/release") {
        let body: unknown;
        try {
          body = await readJson(req);
        } catch (err) {
          return sendJson(res, 400, { ok: false, error: err instanceof Error ? err.message : String(err) });
        }
        const parsed = parseReleaseTaskRequest(body);
        const result = taskClaims.release(Date.now(), parsed);
        if (!result.ok) return sendJson(res, result.status, { ok: false, error: result.error });
        if (typeof result.released === "number") return sendJson(res, 200, { ok: true, released: result.released });
        return sendJson(res, 200, { ok: true });
      }

      if (method === "GET" && path === "/api/tasks/claims") {
        const project = url.searchParams.get("project") ?? undefined;
        const claims = taskClaims.list(Date.now(), project);
        return sendJson(res, 200, { claims });
      }

      if (method === "POST" && path === "/api/push/enqueue") {
        const body = await readJson(req);
        const { sessionId, cwd, priority } = parseEnqueueRequest(body);

        if (!sessionId || !cwd) {
          return sendJson(res, 400, { error: "sessionId and cwd required" });
        }

        const enq = opts.pushQueue.enqueue({ sessionId, cwd, priority });
        void opts.pushQueue.processQueue(opts.executePush).catch((err) => {
          console.error("[api] push queue processing error:", err);
        });

        const response: EnqueueResponse = { sessionId, position: enq.position };
        return sendJson(res, 200, response);
      }

      if (method === "GET" && path.startsWith("/api/push/status/")) {
        const sessionId = decodeURIComponent(path.slice("/api/push/status/".length));
        if (!sessionId) return sendJson(res, 400, { error: "sessionId required" });

        const result = opts.pushQueue.getResult(sessionId);
        if (result) {
          const response: StatusResponse = {
            status: "completed",
            result: {
              status: result.status,
              branch: result.branch,
              error: result.error,
            },
          };
          return sendJson(res, 200, response);
        }

        if (opts.pushQueue.getProcessingSessionId() === sessionId) {
          const response: StatusResponse = { status: "in-progress" };
          return sendJson(res, 200, response);
        }

        const queued = opts.pushQueue.getQueueSnapshot().some((r) => r.sessionId === sessionId);
        if (queued) {
          const response: StatusResponse = { status: "queued" };
          return sendJson(res, 200, response);
        }

        const response: StatusResponse = { status: "failed", error: "not found" };
        return sendJson(res, 200, response);
      }

      return sendJson(res, 404, { error: "not found" });
    } catch (err) {
      return sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(port, host, () => resolve());
  });

  const addr = server.address();
  if (addr && typeof addr === "object") {
    listeningPort = addr.port;
  } else {
    listeningPort = port;
  }

  console.log(`[api] Control API listening on http://${host}:${listeningPort}`);
  return listeningPort;
}

export async function stopApiServer(): Promise<void> {
  if (!server) return;
  const s = server;
  server = null;
  listeningPort = null;
  await new Promise<void>((resolve) => s.close(() => resolve()));
}
