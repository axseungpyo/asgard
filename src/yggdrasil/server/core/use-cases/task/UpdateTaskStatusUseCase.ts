import type { TaskEntity, TaskStatus } from "../../entities/Task";
import { TASK_STATUS_CHANGED_EVENT } from "../../events/TaskStatusChanged";
import type { IEventBus } from "../../ports/IEventBus";
import type { ITaskRepository } from "../../ports/ITaskRepository";

export interface UpdateTaskStatusInput {
  id: string;
  status: TaskStatus;
}

export class UpdateTaskStatusUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus?: IEventBus,
  ) {}

  async execute(input: UpdateTaskStatusInput): Promise<TaskEntity | null> {
    const current = await this.taskRepository.getById(input.id);
    const updated = await this.taskRepository.updateStatus(input.id, input.status);
    if (updated) {
      this.eventBus?.publish({
        type: TASK_STATUS_CHANGED_EVENT,
        timestamp: Date.now(),
        payload: {
          id: updated.id,
          oldStatus: current?.status ?? updated.status,
          newStatus: updated.status,
        },
      });
    }
    return updated;
  }
}
