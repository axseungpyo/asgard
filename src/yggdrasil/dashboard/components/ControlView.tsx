"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentState, Task, LogEntry } from "../lib/types";
import { AGENT_CONFIG, STATUS_CONFIG, TASK_STATUS_CONFIG, AGENT_MODE_CONFIG } from "../lib/constants";
import { authFetch } from "../lib/auth";

interface ControlViewProps {
  agents: AgentState[];
  tasks: Task[];
  logs: LogEntry[];
}

// ── Agent Control Card ──

function AgentControlCard({ agent }: { agent: AgentState }) {
  const config = AGENT_CONFIG[agent.name];
  const status = STATUS_CONFIG[agent.status];
  const modeConfig = AGENT_MODE_CONFIG[agent.name];
  const isControllable = agent.name !== "odin";

  const [selectedTP, setSelectedTP] = useState("");
  const [selectedMode, setSelectedMode] = useState(modeConfig?.defaultMode ?? "");
  const [loading, setLoading] = useState(false);

  const handleStart = useCallback(async () => {
    if (!selectedTP) return;
    setLoading(true);
    try {
      await authFetch(`/api/agent/${agent.name}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tp: selectedTP, mode: selectedMode || undefined }),
      });
    } catch { /* handled by UI state */ }
    setLoading(false);
  }, [agent.name, selectedTP, selectedMode]);

  const handleStop = useCallback(async () => {
    setLoading(true);
    try {
      await authFetch(`/api/agent/${agent.name}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch { /* handled by UI state */ }
    setLoading(false);
  }, [agent.name]);

  return (
    <div
      className="bg-bg-secondary border border-border/60 rounded-lg p-4"
      style={{ backgroundImage: `linear-gradient(135deg, ${config.color}08, transparent)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="text-[14px] font-medium text-slate-100">{agent.displayName}</span>
          {agent.mode && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
              {agent.mode}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-[12px] font-mono" style={{ color: status.color }}>
          {agent.status === "running" && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />
          )}
          {status.label}
        </span>
      </div>

      {/* Current task */}
      {agent.currentTP && (
        <div className="text-[12px] font-mono text-slate-400 mb-3">
          <span className="text-slate-500">task:</span> {agent.currentTP}
        </div>
      )}

      {/* Controls */}
      {isControllable && (
        <div className="mt-2">
          {agent.status === "running" ? (
            <button
              onClick={handleStop}
              disabled={loading}
              className="w-full py-1.5 text-[11px] font-mono rounded border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
            >
              {loading ? "..." : "Stop"}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  value={selectedTP}
                  onChange={(e) => setSelectedTP(e.target.value.toUpperCase())}
                  placeholder="TP-NNN"
                  className="flex-1 px-2 py-1 text-[11px] font-mono rounded border border-border bg-bg-primary text-slate-300 outline-none focus:border-slate-500 placeholder:text-slate-600"
                />
                {modeConfig && (
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    className="px-2 py-1 text-[11px] font-mono rounded border border-border bg-bg-primary text-slate-300 outline-none"
                  >
                    {modeConfig.modes.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                )}
              </div>
              <button
                onClick={handleStart}
                disabled={loading || !selectedTP}
                className="w-full py-1.5 text-[11px] font-mono rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "..." : "Start"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Odin always-on indicator */}
      {agent.name === "odin" && (
        <div className="mt-2 text-[10px] font-mono text-slate-500 text-center">
          Always Active
        </div>
      )}
    </div>
  );
}

// ── Task Pipeline ──

function TaskPipeline({ tasks }: { tasks: Task[] }) {
  const stages: { status: string; label: string; tasks: Task[] }[] = [
    { status: "draft", label: "Draft", tasks: tasks.filter(t => t.status === "draft") },
    { status: "in-progress", label: "Running", tasks: tasks.filter(t => t.status === "in-progress") },
    { status: "review-needed", label: "Review", tasks: tasks.filter(t => t.status === "review-needed") },
    { status: "blocked", label: "Blocked", tasks: tasks.filter(t => t.status === "blocked") },
  ];

  return (
    <div className="bg-bg-secondary border border-border/60 rounded-lg p-4">
      <div className="text-[12px] font-mono text-slate-400 mb-3">Task Pipeline</div>

      {/* Pipeline bar */}
      <div className="flex items-center gap-1 mb-4">
        {stages.map((stage) => {
          const stConfig = TASK_STATUS_CONFIG[stage.status as keyof typeof TASK_STATUS_CONFIG];
          return (
            <div key={stage.status} className="flex-1 text-center">
              <div className="text-[10px] font-mono text-slate-500 mb-1">
                {stage.label} ({stage.tasks.length})
              </div>
              <div
                className="h-1.5 rounded-full"
                style={{
                  backgroundColor: stage.tasks.length > 0 ? stConfig?.color : "#1e293b",
                  opacity: stage.tasks.length > 0 ? 0.7 : 0.3,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Task list */}
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {tasks.filter(t => t.status !== "done").length === 0 ? (
          <div className="text-[11px] font-mono text-slate-600 text-center py-3">No active tasks</div>
        ) : (
          tasks
            .filter(t => t.status !== "done")
            .map(task => {
              const stConfig = TASK_STATUS_CONFIG[task.status];
              return (
                <div key={task.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-primary/50 transition">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: stConfig?.color }}
                  />
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">{task.id}</span>
                  <span className="text-[11px] text-slate-300 truncate">{task.title}</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-600 shrink-0">{task.agent}</span>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

// ── Activity Feed ──

function ActivityFeed({ logs }: { logs: LogEntry[] }) {
  // Show last 20 non-debug logs
  const recentLogs = logs.slice(-20).reverse();

  return (
    <div className="bg-bg-secondary border border-border/60 rounded-lg p-4">
      <div className="text-[12px] font-mono text-slate-400 mb-3">Activity Feed</div>
      <div className="space-y-1 max-h-[250px] overflow-y-auto">
        {recentLogs.length === 0 ? (
          <div className="text-[11px] font-mono text-slate-600 text-center py-3">No activity</div>
        ) : (
          recentLogs.map((entry, i) => {
            const time = new Date(entry.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
            const agentConfig = AGENT_CONFIG[entry.agent as keyof typeof AGENT_CONFIG];
            return (
              <div key={`${entry.timestamp}-${i}`} className="flex items-start gap-2 px-2 py-1 rounded hover:bg-bg-primary/30 transition">
                <span className="text-[10px] font-mono text-slate-600 shrink-0 mt-0.5 tabular-nums">{time}</span>
                {agentConfig && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: agentConfig.color }}
                  />
                )}
                <span className="text-[11px] text-slate-400 leading-relaxed break-all">{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main Control View ──

export default function ControlView({ agents, tasks, logs }: ControlViewProps) {
  return (
    <div className="space-y-6">
      {/* Agent Control Grid */}
      <section>
        <h2 className="text-[13px] font-mono font-medium text-slate-400 uppercase tracking-[0.15em] mb-4">
          Agent Control
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {agents.map(agent => (
            <AgentControlCard key={agent.name} agent={agent} />
          ))}
        </div>
      </section>

      {/* Task Pipeline + Activity Feed */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TaskPipeline tasks={tasks} />
        <ActivityFeed logs={logs} />
      </section>
    </div>
  );
}
