import type { AgentName } from "../entities/Agent";
import type { DomainEvent } from "./DomainEvent";

export const LOG_ENTRY_EVENT = "log.entry";

export interface LogEntryPayload {
  agent: AgentName | "system";
  message: string;
  level: "info" | "warn" | "error";
}

export type LogEntryEvent = DomainEvent<LogEntryPayload> & {
  type: typeof LOG_ENTRY_EVENT;
};
