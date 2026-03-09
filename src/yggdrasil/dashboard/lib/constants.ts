import type { AgentName, AgentStatus, TaskStatus } from "./types";

// ─── Agent Configuration (Single Source of Truth) ───

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

// ─── Status Configuration ───

export const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string }> = {
  idle: { label: "Idle", color: "#71717a" },
  running: { label: "Running", color: "#a78bfa" },
  blocked: { label: "Blocked", color: "#ff6b6b" },
  done: { label: "Done", color: "#a3e635" },
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#71717a" },
  "in-progress": { label: "In Progress", color: "#a78bfa" },
  "review-needed": { label: "Review", color: "#f0abfc" },
  done: { label: "Done", color: "#a3e635" },
  blocked: { label: "Blocked", color: "#ff6b6b" },
};

// ─── WebSocket ───

export function getWsBase(): string {
  if (typeof window === "undefined") return "ws://localhost:7777";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:7777`;
}

export const MAX_LOGS = 500;
