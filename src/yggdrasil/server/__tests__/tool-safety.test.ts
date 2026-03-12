import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeFileSystem } from "../adapters/filesystem/NodeFileSystem";
import { FileSystemToolExecutor } from "../adapters/tools/FileSystemToolExecutor";
import type { DomainEvent } from "../core/events/DomainEvent";
import { TOOL_EXECUTED_EVENT } from "../core/events/ToolExecuted";
import type { IEventBus } from "../core/ports/IEventBus";

class StubEventBus implements IEventBus {
  readonly published: DomainEvent[] = [];

  publish(event: DomainEvent): void {
    this.published.push(event);
  }

  subscribe(): () => void {
    return () => {};
  }

  subscribeAll(): () => void {
    return () => {};
  }
}

describe("Tool Safety", () => {
  let rootDir: string;
  let eventBus: StubEventBus;
  let executor: FileSystemToolExecutor;

  beforeEach(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "asgard-tool-safety-"));
    await fs.mkdir(path.join(rootDir, "src"), { recursive: true });
    await fs.writeFile(path.join(rootDir, "src", "small.txt"), "safe", "utf-8");
    eventBus = new StubEventBus();
    executor = new FileSystemToolExecutor(new NodeFileSystem(), rootDir, eventBus);
  });

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  it("returns requiresApproval for write_file without writing", async () => {
    const result = await executor.execute(
      { name: "write_file", input: { path: "notes/output.txt", content: "hello asgard" } },
      rootDir,
    );

    expect(result.success).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.approvalDescription).toContain("notes/output.txt");
    await expect(fs.access(path.join(rootDir, "notes", "output.txt"))).rejects.toBeDefined();
  });

  it("executeApproved performs the actual write", async () => {
    const result = await executor.executeApproved!(
      { name: "write_file", input: { path: "notes/output.txt", content: "approved write" } },
      rootDir,
    );

    expect(result.success).toBe(true);
    await expect(fs.readFile(path.join(rootDir, "notes", "output.txt"), "utf-8")).resolves.toBe("approved write");
  });

  it("publishes TOOL_EXECUTED events", async () => {
    await executor.execute({ name: "read_file", input: { path: "src/small.txt" } }, rootDir);

    expect(eventBus.published).toHaveLength(1);
    expect(eventBus.published[0]).toMatchObject({
      type: TOOL_EXECUTED_EVENT,
      payload: {
        tool: "read_file",
        input: { path: "src/small.txt" },
        success: true,
      },
    });
    expect(typeof eventBus.published[0]?.payload.durationMs).toBe("number");
    expect(typeof eventBus.published[0]?.payload.timestamp).toBe("number");
  });

  it("rejects read_file when the file exceeds 1MB", async () => {
    const oversized = "x".repeat(1024 * 1024 + 1);
    await fs.writeFile(path.join(rootDir, "src", "large.txt"), oversized, "utf-8");

    const result = await executor.execute({ name: "read_file", input: { path: "src/large.txt" } }, rootDir);

    expect(result.success).toBe(false);
    expect(result.error).toContain("1MB");
  });
});
