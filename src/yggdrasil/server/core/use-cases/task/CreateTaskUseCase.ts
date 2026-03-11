import type { CreateTaskInput, TaskEntity } from "../../entities/Task";
import { TASK_CREATED_EVENT } from "../../events/TaskCreated";
import type { IEventBus } from "../../ports/IEventBus";
import type { ITaskRepository } from "../../ports/ITaskRepository";

export interface CreateTaskResult {
  id: string;
  task: TaskEntity;
}

export class CreateTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus?: IEventBus,
  ) {}

  async execute(input: CreateTaskInput): Promise<CreateTaskResult> {
    const result = await this.taskRepository.create(input);
    this.eventBus?.publish({
      type: TASK_CREATED_EVENT,
      timestamp: Date.now(),
      payload: {
        id: result.id,
        title: result.task.title,
        agent: result.task.agent,
      },
    });
    return result;
  }
}
