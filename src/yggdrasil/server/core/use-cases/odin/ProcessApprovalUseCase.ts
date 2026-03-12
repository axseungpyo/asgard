import type { CommandResult } from "../../entities/Message";
import type { IApprovalStore } from "../../ports/IApprovalStore";
import type { IMessageRepository } from "../../ports/IMessageRepository";
import type { ISkillRegistry } from "../../ports/ISkillRegistry";
import type { IToolExecutor } from "../../ports/IToolExecutor";

export interface ProcessApprovalInput {
  approvalId: string;
  approved: boolean;
}

export class ProcessApprovalUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly skillRegistry: ISkillRegistry,
    private readonly approvalStore: IApprovalStore,
    private readonly toolExecutors: IToolExecutor[],
    private readonly projectRoot: string,
  ) {}

  async execute(input: ProcessApprovalInput): Promise<CommandResult> {
    const messages: CommandResult["messages"] = [];
    const pending = this.approvalStore.get(input.approvalId);

    if (!pending) {
      messages.push(this.messageRepository.addMessage({
        role: "odin",
        type: "response",
        content: "승인 요청을 찾을 수 없습니다. 이미 처리되었거나 만료되었습니다.",
      }));
      return { messages };
    }

    this.approvalStore.delete(input.approvalId);
    if (!input.approved) {
      messages.push(this.messageRepository.addMessage({ role: "user", type: "command", content: "Cancel" }));
      messages.push(this.messageRepository.addMessage({ role: "odin", type: "response", content: `\`/${pending.skill}\` 실행이 취소되었습니다.` }));
      return { messages };
    }

    messages.push(this.messageRepository.addMessage({ role: "user", type: "command", content: "Approve" }));
    messages.push(this.messageRepository.addMessage({
      role: "odin",
      type: "progress",
      content: `\`/${pending.skill}${pending.args ? ` ${pending.args}` : ""}\` 실행 중...`,
      metadata: { skill: pending.skill },
    }));

    if (pending.skill.startsWith("tool:")) {
      try {
        const toolName = pending.skill.slice("tool:".length);
        const toolInput = this.parseToolInput(pending.args);
        const executor = this.toolExecutors.find((entry) => entry.canHandle(toolName) && entry.executeApproved);

        if (!executor?.executeApproved) {
          messages.push(this.messageRepository.addMessage({
            role: "odin",
            type: "response",
            content: `실행 실패: 승인 후 실행할 수 없는 도구입니다. (${toolName})`,
            metadata: { skill: pending.skill, severity: "critical" },
          }));
          return { messages };
        }

        const result = await executor.executeApproved({ name: toolName, input: toolInput }, this.projectRoot);
        messages.push(this.messageRepository.addMessage({
          role: "odin",
          type: "response",
          content: result.success ? result.output : `실행 실패: ${result.error ?? "Unknown error"}`,
          metadata: { tool: toolName, skill: pending.skill },
        }));
        return { messages };
      } catch (err) {
        messages.push(this.messageRepository.addMessage({
          role: "odin",
          type: "response",
          content: `실행 실패: ${err instanceof Error ? err.message : "Unknown error"}`,
          metadata: { skill: pending.skill, severity: "critical" },
        }));
        return { messages };
      }
    }

    try {
      const result = await this.skillRegistry.execute(pending.skill, pending.args);
      messages.push(this.messageRepository.addMessage({ role: "odin", type: "response", content: result, metadata: { skill: pending.skill } }));
    } catch (err) {
      messages.push(this.messageRepository.addMessage({
        role: "odin",
        type: "response",
        content: `실행 실패: ${err instanceof Error ? err.message : "Unknown error"}`,
        metadata: { skill: pending.skill, severity: "critical" },
      }));
    }

    return { messages };
  }

  private parseToolInput(args: string): Record<string, unknown> {
    if (!args) {
      return {};
    }

    const parsed = JSON.parse(args) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("승인된 tool input 형식이 올바르지 않습니다.");
    }
    return parsed as Record<string, unknown>;
  }
}
