import type { AgentName } from "./types";

export interface AgentConfig {
  displayName: string;
  color: string;
  model: string;
  role: string;
}

export const AGENT_CONFIG: Record<AgentName, AgentConfig> = {
  odin: { displayName: "Odin", color: "#d97757", model: "Claude Opus 4.6", role: "Brain" },
  brokkr: { displayName: "Brokkr", color: "#10a37f", model: "GPT-5.4 (Codex CLI)", role: "Hands-Code" },
  heimdall: { displayName: "Heimdall", color: "#4285f4", model: "Gemini 3.1 Pro (Gemini CLI)", role: "Hands-Vision" },
  loki: { displayName: "Loki", color: "#a855f7", model: "Image Gen", role: "Hands-Image" },
};

export const AGENT_NAMES: AgentName[] = ["odin", "brokkr", "heimdall", "loki"];
