import type { CommandResult } from "../entities/Message";
import type { DomainEvent } from "./DomainEvent";

export const COMMAND_PROCESSED_EVENT = "command.processed";

export interface CommandProcessedPayload {
  command: string;
  skill: string;
  result: CommandResult;
}

export type CommandProcessedEvent = DomainEvent<CommandProcessedPayload> & {
  type: typeof COMMAND_PROCESSED_EVENT;
};
