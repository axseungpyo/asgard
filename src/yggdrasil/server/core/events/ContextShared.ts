export const CONTEXT_SHARED_EVENT = "context.shared" as const;

export interface ContextSharedPayload extends Record<string, unknown> {
  fromStep: number;
  toStep: number;
  fromAgent: string;
  toAgent: string;
  contextSummary: string;
  planId: string;
  timestamp: number;
}
