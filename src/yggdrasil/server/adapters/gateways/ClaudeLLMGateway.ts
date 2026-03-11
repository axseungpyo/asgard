import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { ILLMGateway, LLMMessage, LLMResponse, LLMToolDefinition } from "../../core/ports/ILLMGateway";

const DEFAULT_MODEL = "claude-sonnet-4-6";

interface SettingsLike {
  env?: Record<string, unknown>;
  apiKeys?: Record<string, unknown>;
  servers?: Array<{ env?: Record<string, unknown> }>;
}

export class ClaudeLLMGateway implements ILLMGateway {
  constructor(private readonly asgardRoot: string) {}

  isAvailable(): boolean {
    return Boolean(this.resolveApiKey());
  }

  async chat(
    messages: LLMMessage[],
    options: { tools?: LLMToolDefinition[]; system?: string } = {},
  ): Promise<LLMResponse> {
    const apiKey = this.resolveApiKey();
    if (!apiKey) {
      throw new Error("Anthropic API key is not configured.");
    }

    const client = new Anthropic({ apiKey });
    const systemMessages = messages.filter((message) => message.role === "system").map((message) => message.content.trim()).filter(Boolean);
    const system = [options.system?.trim(), ...systemMessages].filter(Boolean).join("\n\n") || undefined;

    const anthropicTools = options.tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object" as const,
        ...tool.input_schema,
      },
    }));

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      ...(system ? { system } : {}),
      ...(anthropicTools?.length ? { tools: anthropicTools } : {}),
      messages: messages
        .filter((message): message is LLMMessage & { role: "user" | "assistant" } => message.role !== "system")
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    });

    const contentBlocks = response.content as unknown as Array<Record<string, unknown>>;
    const textParts: string[] = [];
    const toolCalls = contentBlocks
      .filter((block) => block.type === "tool_use")
      .map((block) => ({
        name: String(block.name ?? ""),
        input: (block.input as Record<string, unknown> | undefined) ?? {},
      }))
      .filter((call) => call.name);

    for (const block of contentBlocks) {
      if (block.type === "text" && typeof block.text === "string") {
        textParts.push(block.text);
      }
    }

    return {
      content: textParts.join("\n").trim(),
      ...(toolCalls.length ? { toolCalls } : {}),
      stopReason: this.normalizeStopReason(response.stop_reason),
    };
  }

  private resolveApiKey(): string | null {
    const envKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (envKey) {
      return envKey;
    }

    for (const candidate of this.settingsCandidates()) {
      const key = this.readKeyFromFile(candidate);
      if (key) {
        return key;
      }
    }

    return null;
  }

  private settingsCandidates(): string[] {
    return [
      path.join(this.asgardRoot, "artifacts", "config", "mcp-servers.json"),
      path.join(this.asgardRoot, ".claude", "settings.json"),
    ];
  }

  private readKeyFromFile(filePath: string): string | null {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as SettingsLike;
      return this.extractKey(parsed);
    } catch {
      return null;
    }
  }

  private extractKey(parsed: SettingsLike): string | null {
    const candidates = [
      parsed.apiKeys?.["anthropic-api-key"],
      parsed.apiKeys?.ANTHROPIC_API_KEY,
      parsed.env?.ANTHROPIC_API_KEY,
      ...((parsed.servers ?? []).map((server) => server.env?.ANTHROPIC_API_KEY)),
    ];

    for (const value of candidates) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private normalizeStopReason(stopReason: string | null | undefined): LLMResponse["stopReason"] {
    if (stopReason === "tool_use" || stopReason === "max_tokens") {
      return stopReason;
    }
    return "end_turn";
  }
}
