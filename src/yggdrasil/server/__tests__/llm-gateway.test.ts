import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { ClaudeLLMGateway } from "../adapters/gateways/ClaudeLLMGateway";

describe("ClaudeLLMGateway", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await Promise.all(tempRoots.map((root) => fs.promises.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it("is unavailable when no key is configured", () => {
    const gateway = new ClaudeLLMGateway("/tmp/does-not-exist");
    expect(gateway.isAvailable()).toBe(false);
  });

  it("reads the API key from artifacts/config/mcp-servers.json", async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "yggdrasil-llm-"));
    tempRoots.push(root);
    await fs.promises.mkdir(path.join(root, "artifacts", "config"), { recursive: true });
    await fs.promises.writeFile(
      path.join(root, "artifacts", "config", "mcp-servers.json"),
      JSON.stringify({ apiKeys: { "anthropic-api-key": "sk-ant-test" } }),
      "utf-8",
    );

    const gateway = new ClaudeLLMGateway(root);
    expect(gateway.isAvailable()).toBe(true);
  });
});
