export * from "../../shared/types";

import type {
  AgentState,
  LogEntry,
  OdinMessage,
  Task,
} from "../../shared/types";

export interface StatusResponse {
  agents: AgentState[];
  activeTasks: number;
  completedTasks: number;
}

export interface ChronicleResponse {
  tasks: Task[];
}

export interface AgentMetric {
  name: string;
  totalTasks: number;
  completed: number;
  blocked: number;
  successRate: number;
  avgDuration: number;
}

export interface DailyMetric {
  date: string;
  count: number;
}

export interface RecentExecution {
  agent: string;
  tp: string;
  duration: number;
  result: string;
  timestamp: string;
}

export interface MetricsResponse {
  agents: AgentMetric[];
  daily: DailyMetric[];
  recentExecutions: RecentExecution[];
}

export interface DocumentResponse {
  type: "tp" | "rp";
  id: string;
  content: string;
  title: string;
}

// WebSocket message types
export type WSMessage =
  | { type: "log"; data: LogEntry }
  | { type: "status"; data: AgentState[] }
  | { type: "chronicle"; data: Task[] }
  | { type: "message"; data: OdinMessage }
  | { type: "connected"; data: { message: string } };
