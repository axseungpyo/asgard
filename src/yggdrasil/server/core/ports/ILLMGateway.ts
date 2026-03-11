export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface LLMToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: LLMToolCall[];
  stopReason: "end_turn" | "tool_use" | "max_tokens";
}

export interface ILLMGateway {
  isAvailable(): boolean;
  chat(messages: LLMMessage[], options?: { tools?: LLMToolDefinition[]; system?: string }): Promise<LLMResponse>;
}
