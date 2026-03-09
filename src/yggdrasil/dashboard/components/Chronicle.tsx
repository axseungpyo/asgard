"use client";

import { useState, useMemo } from "react";
import type { Task, TaskStatus } from "../lib/types";
import { TASK_STATUS_CONFIG, AGENT_CONFIG } from "../lib/constants";

interface ChronicleProps {
  tasks: Task[];
  onDocClick: (type: "tp" | "rp", id: string) => void;
}

const agentConfig: Record<string, { color: string; label: string }> = {
  codex: { color: AGENT_CONFIG.brokkr.color, label: AGENT_CONFIG.brokkr.displayName },
  gemini: { color: AGENT_CONFIG.heimdall.color, label: AGENT_CONFIG.heimdall.displayName },
  odin: { color: AGENT_CONFIG.odin.color, label: AGENT_CONFIG.odin.displayName },
};

const STATUS_FILTERS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in-progress", label: "In Progress" },
  { value: "review-needed", label: "Review" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "draft", label: "Draft" },
];

export default function Chronicle({ tasks, onDocClick }: ChronicleProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.agent.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, search, statusFilter]);

  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="bg-bg-secondary border border-border/60 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <h2 className="text-[12px] font-mono font-medium text-slate-400 uppercase tracking-wider">Chronicle</h2>
        {tasks.length > 0 && (
          <span className="text-[12px] text-slate-500 font-mono">{doneTasks}/{tasks.length}</span>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-bg-secondary/50 border border-slate-700/50 rounded px-2 py-1 text-[12px] font-mono text-slate-300 placeholder-slate-500 outline-none focus:border-slate-500/60"
          />
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  statusFilter === f.value
                    ? "bg-slate-700 text-slate-200"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-1.5">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-[13px] font-mono">
              {tasks.length === 0 ? "No tasks recorded" : "No matching tasks"}
            </p>
          </div>
        ) : (
          <div className="space-y-px">
            {filteredTasks.map((task) => {
              const idNum = task.id.replace(/\D/g, "");
              const sc = TASK_STATUS_CONFIG[task.status];
              const ac = agentConfig[task.agent.toLowerCase()] ?? { color: "#a1a1aa", label: task.agent };

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-bg-tertiary/40 transition-colors group"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.status === "in-progress" ? "animate-pulse-dot" : ""}`}
                    style={{ backgroundColor: sc.color }}
                  />

                  <button
                    onClick={() => onDocClick("tp", idNum)}
                    className="text-[#67e8f9] hover:underline font-mono text-[12px] shrink-0"
                  >
                    {task.id}
                  </button>

                  <span className="text-[13px] text-slate-300 truncate flex-1">{task.title}</span>

                  <span className="text-[12px] font-mono shrink-0" style={{ color: ac.color }}>
                    {ac.label}
                  </span>

                  <span className="text-[12px] shrink-0 w-16 text-right font-mono" style={{ color: sc.color }}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
