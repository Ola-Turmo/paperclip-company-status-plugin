import { useMemo, useState, useCallback, useEffect } from "react";
import { usePluginData, usePluginAction, type PluginPageProps } from "@paperclipai/plugin-sdk/ui";
import { DATA_KEYS, ACTION_KEYS } from "../constants.js";
import type { CompanyStatusOverview, TopBlocker, AgentStatus, HealthBadge } from "../types.js";

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 20,
  maxWidth: 1200,
  margin: "0 auto",
  padding: "24px 16px",
};

const heroStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 24,
  padding: 28,
  background: "linear-gradient(135deg, color-mix(in srgb, var(--card) 88%, #16a34a 12%), color-mix(in srgb, var(--card) 90%, #2563eb 10%))",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 18,
  padding: 20,
  background: "var(--card)",
  minWidth: 0,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 14,
};

const mutedStyle: React.CSSProperties = {
  color: "var(--muted-foreground)",
  fontSize: 12,
  lineHeight: 1.45,
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "8px 14px",
  background: "var(--background)",
  color: "inherit",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "#ef4444",
  color: "#ef4444",
};

const successButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: "#22c55e",
  color: "#22c55e",
};

function tone(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 70) return { label: "Healthy", color: "#22c55e", bg: "rgba(34,197,94,.12)", border: "rgba(34,197,94,.35)" };
  if (score >= 40) return { label: "Watch", color: "#f59e0b", bg: "rgba(245,158,11,.14)", border: "rgba(245,158,11,.35)" };
  return { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,.14)", border: "rgba(239,68,68,.35)" };
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ opacity: 0.7 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ label, value, hint, trend }: { label: string; value: string | number; hint?: string; trend?: number[] }) {
  return (
    <div style={cardStyle}>
      <div style={mutedStyle}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 6, lineHeight: 1.1 }}>{value}</div>
      {hint ? <div style={{ ...mutedStyle, marginTop: 4 }}>{hint}</div> : null}
      {trend && trend.length > 1 ? <div style={{ marginTop: 8 }}><Sparkline data={trend} color="#2563eb" /></div> : null}
    </div>
  );
}

function HealthScoreHero({ score, label, color, bg, border }: { score: number; label: string; color: string; bg: string; border: string }) {
  const circumference = 2 * Math.PI * 52;
  const dashoffset = circumference * (1 - score / 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: 112, height: 112, flexShrink: 0 }}>
        <svg width={112} height={112} viewBox="0 0 112 112">
          <circle cx={56} cy={56} r={52} fill="none" stroke="var(--border)" strokeWidth={6} />
          <circle cx={56} cy={56} r={52} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashoffset} transform="rotate(-90 56 56)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color }}>
          {score}
        </div>
      </div>
      <div style={{ border: `1px solid ${border}`, color, background: bg, borderRadius: 999, padding: "8px 14px", fontWeight: 800, fontSize: 14 }}>
        {label}
      </div>
    </div>
  );
}

function AgentRow({ agent }: { agent: AgentStatus }) {
  const statusColor = agent.status === "active" || agent.status === "running" ? "#22c55e" : agent.status === "paused" ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.name}</div>
          <div style={{ ...mutedStyle, fontSize: 11 }}>{agent.role} • {agent.runs7d} runs/7d</div>
        </div>
      </div>
      <div style={{ ...mutedStyle, fontSize: 11, flexShrink: 0, textAlign: "right" }}>
        {agent.isStale ? <span style={{ color: "#ef4444" }}>Stale</span> : <span style={{ color: "#22c55e" }}>Fresh</span>}
      </div>
    </div>
  );
}

function BlockerRow({ blocker }: { blocker: TopBlocker }) {
  return (
    <div style={{ display: "grid", gap: 3, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 13 }}>{blocker.issueKey}</strong>
        {blocker.priority ? <span style={{ ...mutedStyle, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{blocker.priority}</span> : null}
      </div>
      <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{blocker.title}</span>
      <span style={{ ...mutedStyle, fontSize: 11 }}>{blocker.ageDays}d old</span>
    </div>
  );
}

export function CompanyStatusPage({ context }: PluginPageProps) {
  const [nonce, setNonce] = useState(0);
  const params = useMemo(() => ({ companyId: context.companyId ?? "", nonce }), [context.companyId, nonce]);
  const { data, loading, error, refresh } = usePluginData<CompanyStatusOverview>(DATA_KEYS.overview, params);
  const refreshAction = usePluginAction(ACTION_KEYS.refresh);
  const pauseAction = usePluginAction(ACTION_KEYS.pauseAgent);
  const resumeAction = usePluginAction(ACTION_KEYS.resumeAgent);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setNonce((n) => n + 1);
    try { await (refreshAction as unknown as (p: { companyId: string }) => Promise<unknown>)({ companyId: context.companyId ?? "" }); } catch { /* ignore */ }
    setRefreshing(false);
  }, [refreshAction, context.companyId]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(() => { setNonce((n) => n + 1); }, 60000);
    return () => clearInterval(id);
  }, []);

  if (!context.companyId) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Select a company</div>
          <div style={mutedStyle}>Choose a company from the sidebar to view its status intelligence.</div>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Loading status intelligence…</div>
          <div style={mutedStyle}> crunching health scores, agent freshness, and blocker analysis.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, borderColor: "#ef4444", background: "rgba(239,68,68,.06)", padding: 24 }}>
          <div style={{ fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>Status plugin error</div>
          <div style={{ fontSize: 13 }}>{error.message}</div>
          <button style={{ ...buttonStyle, marginTop: 16 }} onClick={handleRefresh}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>No status data</div>
          <button style={{ ...buttonStyle, marginTop: 16 }} onClick={handleRefresh}>Refresh</button>
        </div>
      </div>
    );
  }

  const t = tone(data.healthScore);

  return (
    <main style={pageStyle}>
      {/* Hero */}
      <section style={heroStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...mutedStyle, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 600, fontSize: 10 }}>
              {data.issuePrefix} — Company Status
            </div>
            <h1 style={{ margin: "8px 0 6px", fontSize: 34, lineHeight: 1.05, fontWeight: 900 }}>{data.companyName}</h1>
            <p style={{ ...mutedStyle, maxWidth: 680, fontSize: 14 }}>
              Health, blockers, agent freshness, loop risk, and next best action in one operator-readable page.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button style={buttonStyle} onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 22, flexWrap: "wrap" }}>
          <HealthScoreHero score={data.healthScore} label={t.label} color={t.color} bg={t.bg} border={t.border} />
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Refreshed {new Date(data.refreshedAt).toLocaleString()}
            </div>
            {data.websiteStatus !== null ? (
              <div style={{ fontSize: 13, color: data.websiteHealthy ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                Website: {data.websiteHealthy ? "✅ Healthy" : "❌ Down"} {data.websiteStatus ? `(${data.websiteStatus})` : ""}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section style={gridStyle}>
        <MetricCard label="Open" value={data.openIssues} hint="backlog + todo" />
        <MetricCard label="In Progress" value={data.inProgressIssues} />
        <MetricCard label="In Review" value={data.inReviewIssues} />
        <MetricCard label="Blocked" value={data.blockedIssues} hint={data.blockedIssues ? "Needs intervention" : "Clear"} />
        <MetricCard label="Done" value={data.doneIssues} />
        <MetricCard label="Agents" value={`${data.activeAgents}/${data.activeAgents + data.staleAgents}`} hint="active / total" />
      </section>

      {/* Recommendation + Loop Alert */}
      <section style={{ ...cardStyle, display: "grid", gap: 12, borderLeft: `4px solid ${t.color}` }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Next best action</div>
        <div style={{ fontSize: 14, lineHeight: 1.55 }}>{data.recommendation}</div>
        {data.loopDetected ? (
          <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            Loop risk detected: {data.loopAgentName ?? "Unknown agent"} — {data.loopRuns7d ?? "?"} runs in 7 days
          </div>
        ) : null}
      </section>

      {/* Top Blockers + Agents */}
      <section style={{ ...gridStyle, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Top blockers</div>
            {data.blockedIssues > 5 ? <div style={{ ...mutedStyle, fontSize: 11 }}>{data.blockedIssues} total</div> : null}
          </div>
          {data.topBlockers.length === 0 ? (
            <div style={{ ...mutedStyle, padding: "16px 0" }}>No blocked issues. Smooth sailing.</div>
          ) : (
            data.topBlockers.map((b) => <BlockerRow key={b.issueKey} blocker={b} />)
          )}
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Agents</div>
            <div style={{ ...mutedStyle, fontSize: 11 }}>{data.staleAgents} stale</div>
          </div>
          {data.activeAgentList.length === 0 ? (
            <div style={{ ...mutedStyle, padding: "16px 0" }}>No agents registered.</div>
          ) : (
            data.activeAgentList.map((a) => <AgentRow key={a.id} agent={a} />)
          )}
        </div>
      </section>

      {/* Footer */}
      <div style={{ ...mutedStyle, textAlign: "center", padding: "8px 0" }}>
        Status Intelligence v1.0.0 • Powered by Paperclip
      </div>
    </main>
  );
}

export default CompanyStatusPage;
