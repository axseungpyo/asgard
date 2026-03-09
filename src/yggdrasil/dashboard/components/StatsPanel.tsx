"use client";

import { useMemo } from "react";
import type { MetricsResponse, Task } from "../lib/types";
import { AGENT_CONFIG, TASK_STATUS_CONFIG } from "../lib/constants";
import MetricsPanel from "./MetricsPanel";

interface StatsPanelProps {
  tasks: Task[];
  metrics: MetricsResponse | null;
}

const agentDisplayMap: Record<string, { label: string; color: string }> = {
  odin: { label: AGENT_CONFIG.odin.displayName, color: AGENT_CONFIG.odin.color },
  brokkr: { label: AGENT_CONFIG.brokkr.displayName, color: AGENT_CONFIG.brokkr.color },
  heimdall: { label: AGENT_CONFIG.heimdall.displayName, color: AGENT_CONFIG.heimdall.color },
  loki: { label: AGENT_CONFIG.loki.displayName, color: AGENT_CONFIG.loki.color },
  codex: { label: AGENT_CONFIG.brokkr.displayName, color: AGENT_CONFIG.brokkr.color },
  gemini: { label: AGENT_CONFIG.heimdall.displayName, color: AGENT_CONFIG.heimdall.color },
};

export default function StatsPanel({ tasks, metrics }: StatsPanelProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "done").length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    const byAgent = tasks.reduce<Record<string, number>>((acc, task) => {
      const key = task.agent.toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const byStatus = tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    }, {});

    return { total, completionRate, byAgent, byStatus };
  }, [tasks]);

  const maxAgentCount = Math.max(1, ...Object.values(stats.byAgent));
  const maxStatusCount = Math.max(1, ...Object.values(stats.byStatus));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatCard label="Total Tasks" value={String(stats.total)} />
        <StatCard label="Completion Rate" value={`${stats.completionRate}%`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="bg-bg-secondary border border-border/60 rounded-lg overflow-hidden">
          <PanelHeader title="Tasks by Agent" />
          <div className="p-4 space-y-3">
            {Object.entries(stats.byAgent).length === 0 ? (
              <EmptyState />
            ) : (
              Object.entries(stats.byAgent)
                .sort((a, b) => b[1] - a[1])
                .map(([agentKey, count]) => {
                  const agent =
                    agentDisplayMap[agentKey] ?? { label: agentKey, color: "#a1a1aa" };
                  return (
                    <BarRow
                      key={agentKey}
                      label={agent.label}
                      count={count}
                      max={maxAgentCount}
                      color={agent.color}
                    />
                  );
                })
            )}
          </div>
        </div>

        <div className="bg-bg-secondary border border-border/60 rounded-lg overflow-hidden">
          <PanelHeader title="Status Distribution" />
          <div className="p-4 space-y-3">
            {Object.entries(stats.byStatus).length === 0 ? (
              <EmptyState />
            ) : (
              Object.entries(stats.byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([statusKey, count]) => {
                  const status = TASK_STATUS_CONFIG[statusKey as keyof typeof TASK_STATUS_CONFIG];
                  return (
                    <BarRow
                      key={statusKey}
                      label={status.label}
                      count={count}
                      max={maxStatusCount}
                      color={status.color}
                    />
                  );
                })
            )}
          </div>
        </div>
      </div>

      <MetricsPanel metrics={metrics} />
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
      <h2 className="text-[12px] font-mono font-medium text-slate-400 uppercase tracking-wider">
        {title}
      </h2>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-secondary border border-border/60 rounded-lg p-4">
      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const width = `${(count / max) * 100}%`;

  return (
    <div className="grid grid-cols-[120px_1fr_auto] gap-3 items-center">
      <div className="text-[12px] font-mono text-slate-400 truncate">{label}</div>
      <div className="h-2.5 rounded-full bg-bg-primary/80 overflow-hidden">
        <div className="h-full rounded-full" style={{ width, backgroundColor: color }} />
      </div>
      <div className="text-[12px] font-mono text-slate-400 tabular-nums">{count}</div>
    </div>
  );
}

function EmptyState() {
  return <p className="text-slate-500 text-[13px] font-mono text-center py-8">No data</p>;
}
