import type { LLMToolCall } from "./ILLMGateway";

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  requiresApproval?: boolean;
  approvalDescription?: string;
  metadata?: {
    skill?: string;
  };
}

export interface IToolExecutor {
  canHandle(toolName: string): boolean;
  execute(toolCall: LLMToolCall, projectRoot: string): Promise<ToolResult>;
  executeApproved?(toolCall: LLMToolCall, projectRoot: string): Promise<ToolResult>;
}
