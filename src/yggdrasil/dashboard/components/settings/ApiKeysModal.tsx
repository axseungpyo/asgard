"use client";

import { useState, useEffect } from "react";
import { getStoredTheme, applyTheme, type ThemeMode } from "../../lib/theme";

// ── Constants ──

const API_KEY_FIELDS: {
  id: string;
  label: string;
  placeholder: string;
  group: string;
  hint: string;
}[] = [
  // Major AI Providers
  { id: "openai-api-key", label: "OpenAI", placeholder: "sk-proj-...", group: "AI Providers", hint: "GPT-5.4, GPT-5.3 Codex, DALL-E 4" },
  { id: "anthropic-api-key", label: "Anthropic", placeholder: "sk-ant-...", group: "AI Providers", hint: "Claude Opus 4.6, Sonnet 4.6, Haiku 4.5" },
  { id: "google-api-key", label: "Google AI", placeholder: "AIza...", group: "AI Providers", hint: "Gemini 3.1 Pro, Flash, Imagen 4 · Loki 공용" },
  { id: "moonshot-api-key", label: "Moonshot (Kimi)", placeholder: "sk-...", group: "AI Providers", hint: "Kimi K2.5 (1T params, Agent Swarm)" },
  { id: "zhipu-api-key", label: "Zhipu AI (GLM)", placeholder: "...", group: "AI Providers", hint: "GLM-5 (744B MoE, Ascend 전용)" },
  { id: "deepseek-api-key", label: "DeepSeek", placeholder: "sk-...", group: "AI Providers", hint: "DeepSeek V4 (멀티모달), Reasoner" },
  { id: "groq-api-key", label: "Groq", placeholder: "gsk_...", group: "AI Providers", hint: "Llama 4, Compound AI (LPU 추론)" },
  { id: "mistral-api-key", label: "Mistral", placeholder: "...", group: "AI Providers", hint: "Mistral Large 3 (675B MoE), Medium 3" },
  { id: "xai-api-key", label: "xAI", placeholder: "xai-...", group: "AI Providers", hint: "Grok 3" },
  // Gateways
  { id: "openrouter-api-key", label: "OpenRouter", placeholder: "sk-or-...", group: "Gateways", hint: "200+ 모델 통합 라우팅" },
  { id: "together-api-key", label: "Together AI", placeholder: "...", group: "Gateways", hint: "오픈소스 모델 호스팅" },
  // Custom
  { id: "custom-api-key", label: "Custom API", placeholder: "API key...", group: "Custom", hint: "기타 서비스용 키" },
];

const STORAGE_PREFIX = "yggdrasil-api-key-";

const PREF = {
  theme: "yggdrasil-theme",
  fontSize: "yggdrasil-pref-font-size",
  serverUrl: "yggdrasil-pref-server-url",
  refreshInterval: "yggdrasil-pref-refresh-interval",
  logBufferSize: "yggdrasil-pref-log-buffer",
  notifications: "yggdrasil-pref-notifications",
  notifyAgents: "yggdrasil-pref-notify-agents",
  notifyOnComplete: "yggdrasil-pref-notify-complete",
  notifyOnBlocked: "yggdrasil-pref-notify-blocked",
  notifyOnError: "yggdrasil-pref-notify-error",
} as const;

const AGENTS = [
  { id: "odin", label: "Odin", color: "#d97757" },
  { id: "brokkr", label: "Brokkr", color: "#10a37f" },
  { id: "heimdall", label: "Heimdall", color: "#4285f4" },
  { id: "loki", label: "Loki", color: "#a855f7" },
];

type SettingsTab = "appearance" | "notifications" | "connection" | "keys";

interface ApiKeysModalProps {
  onClose: () => void;
}

// ── Toggle Switch ──

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
        checked ? "bg-emerald-500" : "bg-slate-600"
      }`}
    >
      <span
        className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ── Section helpers ──

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3">
      {children}
    </div>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-bg-secondary px-4 py-3">
      {children}
    </div>
  );
}

function SettingLabel({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <div className="text-[13px] font-mono text-slate-200">{title}</div>
      <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500 font-mono mt-2"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Main Component ──

export default function ApiKeysModal({ onClose }: ApiKeysModalProps) {
  const [tab, setTab] = useState<SettingsTab>("appearance");
  const [saved, setSaved] = useState(false);

  // API Keys
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [enabledProviders, setEnabledProviders] = useState<Record<string, boolean>>({});

  // Appearance
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [fontSize, setFontSize] = useState("13");

  // Connection
  const [serverUrl, setServerUrl] = useState("http://localhost:7777");
  const [authToken, setAuthToken] = useState("");
  const [refreshInterval, setRefreshInterval] = useState("30");
  const [logBufferSize, setLogBufferSize] = useState("200");

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [notifyOnBlocked, setNotifyOnBlocked] = useState(true);
  const [notifyOnError, setNotifyOnError] = useState(true);
  const [agentNotify, setAgentNotify] = useState<Record<string, boolean>>({
    odin: true, brokkr: true, heimdall: true, loki: true,
  });

  // Load
  useEffect(() => {
    // API keys
    const loaded: Record<string, string> = {};
    const enabled: Record<string, boolean> = {};
    for (const field of API_KEY_FIELDS) {
      const val = localStorage.getItem(`${STORAGE_PREFIX}${field.id}`) || "";
      loaded[field.id] = val;
      enabled[field.id] = !!val;
    }
    setKeys(loaded);
    setEnabledProviders(enabled);

    // Appearance
    setTheme(getStoredTheme());
    setFontSize(localStorage.getItem(PREF.fontSize) || "13");

    // Connection
    setServerUrl(localStorage.getItem(PREF.serverUrl) || "http://localhost:7777");
    setAuthToken(localStorage.getItem("yggdrasil-auth-token") || "");
    setRefreshInterval(localStorage.getItem(PREF.refreshInterval) || "30");
    setLogBufferSize(localStorage.getItem(PREF.logBufferSize) || "200");

    // Notifications
    setNotificationsEnabled(localStorage.getItem(PREF.notifications) !== "false");
    setNotifyOnComplete(localStorage.getItem(PREF.notifyOnComplete) !== "false");
    setNotifyOnBlocked(localStorage.getItem(PREF.notifyOnBlocked) !== "false");
    setNotifyOnError(localStorage.getItem(PREF.notifyOnError) !== "false");
    try {
      const agents = JSON.parse(localStorage.getItem(PREF.notifyAgents) || "{}");
      setAgentNotify({ odin: true, brokkr: true, heimdall: true, loki: true, ...agents });
    } catch { /* use defaults */ }
  }, []);

  // ESC close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Theme live preview
  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Font size live preview
  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    document.documentElement.style.setProperty("--ygg-font-size", `${size}px`);
  };

  // Save
  const handleSave = () => {
    // API keys
    for (const field of API_KEY_FIELDS) {
      const val = keys[field.id] || "";
      if (val) localStorage.setItem(`${STORAGE_PREFIX}${field.id}`, val);
      else localStorage.removeItem(`${STORAGE_PREFIX}${field.id}`);
    }

    // Appearance
    localStorage.setItem(PREF.theme, theme);
    localStorage.setItem(PREF.fontSize, fontSize);

    // Connection
    localStorage.setItem(PREF.serverUrl, serverUrl);
    localStorage.setItem(PREF.refreshInterval, refreshInterval);
    localStorage.setItem(PREF.logBufferSize, logBufferSize);

    // Notifications
    localStorage.setItem(PREF.notifications, String(notificationsEnabled));
    localStorage.setItem(PREF.notifyOnComplete, String(notifyOnComplete));
    localStorage.setItem(PREF.notifyOnBlocked, String(notifyOnBlocked));
    localStorage.setItem(PREF.notifyOnError, String(notifyOnError));
    localStorage.setItem(PREF.notifyAgents, JSON.stringify(agentNotify));

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Clear auth
  const handleClearToken = () => {
    setAuthToken("");
    localStorage.removeItem("yggdrasil-auth-token");
  };

  const configuredKeyCount = API_KEY_FIELDS.filter((f) => keys[f.id]).length;

  const tabs: { id: SettingsTab; label: string; badge?: number }[] = [
    { id: "appearance", label: "Appearance" },
    { id: "notifications", label: "Notifications" },
    { id: "connection", label: "Connection" },
    { id: "keys", label: "API Keys", badge: configuredKeyCount || undefined },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-bg-primary/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-primary p-6 shadow-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-slate-400">Yggdrasil</div>
              <h2 className="mt-1 text-lg font-mono text-slate-100">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-bg-secondary transition text-xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-border/60 shrink-0 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-[12px] font-mono border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? "border-slate-300 text-slate-200" : "border-transparent text-slate-500 hover:text-slate-400"
                }`}
              >
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto mt-4 min-h-0 space-y-5">

            {/* ─── Appearance ─── */}
            {tab === "appearance" && (
              <>
                {/* Theme */}
                <div>
                  <SectionTitle>Theme</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    {(["dark", "light"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => handleThemeChange(t)}
                        className={`rounded-lg border px-4 py-3 text-left transition ${
                          theme === t
                            ? "border-slate-400 bg-bg-secondary"
                            : "border-border hover:border-slate-600 bg-bg-primary"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            theme === t ? "border-emerald-400" : "border-slate-600"
                          }`}>
                            {theme === t && <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}
                          </div>
                          <div>
                            <div className="text-[13px] font-mono text-slate-200 capitalize">{t}</div>
                            <div className="text-[10px] text-slate-500">
                              {t === "dark" ? "Night Sky theme" : "Warm Canvas theme"}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <SectionTitle>Font Size</SectionTitle>
                  <SettingCard>
                    <SettingLabel title="Terminal & Log Font Size" desc="터미널, 로그, 코드 영역의 글꼴 크기" />
                    <div className="flex items-center gap-2 mt-3">
                      {[
                        { value: "11", label: "S" },
                        { value: "13", label: "M" },
                        { value: "15", label: "L" },
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleFontSizeChange(s.value)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-center font-mono transition ${
                            fontSize === s.value
                              ? "border-slate-400 bg-bg-primary text-slate-200"
                              : "border-border text-slate-500 hover:text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          <div className="text-[13px]">{s.label}</div>
                          <div className="text-[10px] mt-0.5">{s.value}px</div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 rounded border border-border bg-bg-primary px-3 py-2">
                      <code className="text-slate-400" style={{ fontSize: `${fontSize}px` }}>
                        Preview: const agent = &quot;Odin&quot;;
                      </code>
                    </div>
                  </SettingCard>
                </div>
              </>
            )}

            {/* ─── Notifications ─── */}
            {tab === "notifications" && (
              <>
                {/* Master Toggle */}
                <div>
                  <SectionTitle>General</SectionTitle>
                  <SettingCard>
                    <div className="flex items-center justify-between gap-3">
                      <SettingLabel title="Browser Notifications" desc="모든 알림을 활성화/비활성화합니다." />
                      <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} />
                    </div>
                  </SettingCard>
                </div>

                {/* Event Types */}
                <div className={notificationsEnabled ? "" : "opacity-40 pointer-events-none"}>
                  <SectionTitle>Event Types</SectionTitle>
                  <SettingCard>
                    <div className="space-y-3">
                      {[
                        { label: "Task Complete", desc: "에이전트 작업 완료 시", checked: notifyOnComplete, set: setNotifyOnComplete },
                        { label: "Blocked", desc: "에이전트 작업 중단 시", checked: notifyOnBlocked, set: setNotifyOnBlocked },
                        { label: "Error", desc: "에러 발생 시", checked: notifyOnError, set: setNotifyOnError },
                      ].map((evt) => (
                        <div key={evt.label} className="flex items-center justify-between gap-3">
                          <SettingLabel title={evt.label} desc={evt.desc} />
                          <Toggle checked={evt.checked} onChange={evt.set} />
                        </div>
                      ))}
                    </div>
                  </SettingCard>
                </div>

                {/* Per-Agent */}
                <div className={notificationsEnabled ? "" : "opacity-40 pointer-events-none"}>
                  <SectionTitle>Per Agent</SectionTitle>
                  <SettingCard>
                    <div className="space-y-3">
                      {AGENTS.map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: agent.color }} />
                            <span className="text-[13px] font-mono text-slate-200">{agent.label}</span>
                          </div>
                          <Toggle
                            checked={agentNotify[agent.id] ?? true}
                            onChange={(v) => setAgentNotify((prev) => ({ ...prev, [agent.id]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                  </SettingCard>
                </div>
              </>
            )}

            {/* ─── Connection ─── */}
            {tab === "connection" && (
              <>
                {/* Server */}
                <div>
                  <SectionTitle>Server</SectionTitle>
                  <SettingCard>
                    <SettingLabel title="Server URL" desc="Yggdrasil 서버 주소" />
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://localhost:7777"
                      className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500 font-mono mt-2"
                    />
                  </SettingCard>
                </div>

                {/* Auth Token */}
                <div>
                  <SectionTitle>Authentication</SectionTitle>
                  <SettingCard>
                    <SettingLabel title="Access Token" desc="현재 저장된 인증 토큰" />
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="password"
                        value={authToken}
                        onChange={(e) => setAuthToken(e.target.value)}
                        placeholder="No token stored"
                        className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500 font-mono"
                      />
                      {authToken && (
                        <button
                          onClick={handleClearToken}
                          className="shrink-0 rounded-lg border border-red-500/30 px-3 py-2 text-[12px] font-mono text-red-400 hover:bg-red-500/10 transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </SettingCard>
                </div>

                {/* Data */}
                <div>
                  <SectionTitle>Data</SectionTitle>
                  <div className="space-y-3">
                    <SettingCard>
                      <SettingLabel title="Auto-refresh Interval" desc="REST 데이터 새로고침 주기 (WebSocket 외)" />
                      <SelectField
                        value={refreshInterval}
                        onChange={setRefreshInterval}
                        options={[
                          { value: "15", label: "15s" },
                          { value: "30", label: "30s (default)" },
                          { value: "60", label: "60s" },
                          { value: "120", label: "2m" },
                          { value: "0", label: "Manual only" },
                        ]}
                      />
                    </SettingCard>
                    <SettingCard>
                      <SettingLabel title="Log Buffer Size" desc="메모리에 보관할 최대 로그 수" />
                      <SelectField
                        value={logBufferSize}
                        onChange={setLogBufferSize}
                        options={[
                          { value: "100", label: "100" },
                          { value: "200", label: "200 (default)" },
                          { value: "500", label: "500" },
                          { value: "1000", label: "1000" },
                        ]}
                      />
                    </SettingCard>
                  </div>
                </div>
              </>
            )}

            {/* ─── API Keys ─── */}
            {tab === "keys" && (
              <>
                <p className="text-[12px] leading-5 text-slate-400">
                  사용할 프로바이더를 활성화하고 API 키를 입력하세요. 브라우저에만 저장됩니다.
                </p>
                {[...new Set(API_KEY_FIELDS.map((f) => f.group))].map((group) => (
                  <div key={group}>
                    <SectionTitle>{group}</SectionTitle>
                    <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                      {API_KEY_FIELDS.filter((f) => f.group === group).map((field) => {
                        const enabled = enabledProviders[field.id] ?? false;
                        const hasKey = !!keys[field.id];
                        return (
                          <div key={field.id}>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setEnabledProviders((prev) => ({ ...prev, [field.id]: !prev[field.id] }))}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEnabledProviders((prev) => ({ ...prev, [field.id]: !prev[field.id] })); } }}
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-secondary/50 transition cursor-pointer select-none"
                            >
                              <div className="min-w-0">
                                <div className="text-[13px] font-mono text-slate-200">{field.label}</div>
                                <div className="text-[10px] text-slate-500 truncate">{field.hint}</div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {hasKey && (
                                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    configured
                                  </span>
                                )}
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Toggle checked={enabled} onChange={(v) => setEnabledProviders((prev) => ({ ...prev, [field.id]: v }))} />
                                </div>
                              </div>
                            </div>
                            {enabled && (
                              <div className="px-4 pb-3">
                                <input
                                  type="password"
                                  value={keys[field.id] || ""}
                                  onChange={(e) => setKeys((prev) => ({ ...prev, [field.id]: e.target.value }))}
                                  placeholder={field.placeholder}
                                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500 font-mono"
                                  autoFocus
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 pt-4 border-t border-border/40 mt-4">
            {saved && (
              <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-300 font-mono">
                Settings saved.
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white"
              >
                Save
              </button>
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-slate-400 transition hover:text-slate-200 hover:border-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
