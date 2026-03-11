import type { DomainEvent } from "./DomainEvent";

export const TASK_CREATED_EVENT = "task.created";

export interface TaskCreatedPayload {
  id: string;
  title: string;
  agent: string;
}

export type TaskCreatedEvent = DomainEvent<TaskCreatedPayload> & {
  type: typeof TASK_CREATED_EVENT;
};
