export type AgentName = "odin" | "brokkr" | "heimdall" | "loki";

export type AgentStatus = "idle" | "running" | "blocked" | "done";

export interface AgentState {
  name: AgentName;
  displayName: string;
  status: AgentStatus;
  currentTP: string | null;
  mode: string | null;
  startedAt: number | null;
  pid: number | null;
  color: string;
}

export type TaskStatus =
  | "draft"
  | "in-progress"
  | "review-needed"
  | "done"
  | "blocked";

export interface Task {
  id: string;
  title: string;
  agent: string;
  status: TaskStatus;
  created: string;
  updated: string;
}

export interface DependencyGraphNode {
  id: string;
  dependsOn: string[];
  status: TaskStatus;
}

export interface DependencyGraphResponse {
  nodes: DependencyGraphNode[];
  executionOrder: string[][];
  hasCycle: boolean;
  cycle: string[] | null;
}

export interface LogEntry {
  timestamp: number;
  agent: AgentName | "system";
  message: string;
  level: "info" | "warn" | "error";
}

export interface OdinAction {
  id: string;
  label: string;
  type: "approve" | "reject" | "custom";
  payload?: Record<string, unknown>;
}

export interface OdinMessage {
  id: string;
  timestamp: number;
  role: "user" | "odin";
  type: "command" | "response" | "approval_request" | "notification" | "progress";
  content: string;
  actions?: OdinAction[];
  metadata?: {
    tp?: string;
    agent?: string;
    skill?: string;
    severity?: "info" | "warning" | "critical";
  };
}
