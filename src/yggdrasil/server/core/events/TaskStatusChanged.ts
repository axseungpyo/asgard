import type { TaskStatus } from "../entities/Task";
import type { DomainEvent } from "./DomainEvent";

export const TASK_STATUS_CHANGED_EVENT = "task.status-changed";

export interface TaskStatusChangedPayload {
  id: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

export type TaskStatusChangedEvent = DomainEvent<TaskStatusChangedPayload> & {
  type: typeof TASK_STATUS_CHANGED_EVENT;
};
