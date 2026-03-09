"use client";

import type { Task } from "../lib/types";
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

export default function Chronicle({ tasks, onDocClick }: ChronicleProps) {
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="bg-bg-secondary border border-zinc-500/60 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
        <h2 className="text-[12px] font-mono font-medium text-zinc-400 uppercase tracking-wider">Chronicle</h2>
        {tasks.length > 0 && (
          <span className="text-[12px] text-zinc-600 font-mono">{doneTasks}/{tasks.length}</span>
        )}
      </div>

      <div className="p-1.5">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-700 text-[13px] font-mono">No tasks recorded</p>
          </div>
        ) : (
          <div className="space-y-px">
            {tasks.map((task) => {
              const idNum = task.id.replace(/\D/g, "");
              const sc = TASK_STATUS_CONFIG[task.status];
              const ac = agentConfig[task.agent.toLowerCase()] ?? { color: "#a1a1aa", label: task.agent };

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-800/40 transition-colors group"
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

                  <span className="text-[13px] text-zinc-300 truncate flex-1">{task.title}</span>

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
