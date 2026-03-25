/** Tests for security guards: command validation and blocked executables. */

import { describe, it, expect } from "vitest";
import { validateCommand, validateShellCommand, SecurityError, checkMessageForPm2Violation } from "./security.js";

describe("validateCommand", () => {
  it("blocks aws CLI", () => {
    expect(() => validateCommand(["aws", "s3", "ls"])).toThrow(SecurityError);
    expect(() => validateCommand(["aws", "ec2", "describe-instances"])).toThrow(SecurityError);
    expect(() => validateCommand(["aws", "iam", "list-users"])).toThrow(SecurityError);
  });

  it("blocks aws via absolute path", () => {
    expect(() => validateCommand(["/usr/local/bin/aws", "s3", "cp", "file", "s3://bucket/"])).toThrow(SecurityError);
  });

  it("blocks sudo", () => {
    expect(() => validateCommand(["sudo", "ls"])).toThrow(SecurityError);
  });

  it("blocks rm", () => {
    expect(() => validateCommand(["rm", "-rf", "/"])).toThrow(SecurityError);
  });

  it("blocks docker", () => {
    expect(() => validateCommand(["docker", "run", "ubuntu"])).toThrow(SecurityError);
  });

  it("allows safe commands", () => {
    expect(() => validateCommand(["ls", "-la"])).not.toThrow();
    expect(() => validateCommand(["cat", "file.txt"])).not.toThrow();
    expect(() => validateCommand(["python3", "script.py"])).not.toThrow();
    expect(() => validateCommand(["git", "status"])).not.toThrow();
    expect(() => validateCommand(["journalctl", "-u", "akari", "--no-pager", "-n", "50"])).not.toThrow();
  });

  it("allows codex commands", () => {
    expect(() => validateCommand(["codex", "--help"])).not.toThrow();
    expect(() => validateCommand(["codex", "exec", "--json"])).not.toThrow();
  });

  it("rejects empty command", () => {
    expect(() => validateCommand([])).toThrow(SecurityError);
  });
});

describe("validateShellCommand", () => {
  it("blocks aws in shell commands", () => {
    expect(() => validateShellCommand("aws s3 ls")).toThrow(SecurityError);
    expect(() => validateShellCommand("aws configure")).toThrow(SecurityError);
    expect(() => validateShellCommand("aws sts get-caller-identity")).toThrow(SecurityError);
  });

  it("blocks aws in pipelines and chains", () => {
    expect(() => validateShellCommand("echo hello && aws s3 ls")).toThrow(SecurityError);
    expect(() => validateShellCommand("aws s3 ls | grep bucket")).toThrow(SecurityError);
    expect(() => validateShellCommand("echo test; aws ec2 describe-instances")).toThrow(SecurityError);
  });

  it("blocks aws via wrapper", () => {
    expect(() => validateShellCommand("env aws s3 ls")).toThrow(SecurityError);
  });

  it("blocks other dangerous commands in shell strings", () => {
    expect(() => validateShellCommand("sudo apt update")).toThrow(SecurityError);
    expect(() => validateShellCommand("rm -rf /")).toThrow(SecurityError);
  });

  it("allows safe shell commands", () => {
    expect(() => validateShellCommand("ls -la")).not.toThrow();
    expect(() => validateShellCommand("git status && git diff")).not.toThrow();
    expect(() => validateShellCommand("python3 script.py")).not.toThrow();
    expect(() => validateShellCommand("journalctl -u akari --no-pager -n 50")).not.toThrow();
  });

  it("allows codex shell commands", () => {
    expect(() => validateShellCommand("codex --help")).not.toThrow();
    expect(() => validateShellCommand("codex exec --json 'prompt'")).not.toThrow();
  });

  it("rejects empty shell command", () => {
    expect(() => validateShellCommand("")).toThrow(SecurityError);
    expect(() => validateShellCommand("   ")).toThrow(SecurityError);
  });

  it("blocks pm2 stop akari (self-termination)", () => {
    expect(() => validateShellCommand("pm2 stop akari")).toThrow(SecurityError);
    expect(() => validateShellCommand("pm2 stop akari ")).toThrow(SecurityError);
    expect(() => validateShellCommand("pm2  stop  akari")).toThrow(SecurityError);
  });

  it("blocks pm2 stop all", () => {
    expect(() => validateShellCommand("pm2 stop all")).toThrow(SecurityError);
    expect(() => validateShellCommand("pm2 stop --id 0")).toThrow(SecurityError);
  });

  it("blocks pm2 delete akari and delete all", () => {
    expect(() => validateShellCommand("pm2 delete akari")).toThrow(SecurityError);
    expect(() => validateShellCommand("pm2 delete all")).toThrow(SecurityError);
  });

  it("allows safe pm2 commands", () => {
    expect(() => validateShellCommand("pm2 list")).not.toThrow();
    expect(() => validateShellCommand("pm2 logs")).not.toThrow();
    expect(() => validateShellCommand("pm2 monit")).not.toThrow();
    expect(() => validateShellCommand("pm2 restart akari")).not.toThrow();
    expect(() => validateShellCommand("pm2 show akari")).not.toThrow();
  });

  it("includes helpful error message for pm2 stop", () => {
    expect(() => validateShellCommand("pm2 stop akari")).toThrow(/use \/api\/restart instead/i);
  });
});

describe("checkMessageForPm2Violation", () => {
  const makeMessage = (toolName: string, command: string) => ({
    type: "assistant",
    message: {
      content: [
        { type: "tool_use", name: toolName, input: { command } },
      ],
    },
  });

  it("detects pm2 stop akari in Bash tool", () => {
    const violation = checkMessageForPm2Violation(makeMessage("Bash", "pm2 stop akari"));
    expect(violation).toBe("pm2 stop akari");
  });

  it("detects pm2 stop all in Shell tool", () => {
    const violation = checkMessageForPm2Violation(makeMessage("Shell", "pm2 stop all"));
    expect(violation).toBe("pm2 stop all");
  });

  it("detects pm2 delete akari", () => {
    const violation = checkMessageForPm2Violation(makeMessage("Bash", "pm2 delete akari"));
    expect(violation).toBe("pm2 delete akari");
  });

  it("detects pm2 stop --id 0", () => {
    const violation = checkMessageForPm2Violation(makeMessage("bash", "pm2 stop --id 0"));
    expect(violation).toBe("pm2 stop --id 0");
  });

  it("returns null for safe pm2 commands", () => {
    expect(checkMessageForPm2Violation(makeMessage("Bash", "pm2 list"))).toBeNull();
    expect(checkMessageForPm2Violation(makeMessage("Bash", "pm2 logs"))).toBeNull();
    expect(checkMessageForPm2Violation(makeMessage("Bash", "pm2 restart akari"))).toBeNull();
  });

  it("returns null for non-assistant messages", () => {
    expect(checkMessageForPm2Violation({ type: "user", message: { content: [] } })).toBeNull();
  });

  it("returns null for non-shell tools", () => {
    const msg = {
      type: "assistant",
      message: {
        content: [
          { type: "tool_use", name: "Read", input: { filePath: "/some/file" } },
        ],
      },
    };
    expect(checkMessageForPm2Violation(msg)).toBeNull();
  });

  it("returns null when no tool_use blocks present", () => {
    const msg = {
      type: "assistant",
      message: {
        content: [{ type: "text", text: "Hello" }],
      },
    };
    expect(checkMessageForPm2Violation(msg)).toBeNull();
  });
});
