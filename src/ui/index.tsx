import { useMemo, useState, type CSSProperties } from "react";
import { usePluginData, type PluginPageProps } from "@paperclipai/plugin-sdk/ui";
import { DATA_KEYS } from "../constants.js";

type Overview = {
  companyId: string;
  companyName: string;
  issuePrefix: string;
  healthScore: number;
  healthBadge: "healthy" | "warning" | "critical";
  openIssues: number;
  blockedIssues: number;
  doneIssues: number;
  activeAgents: number;
  staleAgents: number;
  loopDetected: boolean;
  loopAgentName: string | null;
  loopRuns7d: number | null;
  topBlockers: Array<{ issueKey: string; title: string; ageDays: number }>;
  activeAgentList: Array<{ name: string; status: string; lastHeartbeatAt: string | null }>;
  refreshedAt: string;
};

const page: CSSProperties = { display: "grid", gap: 18, maxWidth: 1120, margin: "0 auto", padding: "24px 4px" };
const hero: CSSProperties = { border: "1px solid var(--border)", borderRadius: 20, padding: 22, background: "linear-gradient(135deg, color-mix(in srgb, var(--card) 86%, #16a34a 14%), color-mix(in srgb, var(--card) 88%, #2563eb 12%))" };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 };
const card: CSSProperties = { border: "1px solid var(--border)", borderRadius: 16, padding: 16, background: "var(--card)", minWidth: 0 };
const muted: CSSProperties = { color: "var(--muted-foreground)", fontSize: 12, lineHeight: 1.45 };
const button: CSSProperties = { border: "1px solid var(--border)", borderRadius: 999, padding: "8px 12px", background: "var(--background)", color: "inherit", cursor: "pointer" };

function tone(score: number): { label: string; color: string; bg: string } {
  if (score >= 70) return { label: "Healthy", color: "#22c55e", bg: "rgba(34,197,94,.12)" };
  if (score >= 40) return { label: "Watch", color: "#f59e0b", bg: "rgba(245,158,11,.14)" };
  return { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,.14)" };
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div style={card}><div style={muted}>{label}</div><div style={{ fontSize: 30, fontWeight: 800, marginTop: 5 }}>{value}</div>{hint ? <div style={{ ...muted, marginTop: 4 }}>{hint}</div> : null}</div>;
}

export function CompanyStatusPage({ context }: PluginPageProps) {
  const [nonce, setNonce] = useState(0);
  const params = useMemo(() => ({ companyId: context.companyId ?? "", nonce }), [context.companyId, nonce]);
  const { data, loading, error, refresh } = usePluginData<Overview>(DATA_KEYS.overview, params);

  if (!context.companyId) return <div style={page}>Select a company to view status intelligence.</div>;
  if (loading && !data) return <div style={page}>Loading status intelligence…</div>;
  if (error) return <div style={page}><div style={{ ...card, borderColor: "#ef4444" }}>Status plugin error: {error.message}</div></div>;
  if (!data) return <div style={page}>No status data.</div>;

  const t = tone(data.healthScore);
  const nextAction = data.loopDetected
    ? "Pause new work and inspect the suspected loop before adding tasks."
    : data.blockedIssues > 0
      ? "Unblock the oldest blocked issue before assigning more work."
      : data.staleAgents > 0
        ? "Wake or replace stale agents so ownership is clear."
        : "Keep shipping; no blocking signal is visible.";

  return <main style={page}>
    <section style={hero}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...muted, textTransform: "uppercase", letterSpacing: ".14em" }}>{data.issuePrefix} company status</div>
          <h1 style={{ margin: "6px 0 4px", fontSize: 32, lineHeight: 1.05 }}>{data.companyName}</h1>
          <p style={{ ...muted, maxWidth: 680, fontSize: 14 }}>Health, blockers, agent freshness, and loop risk in one operator-readable page.</p>
        </div>
        <button style={button} onClick={() => { setNonce((n) => n + 1); refresh(); }}>Refresh</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
        <div style={{ fontSize: 64, fontWeight: 900, color: t.color, lineHeight: 1 }}>{data.healthScore}</div>
        <div style={{ border: `1px solid ${t.color}`, color: t.color, background: t.bg, borderRadius: 999, padding: "8px 12px", fontWeight: 800 }}>{t.label}</div>
        <div style={{ ...muted }}>Refreshed {new Date(data.refreshedAt).toLocaleString()}</div>
      </div>
    </section>

    <section style={grid}>
      <Metric label="Open issues" value={data.openIssues} />
      <Metric label="Blocked" value={data.blockedIssues} hint={data.blockedIssues ? "Needs intervention" : "Clear"} />
      <Metric label="Done" value={data.doneIssues} />
      <Metric label="Agents" value={`${data.activeAgents}/${data.activeAgents + data.staleAgents}`} hint="active / total" />
    </section>

    <section style={{ ...card, display: "grid", gap: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>Next best action</div>
      <div>{nextAction}</div>
      {data.loopDetected ? <div style={{ color: "#ef4444", fontWeight: 700 }}>Loop risk: {data.loopAgentName ?? "unknown agent"} / {data.loopRuns7d ?? "?"} signal count.</div> : null}
    </section>

    <section style={grid}>
      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Top blockers</div>
        {data.topBlockers.length === 0 ? <div style={muted}>No blocked issues.</div> : data.topBlockers.map((b) => <div key={b.issueKey} style={{ display: "grid", gap: 3, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}><strong>{b.issueKey}</strong><span>{b.title}</span><span style={muted}>{b.ageDays}d old</span></div>)}
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Agents</div>
        {data.activeAgentList.length === 0 ? <div style={muted}>No agents.</div> : data.activeAgentList.slice(0, 8).map((a) => <div key={a.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}><span>{a.name}</span><span style={muted}>{a.status}</span></div>)}
      </div>
    </section>
  </main>;
}

export default CompanyStatusPage;
