import type { DomainEvent } from "./DomainEvent";

export const FILE_CHANGED_EVENT = "file.changed";

export interface FileChangedPayload {
  path: string;
  type: "log" | "index" | "handoff";
}

export type FileChangedEvent = DomainEvent<FileChangedPayload> & {
  type: typeof FILE_CHANGED_EVENT;
};
