import type { CommandResult, OdinMessage } from "../../core/entities/Message";
import type { IMessageRepository } from "../../core/ports/IMessageRepository";
import { ProcessApprovalUseCase } from "../../core/use-cases/odin/ProcessApprovalUseCase";
import { ProcessCommandUseCase } from "../../core/use-cases/odin/ProcessCommandUseCase";

interface OdinChannelDeps {
  messageRepository: IMessageRepository;
  processCommandUseCase: ProcessCommandUseCase;
  processApprovalUseCase: ProcessApprovalUseCase;
}

export interface OdinChannel {
  getMessages(limit?: number): OdinMessage[];
  processCommand(content: string): Promise<CommandResult>;
  processApproval(approvalId: string, approved: boolean): Promise<CommandResult>;
  loadHistory(): Promise<void>;
  saveHistory(): Promise<void>;
}

export function createOdinChannel(deps: OdinChannelDeps): OdinChannel {
  return {
    getMessages(limit = 50): OdinMessage[] {
      return deps.messageRepository.getMessages(limit);
    },

    async processCommand(content: string): Promise<CommandResult> {
      return deps.processCommandUseCase.execute(content);
    },

    async processApproval(approvalId: string, approved: boolean): Promise<CommandResult> {
      return deps.processApprovalUseCase.execute({ approvalId, approved });
    },

    loadHistory(): Promise<void> {
      return deps.messageRepository.loadHistory();
    },

    saveHistory(): Promise<void> {
      return deps.messageRepository.saveHistory();
    },
  };
}
