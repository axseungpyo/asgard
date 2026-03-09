import { describe, it, expect } from "vitest";
import { AGENT_CONFIG, AGENT_NAMES, STATUS_CONFIG, TASK_STATUS_CONFIG, MAX_LOGS } from "../../dashboard/lib/constants";

describe("constants", () => {
  it("AGENT_NAMES contains all 3 agents", () => {
    expect(AGENT_NAMES).toEqual(["odin", "brokkr", "heimdall"]);
  });

  it("AGENT_CONFIG has entries for all agents", () => {
    for (const name of AGENT_NAMES) {
      const config = AGENT_CONFIG[name];
      expect(config.displayName).toBeTruthy();
      expect(config.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(config.model).toBeTruthy();
      expect(config.role).toBeTruthy();
    }
  });

  it("STATUS_CONFIG covers all agent statuses", () => {
    const expected = ["idle", "running", "blocked", "done"];
    expect(Object.keys(STATUS_CONFIG).sort()).toEqual(expected.sort());
  });

  it("TASK_STATUS_CONFIG covers all task statuses", () => {
    const expected = ["draft", "in-progress", "review-needed", "done", "blocked"];
    expect(Object.keys(TASK_STATUS_CONFIG).sort()).toEqual(expected.sort());
  });

  it("MAX_LOGS is a reasonable number", () => {
    expect(MAX_LOGS).toBeGreaterThan(0);
    expect(MAX_LOGS).toBeLessThanOrEqual(10000);
  });
});
