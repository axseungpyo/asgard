import type { ISkillRegistry } from "../../core/ports/ISkillRegistry";
import type { ILLMGateway, LLMMessage, LLMResponse } from "../../core/ports/ILLMGateway";

const FALLBACK_HELP = `명령을 이해했습니다. 다음 작업을 수행할 수 있습니다:

• **상태 확인** — "상태" 또는 "status"
• **TP 검증** — "TP-016 검증"
• **위임** — "TP-016 Brokkr에게 위임"
• **검토** — "RP-016 검토"
• **기획** — "로그인 기능 기획"
• **롤백** — "TP-016 롤백"
• **재시도** — "TP-016 재시도"`;

export class RegexFallbackGateway implements ILLMGateway {
  constructor(private readonly skillRegistry: ISkillRegistry) {}

  isAvailable(): boolean {
    return true;
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const skillMatch = this.skillRegistry.match(latestUserMessage);

    if (!skillMatch) {
      return {
        content: FALLBACK_HELP,
        stopReason: "end_turn",
      };
    }

    return {
      content: "",
      toolCalls: [
        {
          name: "execute_skill",
          input: {
            skill: skillMatch.skill,
            args: skillMatch.args,
            description: skillMatch.description,
            requiresApproval: skillMatch.requiresApproval,
          },
        },
      ],
      stopReason: "tool_use",
    };
  }
}
