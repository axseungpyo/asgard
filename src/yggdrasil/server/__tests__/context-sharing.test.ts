import { describe, expect, it } from "vitest";
import { InMemoryPlanRepository } from "../adapters/repositories/InMemoryPlanRepository";
import { InMemorySettingsRepository } from "../adapters/repositories/InMemorySettingsRepository";
import { InMemoryApprovalStore } from "../adapters/stores/InMemoryApprovalStore";
import { CONTEXT_SHARED_EVENT } from "../core/events/ContextShared";
import type { DomainEvent } from "../core/events/DomainEvent";
import type { PlanStep } from "../core/entities/Plan";
import type { IEventBus } from "../core/ports/IEventBus";
import type { IFileSystem, FileEntry, SearchResult } from "../core/ports/IFileSystem";
import type { IMessageRepository } from "../core/ports/IMessageRepository";
import type { IToolExecutor, ToolResult } from "../core/ports/IToolExecutor";
import { ContextService } from "../core/use-cases/plan/ContextService";
import { PlannerUseCase } from "../core/use-cases/plan/PlannerUseCase";

class MemoryMessageRepository implements IMessageRepository {
  getMessages() {
    return [];
  }

  addMessage(message: Parameters<IMessageRepository["addMessage"]>[0]) {
    return {
      ...message,
      id: "msg-1",
      timestamp: Date.now(),
    };
  }

  async loadHistory(): Promise<void> {}
  async saveHistory(): Promise<void> {}
}

class StubEventBus implements IEventBus {
  published: DomainEvent[] = [];

  publish(event: DomainEvent): void {
    this.published.push(event);
  }

  subscribe(): () => void {
    return () => {};
  }

  subscribeAll(): () => void {
    return () => {};
  }
}

class MemoryFileSystem implements IFileSystem {
  constructor(private readonly files: Record<string, string> = {}) {}

  async readFile(absolutePath: string): Promise<string> {
    const content = this.files[absolutePath];
    if (content === undefined) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    return content;
  }

  async writeFile(absolutePath: string, content: string): Promise<void> {
    this.files[absolutePath] = content;
  }

  async listDirectory(): Promise<FileEntry[]> {
    return [];
  }

  async exists(absolutePath: string): Promise<boolean> {
    return absolutePath in this.files;
  }

  async searchContent(): Promise<SearchResult[]> {
    return [];
  }
}

class RecordingToolExecutor implements IToolExecutor {
  readonly calls: Array<Parameters<IToolExecutor["execute"]>[0]> = [];

  canHandle(toolName: string): boolean {
    return toolName === "implement" || toolName === "analyze";
  }

  async execute(toolCall: Parameters<IToolExecutor["execute"]>[0]): Promise<ToolResult> {
    this.calls.push(toolCall);

    return {
      success: true,
      output: toolCall.name === "analyze" ? "See RP-029" : "implemented",
    };
  }
}

function createContextService(files?: Record<string, string>) {
  return new ContextService(new MemoryFileSystem(files), "/tmp/asgard");
}

function createCompletedStep(result?: string): PlanStep {
  return {
    order: 1,
    action: "analyze",
    description: "Analyze",
    input: { agent: "heimdall" },
    requiresApproval: false,
    status: "completed",
    result,
  };
}

function createPlanner(toolExecutors: IToolExecutor[], contextService: ContextService, eventBus = new StubEventBus()) {
  const settingsRepository = new InMemorySettingsRepository();
  settingsRepository.setAutonomyLevel(2);

  return {
    plannerUseCase: new PlannerUseCase(
      new InMemoryPlanRepository(),
      toolExecutors,
      new InMemoryApprovalStore(),
      new MemoryMessageRepository(),
      eventBus,
      settingsRepository,
      "/tmp/asgard",
      contextService,
    ),
    eventBus,
  };
}

describe("ContextService", () => {
  it("extracts RP summary and acceptance criteria sections", async () => {
    const rpPath = "/tmp/asgard/artifacts/handoff/RP-029.md";
    const contextService = createContextService({
      [rpPath]: [
        "# RP-029: Context Sharing",
        "",
        "## Summary",
        "Shared result summary.",
        "",
        "## Acceptance Criteria Check",
        "- [x] AC-1",
        "- [x] AC-2",
        "",
        "## Known Issues / Follow-ups",
        "None",
      ].join("\n"),
    });

    const context = await contextService.extractContext(createCompletedStep("artifact generated at RP-029"));

    expect(context).toContain("Shared result summary.");
    expect(context).toContain("- [x] AC-1");
    expect(context).not.toContain("Known Issues");
  });

  it("falls back to step result when RP file cannot be read", async () => {
    const contextService = createContextService();

    await expect(contextService.extractContext(createCompletedStep("plain step result"))).resolves.toBe("plain step result");
  });

  it("limits extracted context to 2000 characters", async () => {
    const longResult = "x".repeat(2500);
    const contextService = createContextService();

    const context = await contextService.extractContext(createCompletedStep(longResult));

    expect(context).toHaveLength(2000);
  });
});

describe("PlannerUseCase context sharing", () => {
  it("injects previous context into step input", async () => {
    const rpPath = "/tmp/asgard/artifacts/handoff/RP-029.md";
    const executor = new RecordingToolExecutor();
    const { plannerUseCase } = createPlanner(
      [executor],
      createContextService({
        [rpPath]: [
          "## Summary",
          "Context from previous step.",
          "",
          "## Acceptance Criteria",
          "- [x] injected",
        ].join("\n"),
      }),
    );
    const plan = await plannerUseCase.createPlan("share context", [
      {
        action: "analyze",
        description: "Analyze UI",
        input: { agent: "heimdall" },
        requiresApproval: false,
      },
      {
        action: "implement",
        description: "Implement UI",
        input: { agent: "brokkr" },
        contextFrom: [1],
        requiresApproval: false,
      },
    ]);

    const result = await plannerUseCase.executePlan(plan.id);
    const implementCall = executor.calls.find((call) => call.name === "implement");

    expect(result.steps[1]?.contextData).toContain("Context from previous step.");
    expect(implementCall?.input.previousContext).toContain("Context from previous step.");
  });

  it("publishes a context shared event", async () => {
    const rpPath = "/tmp/asgard/artifacts/handoff/RP-029.md";
    const executor = new RecordingToolExecutor();
    const { plannerUseCase, eventBus } = createPlanner(
      [executor],
      createContextService({
        [rpPath]: [
          "## Summary",
          "Shared context body.",
          "",
          "## Acceptance Criteria",
          "- [x] event",
        ].join("\n"),
      }),
    );
    const plan = await plannerUseCase.createPlan("share context", [
      {
        action: "analyze",
        description: "Analyze UI",
        input: { agent: "heimdall" },
        requiresApproval: false,
      },
      {
        action: "implement",
        description: "Implement UI",
        input: { agent: "brokkr" },
        contextFrom: [1],
        requiresApproval: false,
      },
    ]);

    await plannerUseCase.executePlan(plan.id);

    expect(eventBus.published).toContainEqual(expect.objectContaining({
      type: CONTEXT_SHARED_EVENT,
      payload: expect.objectContaining({
        fromStep: 1,
        toStep: 2,
        fromAgent: "heimdall",
        toAgent: "brokkr",
        planId: plan.id,
        contextSummary: expect.stringContaining("Shared context body."),
      }),
    }));
  });
});
