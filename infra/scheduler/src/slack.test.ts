import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AgentResult, SpawnAgentOpts } from "./agent.js";
import type { ExecutionResult } from "./executor.js";
import type { Job } from "./types.js";

const mocked = vi.hoisted(() => ({
  instances: [] as any[],
  messageHandlers: [] as Array<(args: any) => Promise<void>>,
  startMock: vi.fn(),
  stopMock: vi.fn(),
  openMock: vi.fn(),
  postMessageMock: vi.fn(),
  repliesMock: vi.fn(),
  usersInfoMock: vi.fn(),
  client: null as any,
  spawnCalls: [] as SpawnAgentOpts[],
  spawnMock: vi.fn(),
}));

vi.mock("@slack/bolt", () => {
  class MockApp {
    client = mocked.client;

    constructor(_opts: unknown) {
      mocked.instances.push(this);
      this.client = mocked.client;
    }

    message(handler: (args: any) => Promise<void>): void {
      mocked.messageHandlers.push(handler);
    }

    async start(): Promise<void> {
      await mocked.startMock();
    }

    async stop(): Promise<void> {
      await mocked.stopMock();
    }
  }

  return {
    App: MockApp,
    LogLevel: { WARN: "warn" },
  };
});

vi.mock("./agent.js", async () => {
  const actual = await vi.importActual<typeof import("./agent.js")>("./agent.js");
  return {
    ...actual,
    spawnAgent: vi.fn().mockImplementation((opts: SpawnAgentOpts) => {
      mocked.spawnCalls.push(opts);
      return mocked.spawnMock(opts);
    }),
  };
});

function makeJob(): Job {
  return {
    id: "job-1",
    name: "test-job",
    enabled: true,
    createdAtMs: Date.now(),
    schedule: { kind: "every", everyMs: 60_000 },
    payload: {
      message: "Run test session",
      cwd: "/tmp/repo",
    },
    state: {
      nextRunAtMs: null,
      lastRunAtMs: null,
      lastStatus: null,
      lastError: null,
      lastDurationMs: null,
      runCount: 0,
    },
  };
}

function makeResult(): ExecutionResult {
  return {
    ok: true,
    durationMs: 1000,
    exitCode: 0,
    stdout: "ok",
    runtime: "codex_cli",
    sessionId: "session-1",
    costUsd: 0.1234,
    numTurns: 4,
  };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function loadSlackModule() {
  return import("./slack.js");
}

async function deliverDm(
  handler: (args: any) => Promise<void>,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await handler({
    message: {
      channel: "D123",
      channel_type: "im",
      ts: "1710000000.000100",
      text: "Please check the repo",
      user: "U123",
      ...overrides,
    },
    client: mocked.client,
  });
}

describe("scheduler Slack DM runtime", () => {
  const envBackup = {
    botToken: process.env["SLACK_BOT_TOKEN"],
    appToken: process.env["SLACK_APP_TOKEN"],
    userId: process.env["SLACK_USER_ID"],
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocked.instances = [];
    mocked.messageHandlers = [];
    mocked.spawnCalls = [];
    mocked.client = {
      chat: {
        postMessage: mocked.postMessageMock,
      },
      conversations: {
        open: mocked.openMock,
        replies: mocked.repliesMock,
      },
      users: {
        info: mocked.usersInfoMock,
      },
    };
    mocked.openMock.mockResolvedValue({ channel: { id: "D123" } });
    mocked.postMessageMock.mockResolvedValue({ ts: "1710000000.000999" });
    mocked.repliesMock.mockResolvedValue({ messages: [] });
    mocked.usersInfoMock.mockResolvedValue({
      user: {
        profile: { display_name: "Operator" },
        real_name: "Akari Operator",
        name: "operator",
      },
    });
    mocked.spawnMock.mockImplementation((opts: SpawnAgentOpts) => {
      const progress = opts.onMessage?.({
        type: "assistant",
        message: {
          content: [{ type: "text", text: "Slack reply" }],
        },
      } as any);

      const agentResult: AgentResult = {
        text: "Slack reply",
        costUsd: 0.05,
        numTurns: 2,
        durationMs: 1000,
        timedOut: false,
      };
      return {
        result: Promise.resolve(progress).then(() => agentResult),
      };
    });

    process.env["SLACK_BOT_TOKEN"] = "xoxb-test";
    process.env["SLACK_APP_TOKEN"] = "xapp-test";
    process.env["SLACK_USER_ID"] = "U123";
  });

  afterEach(() => {
    if (envBackup.botToken === undefined) delete process.env["SLACK_BOT_TOKEN"];
    else process.env["SLACK_BOT_TOKEN"] = envBackup.botToken;

    if (envBackup.appToken === undefined) delete process.env["SLACK_APP_TOKEN"];
    else process.env["SLACK_APP_TOKEN"] = envBackup.appToken;

    if (envBackup.userId === undefined) delete process.env["SLACK_USER_ID"];
    else process.env["SLACK_USER_ID"] = envBackup.userId;
  });

  it("reports unconfigured when required env vars are missing", async () => {
    delete process.env["SLACK_BOT_TOKEN"];
    const slack = await loadSlackModule();

    expect(slack.isConfigured()).toBe(false);
  });

  it("startSlackBot is a no-op when unconfigured", async () => {
    delete process.env["SLACK_BOT_TOKEN"];
    const slack = await loadSlackModule();

    await slack.startSlackBot({ repoDir: "/tmp/repo" });

    expect(mocked.instances).toHaveLength(0);
    expect(mocked.startMock).not.toHaveBeenCalled();
  });

  it("supports repeated start and stop calls safely", async () => {
    const slack = await loadSlackModule();

    await slack.startSlackBot({ repoDir: "/tmp/repo" });
    await slack.startSlackBot({ repoDir: "/tmp/repo" });
    await slack.stopSlackBot();
    await slack.stopSlackBot();

    expect(mocked.startMock).toHaveBeenCalledTimes(1);
    expect(mocked.stopMock).toHaveBeenCalledTimes(1);
  });

  it("opens and caches the designated DM channel for outbound messages", async () => {
    const slack = await loadSlackModule();

    const first = await slack.dm("hello");
    const second = await slack.dm("again");

    expect(first).toBe("1710000000.000999");
    expect(second).toBe("1710000000.000999");
    expect(mocked.openMock).toHaveBeenCalledTimes(1);
    expect(mocked.postMessageMock).toHaveBeenCalledTimes(2);
  });

  it("returns thread info from notifySessionStarted and posts completions into that thread", async () => {
    const slack = await loadSlackModule();

    const threadInfo = await slack.notifySessionStarted("test-job", "run-123");
    await slack.notifySessionComplete(makeJob(), makeResult(), [], threadInfo?.threadTs);

    expect(threadInfo).toEqual({ channel: "D123", threadTs: "1710000000.000999" });
    expect(mocked.postMessageMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        channel: "D123",
        thread_ts: "1710000000.000999",
      }),
    );
  });

  it("ignores DMs from users other than the designated operator", async () => {
    const slack = await loadSlackModule();
    await slack.startSlackBot({ repoDir: "/tmp/repo" });

    await deliverDm(mocked.messageHandlers[0]!, { user: "U999" });
    await flush();

    expect(mocked.spawnCalls).toHaveLength(0);
    expect(mocked.postMessageMock).not.toHaveBeenCalled();
  });

  it("ignores subtype and non-DM messages", async () => {
    const slack = await loadSlackModule();
    await slack.startSlackBot({ repoDir: "/tmp/repo" });

    await deliverDm(mocked.messageHandlers[0]!, { subtype: "bot_message" });
    await deliverDm(mocked.messageHandlers[0]!, { channel_type: "channel" });
    await flush();

    expect(mocked.spawnCalls).toHaveLength(0);
  });

  it("spawns a chat agent for designated-user DMs and posts streamed plain-text output", async () => {
    const slack = await loadSlackModule();
    await slack.startSlackBot({ repoDir: "/tmp/repo" });

    await deliverDm(mocked.messageHandlers[0]!);
    await flush();

    expect(mocked.spawnCalls).toHaveLength(1);
    expect(mocked.spawnCalls[0]!.cwd).toBe("/tmp/repo");
    expect(mocked.postMessageMock).toHaveBeenCalledTimes(1);
    expect(mocked.postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "D123",
        thread_ts: "1710000000.000100",
        text: "Slack reply",
      }),
    );
  });

  it("includes existing thread history in the spawned prompt for thread replies", async () => {
    mocked.repliesMock.mockResolvedValue({
      messages: [
        { ts: "1710000000.000100", text: "Earlier question", user: "U123" },
        { ts: "1710000001.000100", text: "Earlier answer", bot_id: "B999" },
        { ts: "1710000002.000100", text: "Newest reply", user: "U123" },
      ],
    });

    const slack = await loadSlackModule();
    await slack.startSlackBot({ repoDir: "/tmp/repo" });

    await deliverDm(mocked.messageHandlers[0]!, {
      text: "Newest reply",
      ts: "1710000002.000100",
      thread_ts: "1710000000.000100",
    });
    await flush();

    expect(mocked.spawnCalls).toHaveLength(1);
    expect(mocked.spawnCalls[0]!.prompt).toContain("Existing Slack Thread");
    expect(mocked.spawnCalls[0]!.prompt).toContain("Earlier question");
    expect(mocked.spawnCalls[0]!.prompt).toContain("Earlier answer");
  });

  it("posts a single in-thread error when the inbound DM handler fails", async () => {
    mocked.spawnMock.mockImplementation(() => {
      throw new Error("boom");
    });

    const slack = await loadSlackModule();
    await slack.startSlackBot({ repoDir: "/tmp/repo" });

    await deliverDm(mocked.messageHandlers[0]!);
    await flush();

    expect(mocked.postMessageMock).toHaveBeenCalledTimes(1);
    expect(mocked.postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "D123",
        thread_ts: "1710000000.000100",
        text: expect.stringContaining("Slack DM handler failed: boom"),
      }),
    );
  });

  it("keeps compatibility shims non-throwing", async () => {
    const slack = await loadSlackModule();

    await expect(slack.dmBlocks([{ type: "section" }], "fallback")).resolves.toBeUndefined();
    await expect(slack.notifyBudgetBlocked("test-job", "budget exhausted")).resolves.toBeUndefined();
    await expect(slack.notifyEvolution("scheduler self-evolution")).resolves.toBeUndefined();
    await expect(slack.handleAkariCommand({ text: "/akari help" })).resolves.toEqual({
      ok: false,
      response: "Slash commands are not available in the DM-only Slack MVP.",
    });
    expect(() => slack.setPersistenceDir("/tmp/akari")).not.toThrow();
  });
});
