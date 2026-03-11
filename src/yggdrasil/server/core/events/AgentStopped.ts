import type { AgentName } from "../entities/Agent";
import type { DomainEvent } from "./DomainEvent";

export const AGENT_STOPPED_EVENT = "agent.stopped";

export interface AgentStoppedPayload {
  agent: AgentName;
  exitCode: number;
}

export type AgentStoppedEvent = DomainEvent<AgentStoppedPayload> & {
  type: typeof AGENT_STOPPED_EVENT;
};
