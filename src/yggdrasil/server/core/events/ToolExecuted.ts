export const TOOL_EXECUTED_EVENT = "tool.executed" as const;

export interface ToolExecutedPayload extends Record<string, unknown> {
  tool: string;
  input: Record<string, unknown>;
  success: boolean;
  output?: string;
  error?: string;
  durationMs: number;
  timestamp: number;
}
