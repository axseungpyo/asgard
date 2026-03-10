"use client";

import { useState, useEffect } from "react";

const STORAGE_PREFIX = "yggdrasil-api-key-";
const MCP_AGENTS_PREFIX = "yggdrasil-mcp-agents-";

const AGENTS = [
  { id: "odin", label: "Odin", color: "#d97757" },
  { id: "brokkr", label: "Brokkr", color: "#10a37f" },
  { id: "heimdall", label: "Heimdall", color: "#4285f4" },
  { id: "loki", label: "Loki", color: "#a855f7" },
];

const MCP_SERVERS = [
  { id: "mcp-github-token", label: "GitHub", placeholder: "ghp_...", hint: "repos, issues, PRs", icon: "GH" },
  { id: "mcp-notion-token", label: "Notion", placeholder: "ntn_...", hint: "페이지, 데이터베이스", icon: "N" },
  { id: "mcp-supabase-key", label: "Supabase", placeholder: "eyJ...", hint: "DB, Auth, Storage", icon: "SB" },
  { id: "mcp-slack-token", label: "Slack", placeholder: "xoxb-...", hint: "메시지, 채널", icon: "SL" },
  { id: "mcp-custom-key", label: "Custom MCP", placeholder: "...", hint: "기타 MCP 서버", icon: "?" },
];

const defaultAgentAccess = () =>
  Object.fromEntries(AGENTS.map((a) => [a.id, true])) as Record<string, boolean>;

function Toggle({ checked, onChange, size = "md" }: { checked: boolean; onChange: (v: boolean) => void; size?: "sm" | "md" }) {
  const w = size === "sm" ? "w-8 h-4" : "w-10 h-5";
  const dot = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative ${w} rounded-full transition-colors shrink-0 ${
        checked ? "bg-emerald-500" : "bg-slate-600"
      }`}
    >
      <span
        className={`block ${dot} rounded-full bg-white transition-transform absolute top-0.5 ${
          checked ? translate : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function McpPanel() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [agentAccess, setAgentAccess] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadedKeys: Record<string, string> = {};
    const loadedEnabled: Record<string, boolean> = {};
    const loadedAgents: Record<string, Record<string, boolean>> = {};
    for (const server of MCP_SERVERS) {
      const val = localStorage.getItem(`${STORAGE_PREFIX}${server.id}`) || "";
      loadedKeys[server.id] = val;
      loadedEnabled[server.id] = !!val;
      try {
        const agents = JSON.parse(localStorage.getItem(`${MCP_AGENTS_PREFIX}${server.id}`) || "null");
        loadedAgents[server.id] = agents || defaultAgentAccess();
      } catch {
        loadedAgents[server.id] = defaultAgentAccess();
      }
    }
    setKeys(loadedKeys);
    setEnabled(loadedEnabled);
    setAgentAccess(loadedAgents);
  }, []);

  const handleSave = () => {
    for (const server of MCP_SERVERS) {
      const val = keys[server.id] || "";
      if (val) localStorage.setItem(`${STORAGE_PREFIX}${server.id}`, val);
      else localStorage.removeItem(`${STORAGE_PREFIX}${server.id}`);
      localStorage.setItem(`${MCP_AGENTS_PREFIX}${server.id}`, JSON.stringify(agentAccess[server.id] || defaultAgentAccess()));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleAgent = (serverId: string, agentId: string) => {
    setAgentAccess((prev) => ({
      ...prev,
      [serverId]: {
        ...(prev[serverId] || defaultAgentAccess()),
        [agentId]: !(prev[serverId]?.[agentId] ?? true),
      },
    }));
  };

  const connectedCount = MCP_SERVERS.filter((s) => keys[s.id]).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-mono font-medium text-slate-400 uppercase tracking-[0.15em]">
            MCP Servers
          </h2>
          <p className="text-[12px] text-slate-500 mt-1">
            Model Context Protocol 서버 연결 및 에이전트 접근 권한을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-500">
            {connectedCount}/{MCP_SERVERS.length} connected
          </span>
          <button
            onClick={handleSave}
            className="rounded-lg border border-slate-700 bg-slate-100 px-4 py-1.5 text-[12px] font-medium text-slate-950 transition hover:bg-white"
          >
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Server List */}
      <div className="bg-bg-secondary border border-border/60 rounded-lg overflow-hidden divide-y divide-border/40">
        {MCP_SERVERS.map((server) => {
          const isEnabled = enabled[server.id] ?? false;
          const hasKey = !!keys[server.id];
          const isExpanded = expandedId === server.id;
          const access = agentAccess[server.id] || defaultAgentAccess();
          const activeAgents = AGENTS.filter((a) => access[a.id]);

          return (
            <div key={server.id}>
              {/* Row */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : server.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId(isExpanded ? null : server.id); } }}
                className="flex items-center gap-4 px-4 py-3 hover:bg-bg-tertiary/30 transition-colors cursor-pointer select-none"
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                  hasKey ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700/50 text-slate-400"
                }`}>
                  {server.icon}
                </div>

                {/* Label */}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-mono text-slate-200">{server.label}</div>
                  <div className="text-[10px] text-slate-500">{server.hint}</div>
                </div>

                {/* Agent dots */}
                <div className="flex items-center gap-1 shrink-0">
                  {activeAgents.map((a) => (
                    <div
                      key={a.id}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: a.color, opacity: hasKey ? 1 : 0.3 }}
                      title={a.label}
                    />
                  ))}
                </div>

                {/* Status */}
                {hasKey && (
                  <span className="shrink-0 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    connected
                  </span>
                )}

                {/* Toggle */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Toggle checked={isEnabled} onChange={(v) => {
                    setEnabled((prev) => ({ ...prev, [server.id]: v }));
                    if (v) setExpandedId(server.id);
                  }} />
                </div>

                {/* Chevron */}
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-4 pb-4 bg-bg-primary/50 border-t border-border/40">
                  <div className="pt-3 space-y-4">
                    {/* Token Input */}
                    {isEnabled && (
                      <div>
                        <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Token</label>
                        <input
                          type="password"
                          value={keys[server.id] || ""}
                          onChange={(e) => setKeys((prev) => ({ ...prev, [server.id]: e.target.value }))}
                          placeholder={server.placeholder}
                          className="mt-1 w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500 font-mono"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                    )}

                    {/* Agent Access Control */}
                    <div>
                      <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Agent Access</label>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {AGENTS.map((agent) => {
                          const allowed = access[agent.id] ?? true;
                          return (
                            <button
                              key={agent.id}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleAgent(server.id, agent.id); }}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition ${
                                allowed
                                  ? "border-slate-500/40 bg-bg-secondary"
                                  : "border-border bg-bg-primary opacity-40"
                              }`}
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: agent.color }}
                              />
                              <span className="text-[12px] font-mono text-slate-300">{agent.label}</span>
                              <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                                <Toggle size="sm" checked={allowed} onChange={() => toggleAgent(server.id, agent.id)} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
