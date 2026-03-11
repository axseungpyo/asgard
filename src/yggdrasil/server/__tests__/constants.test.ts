import { describe, it, expect } from "vitest";
import { AGENT_CONFIG, AGENT_NAMES } from "../../shared/constants";

describe("constants", () => {
  it("AGENT_NAMES contains all 4 agents", () => {
    expect(AGENT_NAMES).toEqual(["odin", "brokkr", "heimdall", "loki"]);
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
});
