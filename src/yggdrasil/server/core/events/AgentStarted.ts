import type { AgentName } from "../entities/Agent";
import type { DomainEvent } from "./DomainEvent";

export const AGENT_STARTED_EVENT = "agent.started";

export interface AgentStartedPayload {
  agent: AgentName;
  tp: string;
  mode: string;
  pid: number | null;
}

export type AgentStartedEvent = DomainEvent<AgentStartedPayload> & {
  type: typeof AGENT_STARTED_EVENT;
};
