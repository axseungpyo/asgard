import fs from "fs/promises";
import path from "path";
import type { IAgentRepository } from "../../ports/IAgentRepository";
import type { IMessageRepository } from "../../ports/IMessageRepository";
import type { ISkillRegistry } from "../../ports/ISkillRegistry";
import type { ITaskRepository } from "../../ports/ITaskRepository";

export class ContextBuilder {
  constructor(
    private readonly asgardRoot: string,
    private readonly taskRepository: ITaskRepository,
    private readonly agentRepository: IAgentRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly skillRegistry: ISkillRegistry,
  ) {}

  async build(): Promise<string> {
    const [{ active, completed }, projectSummary] = await Promise.all([
      this.taskRepository.list(),
      this.readProjectSummary(),
    ]);
    const agentStates = await this.agentRepository.getStates(active);

    const activeTasks = active.length
      ? active.map((task) => `- ${task.id}: ${task.title} [${task.status}] (${task.agent})`).join("\n")
      : "- 활성 태스크 없음";
    const agentStatus = agentStates.length
      ? agentStates.map((agent) => `- ${agent.displayName}: ${agent.status}${agent.currentTP ? ` (${agent.currentTP})` : ""}`).join("\n")
      : "- 에이전트 정보 없음";
    const skills = this.skillRegistry.listSkills()
      .map((skill) => `- ${skill.skill}: ${skill.description}`)
      .join("\n");
    const recentHistory = this.messageRepository.getMessages(10)
      .map((message) => `- ${message.role}: ${message.content.replace(/\s+/g, " ").slice(0, 200)}`)
      .join("\n") || "- 최근 대화 없음";

    return [
      "You are Odin, the Brain Agent of the Asgard orchestration system.",
      "You plan tasks, delegate to agents (Brokkr/Heimdall), and review results.",
      "",
      "Current Project State:",
      `- Active Task Count: ${active.length}`,
      `- Completed Task Count: ${completed.length}`,
      "Active Tasks:",
      activeTasks,
      "Agent Status:",
      agentStatus,
      "Available Skills:",
      skills || "- 등록된 스킬 없음",
      "",
      "Project Summary:",
      projectSummary || "shared/context.md를 읽지 못했습니다.",
      "",
      "Recent Conversation:",
      recentHistory,
      "",
      "Rules:",
      "1. Use tools to take actions instead of only describing them.",
      "2. For dangerous actions like delegate and stop, ask the user for approval first.",
      "3. Keep responses concise and in Korean.",
    ].join("\n");
  }

  private async readProjectSummary(): Promise<string> {
    try {
      const content = await fs.readFile(path.join(this.asgardRoot, "shared", "context.md"), "utf-8");
      return content.slice(0, 4000).trim();
    } catch {
      return "";
    }
  }
}
