"use client";

import type { ReactNode } from "react";
import type { MetricsResponse } from "../../lib/types";
import { AGENT_CONFIG } from "../../lib/constants";

interface MetricsPanelProps {
  metrics: MetricsResponse | null;
}

const agentDisplayMap: Record<string, { label: string; color: string }> = {
  brokkr: { label: AGENT_CONFIG.brokkr.displayName, color: AGENT_CONFIG.brokkr.color },
  heimdall: { label: AGENT_CONFIG.heimdall.displayName, color: AGENT_CONFIG.heimdall.color },
  odin: { label: AGENT_CONFIG.odin.displayName, color: AGENT_CONFIG.odin.color },
  loki: { label: AGENT_CONFIG.loki.displayName, color: AGENT_CONFIG.loki.color },
};

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  if (!metrics) {
    return (
      <div className="bg-bg-secondary border border-border/60 rounded-lg p-4">
        <p className="text-slate-400 text-[13px] font-mono">Loading metrics...</p>
      </div>
    );
  }

  const dailyMax = Math.max(1, ...metrics.daily.map((day) => day.count));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <PanelCard title="Agent Success Rate">
          {metrics.agents.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {metrics.agents.map((agent) => {
                const display = agentDisplayMap[agent.name] ?? {
                  label: agent.name,
                  color: "#71717a",
                };
                return (
                  <div key={agent.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-[12px] font-mono">
                      <span className="text-slate-400">{display.label}</span>
                      <span className="text-slate-400">
                        {agent.successRate}% · avg {formatDuration(agent.avgDuration)}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-bg-primary/80 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${agent.successRate}%`,
                          backgroundColor: display.color,
                        }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      total {agent.totalTasks} / completed {agent.completed} / blocked {agent.blocked}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>

        <PanelCard title="Daily TP Completion">
          {metrics.daily.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-2 h-28">
                {metrics.daily.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-slate-200/90 to-slate-500/70"
                        style={{ height: `${Math.max(12, (day.count / dailyMax) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate w-full text-center">
                      {day.date.slice(5)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                {metrics.daily.map((day) => (
                  <div key={day.date} className="flex items-center justify-between gap-3">
                    <span>{day.date}</span>
                    <span>{day.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PanelCard>
      </div>

      <PanelCard title="Recent Executions">
        {metrics.recentExecutions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[12px] font-mono">
              <thead className="text-slate-500">
                <tr className="border-b border-border/70">
                  <th className="py-2 pr-4 font-medium">Agent</th>
                  <th className="py-2 pr-4 font-medium">TP</th>
                  <th className="py-2 pr-4 font-medium">Duration</th>
                  <th className="py-2 pr-4 font-medium">Result</th>
                  <th className="py-2 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentExecutions.map((execution) => (
                  <tr key={`${execution.timestamp}-${execution.agent}-${execution.tp}`} className="border-b border-bg-primary/80 last:border-b-0">
                    <td className="py-2 pr-4 text-slate-400">
                      {(agentDisplayMap[execution.agent] ?? { label: execution.agent }).label}
                    </td>
                    <td className="py-2 pr-4 text-slate-300">{execution.tp}</td>
                    <td className="py-2 pr-4 text-slate-400">{formatDuration(execution.duration)}</td>
                    <td className={`py-2 pr-4 uppercase ${execution.result === "done" ? "text-lime-400" : "text-rose-400"}`}>
                      {execution.result}
                    </td>
                    <td className="py-2 text-slate-400">{execution.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

function PanelCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-bg-secondary border border-border/60 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <h2 className="text-[12px] font-mono font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState() {
  return <p className="text-slate-500 text-[13px] font-mono text-center py-8">No data</p>;
}

function formatDuration(duration: number): string {
  if (duration < 60) return `${duration}s`;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}m ${seconds}s`;
}
