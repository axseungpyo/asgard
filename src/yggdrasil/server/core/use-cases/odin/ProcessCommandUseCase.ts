import type { CommandResult } from "../../entities/Message";
import type { IAgentRepository } from "../../ports/IAgentRepository";
import type { IApprovalStore } from "../../ports/IApprovalStore";
import { COMMAND_PROCESSED_EVENT } from "../../events/CommandProcessed";
import type { ILLMGateway, LLMMessage, LLMToolCall, LLMToolDefinition } from "../../ports/ILLMGateway";
import type { IEventBus } from "../../ports/IEventBus";
import type { IMessageRepository } from "../../ports/IMessageRepository";
import type { ISkillRegistry } from "../../ports/ISkillRegistry";
import type { ITaskRepository } from "../../ports/ITaskRepository";
import { ContextBuilder } from "./ContextBuilder";

const ODIN_TOOLS: LLMToolDefinition[] = [
  { name: "get_status", description: "프로젝트 현황 조회", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  {
    name: "create_task",
    description: "새 태스크(TP) 생성",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        objective: { type: "string" },
        agent: { type: "string" },
      },
      required: ["title", "objective", "agent"],
    },
  },
  {
    name: "delegate_task",
    description: "에이전트에게 태스크 위임",
    input_schema: {
      type: "object",
      properties: {
        tp_id: { type: "string" },
        agent: { type: "string" },
      },
      required: ["tp_id", "agent"],
    },
  },
  {
    name: "stop_agent",
    description: "에이전트 중지",
    input_schema: {
      type: "object",
      properties: {
        agent: { type: "string" },
      },
      required: ["agent"],
    },
  },
  {
    name: "validate_task",
    description: "TP 포맷 검증",
    input_schema: {
      type: "object",
      properties: {
        tp_id: { type: "string" },
      },
    },
  },
  {
    name: "ask_user",
    description: "사용자에게 승인 요청",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string" },
        actions: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["question"],
    },
  },
];

export class ProcessCommandUseCase {
  private readonly contextBuilder: ContextBuilder;

  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly skillRegistry: ISkillRegistry,
    private readonly approvalStore: IApprovalStore,
    private readonly llmGateway: ILLMGateway,
    private readonly regexFallbackGateway: ILLMGateway,
    taskRepository: ITaskRepository,
    agentRepository: IAgentRepository,
    asgardRoot: string,
    private readonly eventBus?: IEventBus,
  ) {
    this.contextBuilder = new ContextBuilder(
      asgardRoot,
      taskRepository,
      agentRepository,
      messageRepository,
      skillRegistry,
    );
  }

  async execute(content: string): Promise<CommandResult> {
    const messages = [this.messageRepository.addMessage({ role: "user", type: "command", content })];
    const conversation = this.toLLMMessages();

    if (this.llmGateway.isAvailable()) {
      try {
        const response = await this.llmGateway.chat(conversation, {
          system: await this.contextBuilder.build(),
          tools: ODIN_TOOLS,
        });
        return this.finalizeCommand(content, await this.handleLLMResponse(response, messages));
      } catch {
        return this.finalizeCommand(content, await this.executeRegexFallback(conversation, messages));
      }
    }

    return this.finalizeCommand(content, await this.executeRegexFallback(conversation, messages));
  }

  private requestApproval(skill: string, args: string, description: string, messages: CommandResult["messages"]): CommandResult {
    const approvalId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.approvalStore.set(approvalId, { skill, args });
    messages.push(this.messageRepository.addMessage({
      role: "odin",
      type: "approval_request",
      content: `**${description}**\n\nSkill: \`/${skill}${args ? ` ${args}` : ""}\`\n${args ? `Target: ${args}` : "인자 없음"}`,
      actions: [{ id: approvalId, label: "Approve", type: "approve" }, { id: `${approvalId}-reject`, label: "Cancel", type: "reject" }],
      metadata: { skill, tp: args || undefined },
    }));
    return { messages };
  }

  private async executeRegexFallback(conversation: LLMMessage[], messages: CommandResult["messages"]): Promise<CommandResult> {
    const response = await this.regexFallbackGateway.chat(conversation);
    return this.handleLLMResponse(response, messages);
  }

  private async handleLLMResponse(
    response: Awaited<ReturnType<ILLMGateway["chat"]>>,
    messages: CommandResult["messages"],
  ): Promise<CommandResult> {
    const toolCalls = response.toolCalls?.slice(0, 3) ?? [];

    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        await this.handleToolCall(toolCall, messages);
      }
      return { messages };
    }

    messages.push(this.messageRepository.addMessage({
      role: "odin",
      type: "response",
      content: response.content || "처리할 수 있는 명령을 찾지 못했습니다.",
    }));
    return { messages };
  }

  private async handleToolCall(toolCall: LLMToolCall, messages: CommandResult["messages"]): Promise<void> {
    if (toolCall.name === "execute_skill") {
      const skill = this.readString(toolCall.input, "skill");
      const args = this.readString(toolCall.input, "args");
      const description = this.readString(toolCall.input, "description") || "승인 요청";
      const requiresApproval = Boolean(toolCall.input.requiresApproval);
      if (!skill) {
        messages.push(this.messageRepository.addMessage({ role: "odin", type: "response", content: "실행할 스킬 정보가 없습니다." }));
        return;
      }
      if (requiresApproval) {
        this.requestApproval(skill, args, description, messages);
        return;
      }
      await this.executeSkill(skill, args, messages);
      return;
    }

    if (toolCall.name === "get_status") {
      await this.executeSkill("status", "", messages);
      return;
    }

    if (toolCall.name === "validate_task") {
      await this.executeSkill("validate", this.readString(toolCall.input, "tp_id") || this.readString(toolCall.input, "tpId"), messages);
      return;
    }

    if (toolCall.name === "delegate_task") {
      const tpId = this.readString(toolCall.input, "tp_id") || this.readString(toolCall.input, "tpId");
      const requestedAgent = (this.readString(toolCall.input, "agent") || "brokkr").toLowerCase();
      const skill = requestedAgent === "heimdall" || requestedAgent === "gemini" ? "delegate-gemini" : "delegate";
      const description = skill === "delegate-gemini"
        ? "Heimdall에게 비전 태스크를 위임합니다."
        : "Brokkr에게 태스크를 위임합니다.";
      this.requestApproval(skill, tpId, description, messages);
      return;
    }

    if (toolCall.name === "stop_agent") {
      const agent = this.readString(toolCall.input, "agent").toLowerCase();
      this.requestApproval("stop-agent", agent, "에이전트를 중지합니다.", messages);
      return;
    }

    if (toolCall.name === "create_task") {
      const title = this.readString(toolCall.input, "title");
      const objective = this.readString(toolCall.input, "objective");
      const agent = this.readString(toolCall.input, "agent");
      await this.executeSkill("plan", [title, objective, agent].filter(Boolean).join(" | "), messages);
      return;
    }

    if (toolCall.name === "ask_user") {
      const question = this.readString(toolCall.input, "question") || "승인이 필요합니다.";
      const actions = Array.isArray(toolCall.input.actions)
        ? toolCall.input.actions.filter((value): value is string => typeof value === "string")
        : [];
      messages.push(this.messageRepository.addMessage({
        role: "odin",
        type: "approval_request",
        content: question,
        actions: actions.length
          ? actions.map((label, index) => ({ id: `ask-${Date.now()}-${index}`, label, type: "custom" as const }))
          : [{ id: `ask-${Date.now()}-0`, label: "확인", type: "custom" as const }],
      }));
      return;
    }

    messages.push(this.messageRepository.addMessage({
      role: "odin",
      type: "response",
      content: `지원하지 않는 도구 호출입니다: ${toolCall.name}`,
    }));
  }

  private async executeSkill(skill: string, args: string, messages: CommandResult["messages"]): Promise<CommandResult> {
    messages.push(this.messageRepository.addMessage({
      role: "odin",
      type: "progress",
      content: `\`/${skill}${args ? ` ${args}` : ""}\` 실행 중...`,
      metadata: { skill },
    }));

    try {
      const result = await this.skillRegistry.execute(skill, args);
      messages.push(this.messageRepository.addMessage({ role: "odin", type: "response", content: result, metadata: { skill } }));
    } catch (err) {
      messages.push(this.messageRepository.addMessage({
        role: "odin",
        type: "response",
        content: `실행 실패: ${err instanceof Error ? err.message : "Unknown error"}`,
        metadata: { skill, severity: "critical" },
      }));
    }

    return { messages };
  }

  private finalizeCommand(command: string, result: CommandResult): CommandResult {
    const lastSkill = [...result.messages]
      .reverse()
      .find((message) => message.metadata?.skill)
      ?.metadata?.skill ?? "";

    this.eventBus?.publish({
      type: COMMAND_PROCESSED_EVENT,
      timestamp: Date.now(),
      payload: {
        command,
        skill: lastSkill,
        result,
      },
    });

    return result;
  }

  private toLLMMessages(): LLMMessage[] {
    return this.messageRepository.getMessages(12).map((message) => ({
      role: message.role === "odin" ? "assistant" : "user",
      content: message.content,
    }));
  }

  private readString(input: Record<string, unknown>, key: string): string {
    const value = input[key];
    return typeof value === "string" ? value.trim() : "";
  }
}
