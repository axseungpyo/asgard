import path from "path";
import type { PlanStep } from "../../entities/Plan";
import type { IFileSystem } from "../../ports/IFileSystem";

const CONTEXT_LIMIT = 2000;

export class ContextService {
  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly projectRoot: string,
  ) {}

  async extractContext(step: PlanStep): Promise<string> {
    const rpMatch = step.result?.match(/RP-\d+/);
    if (rpMatch) {
      try {
        const rpPath = path.join(this.projectRoot, "artifacts", "handoff", `${rpMatch[0]}.md`);
        const content = await this.fileSystem.readFile(rpPath);
        return this.summarizeRP(content);
      } catch {
        // Fall through to the raw step result if the RP file is missing.
      }
    }

    if (step.result) {
      return step.result.slice(0, CONTEXT_LIMIT);
    }

    return "";
  }

  private summarizeRP(content: string): string {
    const summary = this.extractSection(content, "Summary");
    const acceptanceCriteria = this.extractSection(content, "Acceptance Criteria(?: Check)?");
    const parts = [summary, acceptanceCriteria].filter((section): section is string => Boolean(section?.trim()));

    return (parts.join("\n\n") || content).trim().slice(0, CONTEXT_LIMIT);
  }

  private extractSection(content: string, titlePattern: string): string | undefined {
    const regex = new RegExp(`## ${titlePattern}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`);
    return content.match(regex)?.[1]?.trim();
  }
}
