// src/ui/index.tsx
import { useMemo, useState, useCallback, useEffect } from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";

// src/constants.ts
var DATA_KEYS = {
  overview: "company-status.overview",
  history: "company-status.history",
  trends: "company-status.trends",
  snapshots: "company-status.snapshots"
};
var ACTION_KEYS = {
  refresh: "company-status.refresh",
  pauseAgent: "company-status.pause-agent",
  resumeAgent: "company-status.resume-agent",
  computeSnapshot: "company-status.compute-snapshot"
};
var COMPUTE_INTERVAL_MS = 5 * 60 * 1e3;

// src/ui/index.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var pageStyle = {
  display: "grid",
  gap: 20,
  maxWidth: 1200,
  margin: "0 auto",
  padding: "24px 16px"
};
var heroStyle = {
  border: "1px solid var(--border)",
  borderRadius: 24,
  padding: 28,
  background: "linear-gradient(135deg, color-mix(in srgb, var(--card) 88%, #16a34a 12%), color-mix(in srgb, var(--card) 90%, #2563eb 10%))"
};
var cardStyle = {
  border: "1px solid var(--border)",
  borderRadius: 18,
  padding: 20,
  background: "var(--card)",
  minWidth: 0
};
var gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 14
};
var mutedStyle = {
  color: "var(--muted-foreground)",
  fontSize: 12,
  lineHeight: 1.45
};
var buttonStyle = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "8px 14px",
  background: "var(--background)",
  color: "inherit",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600
};
var dangerButtonStyle = {
  ...buttonStyle,
  borderColor: "#ef4444",
  color: "#ef4444"
};
var successButtonStyle = {
  ...buttonStyle,
  borderColor: "#22c55e",
  color: "#22c55e"
};
function tone(score) {
  if (score >= 70) return { label: "Healthy", color: "#22c55e", bg: "rgba(34,197,94,.12)", border: "rgba(34,197,94,.35)" };
  if (score >= 40) return { label: "Watch", color: "#f59e0b", bg: "rgba(245,158,11,.14)", border: "rgba(245,158,11,.35)" };
  return { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,.14)", border: "rgba(239,68,68,.35)" };
}
function Sparkline({ data, color }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 32;
  const points = data.map((v, i) => {
    const x = i / (data.length - 1) * width;
    const y = height - (v - min) / range * height;
    return `${x},${y}`;
  }).join(" ");
  return /* @__PURE__ */ jsx("svg", { width, height, style: { opacity: 0.7 }, children: /* @__PURE__ */ jsx("polyline", { points, fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function MetricCard({ label, value, hint, trend }) {
  return /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
    /* @__PURE__ */ jsx("div", { style: mutedStyle, children: label }),
    /* @__PURE__ */ jsx("div", { style: { fontSize: 32, fontWeight: 800, marginTop: 6, lineHeight: 1.1 }, children: value }),
    hint ? /* @__PURE__ */ jsx("div", { style: { ...mutedStyle, marginTop: 4 }, children: hint }) : null,
    trend && trend.length > 1 ? /* @__PURE__ */ jsx("div", { style: { marginTop: 8 }, children: /* @__PURE__ */ jsx(Sparkline, { data: trend, color: "#2563eb" }) }) : null
  ] });
}
function HealthScoreHero({ score, label, color, bg, border }) {
  const circumference = 2 * Math.PI * 52;
  const dashoffset = circumference * (1 - score / 100);
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { position: "relative", width: 112, height: 112, flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxs("svg", { width: 112, height: 112, viewBox: "0 0 112 112", children: [
        /* @__PURE__ */ jsx("circle", { cx: 56, cy: 56, r: 52, fill: "none", stroke: "var(--border)", strokeWidth: 6 }),
        /* @__PURE__ */ jsx(
          "circle",
          {
            cx: 56,
            cy: 56,
            r: 52,
            fill: "none",
            stroke: color,
            strokeWidth: 6,
            strokeLinecap: "round",
            strokeDasharray: circumference,
            strokeDashoffset: dashoffset,
            transform: "rotate(-90 56 56)"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color }, children: score })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { border: `1px solid ${border}`, color, background: bg, borderRadius: 999, padding: "8px 14px", fontWeight: 800, fontSize: 14 }, children: label })
  ] });
}
function AgentRow({ agent }) {
  const statusColor = agent.status === "active" || agent.status === "running" ? "#22c55e" : agent.status === "paused" ? "#f59e0b" : "#ef4444";
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 }, children: [
      /* @__PURE__ */ jsx("div", { style: { width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0 } }),
      /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: agent.name }),
        /* @__PURE__ */ jsxs("div", { style: { ...mutedStyle, fontSize: 11 }, children: [
          agent.role,
          " \u2022 ",
          agent.runs7d,
          " runs/7d"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { ...mutedStyle, fontSize: 11, flexShrink: 0, textAlign: "right" }, children: agent.isStale ? /* @__PURE__ */ jsx("span", { style: { color: "#ef4444" }, children: "Stale" }) : /* @__PURE__ */ jsx("span", { style: { color: "#22c55e" }, children: "Fresh" }) })
  ] });
}
function BlockerRow({ blocker }) {
  return /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 3, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8 }, children: [
      /* @__PURE__ */ jsx("strong", { style: { fontSize: 13 }, children: blocker.issueKey }),
      blocker.priority ? /* @__PURE__ */ jsx("span", { style: { ...mutedStyle, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }, children: blocker.priority }) : null
    ] }),
    /* @__PURE__ */ jsx("span", { style: { fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: blocker.title }),
    /* @__PURE__ */ jsxs("span", { style: { ...mutedStyle, fontSize: 11 }, children: [
      blocker.ageDays,
      "d old"
    ] })
  ] });
}
function CompanyStatusPage({ context }) {
  const [nonce, setNonce] = useState(0);
  const params = useMemo(() => ({ companyId: context.companyId ?? "", nonce }), [context.companyId, nonce]);
  const { data, loading, error, refresh } = usePluginData(DATA_KEYS.overview, params);
  const refreshAction = usePluginAction(ACTION_KEYS.refresh);
  const pauseAction = usePluginAction(ACTION_KEYS.pauseAgent);
  const resumeAction = usePluginAction(ACTION_KEYS.resumeAgent);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setNonce((n) => n + 1);
    try {
      await refreshAction({ companyId: context.companyId ?? "" });
    } catch {
    }
    setRefreshing(false);
  }, [refreshAction, context.companyId]);
  useEffect(() => {
    const id = setInterval(() => {
      setNonce((n) => n + 1);
    }, 6e4);
    return () => clearInterval(id);
  }, []);
  if (!context.companyId) {
    return /* @__PURE__ */ jsx("div", { style: pageStyle, children: /* @__PURE__ */ jsxs("div", { style: { ...cardStyle, textAlign: "center", padding: 48 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: 20, fontWeight: 700, marginBottom: 8 }, children: "Select a company" }),
      /* @__PURE__ */ jsx("div", { style: mutedStyle, children: "Choose a company from the sidebar to view its status intelligence." })
    ] }) });
  }
  if (loading && !data) {
    return /* @__PURE__ */ jsx("div", { style: pageStyle, children: /* @__PURE__ */ jsxs("div", { style: { ...cardStyle, textAlign: "center", padding: 48 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: 20, fontWeight: 700, marginBottom: 8 }, children: "Loading status intelligence\u2026" }),
      /* @__PURE__ */ jsx("div", { style: mutedStyle, children: " crunching health scores, agent freshness, and blocker analysis." })
    ] }) });
  }
  if (error) {
    return /* @__PURE__ */ jsx("div", { style: pageStyle, children: /* @__PURE__ */ jsxs("div", { style: { ...cardStyle, borderColor: "#ef4444", background: "rgba(239,68,68,.06)", padding: 24 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, color: "#ef4444", marginBottom: 8 }, children: "Status plugin error" }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: 13 }, children: error.message }),
      /* @__PURE__ */ jsx("button", { style: { ...buttonStyle, marginTop: 16 }, onClick: handleRefresh, children: "Retry" })
    ] }) });
  }
  if (!data) {
    return /* @__PURE__ */ jsx("div", { style: pageStyle, children: /* @__PURE__ */ jsxs("div", { style: { ...cardStyle, textAlign: "center", padding: 48 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: 20, fontWeight: 700 }, children: "No status data" }),
      /* @__PURE__ */ jsx("button", { style: { ...buttonStyle, marginTop: 16 }, onClick: handleRefresh, children: "Refresh" })
    ] }) });
  }
  const t = tone(data.healthScore);
  return /* @__PURE__ */ jsxs("main", { style: pageStyle, children: [
    /* @__PURE__ */ jsxs("section", { style: heroStyle, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { ...mutedStyle, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 600, fontSize: 10 }, children: [
            data.issuePrefix,
            " \u2014 Company Status"
          ] }),
          /* @__PURE__ */ jsx("h1", { style: { margin: "8px 0 6px", fontSize: 34, lineHeight: 1.05, fontWeight: 900 }, children: data.companyName }),
          /* @__PURE__ */ jsx("p", { style: { ...mutedStyle, maxWidth: 680, fontSize: 14 }, children: "Health, blockers, agent freshness, loop risk, and next best action in one operator-readable page." })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexShrink: 0 }, children: /* @__PURE__ */ jsx("button", { style: buttonStyle, onClick: handleRefresh, disabled: refreshing, children: refreshing ? "Refreshing\u2026" : "Refresh" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 20, marginTop: 22, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx(HealthScoreHero, { score: data.healthScore, label: t.label, color: t.color, bg: t.bg, border: t.border }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { fontSize: 13, color: "var(--muted-foreground)" }, children: [
            "Refreshed ",
            new Date(data.refreshedAt).toLocaleString()
          ] }),
          data.websiteStatus !== null ? /* @__PURE__ */ jsxs("div", { style: { fontSize: 13, color: data.websiteHealthy ? "#22c55e" : "#ef4444", fontWeight: 600 }, children: [
            "Website: ",
            data.websiteHealthy ? "\u2705 Healthy" : "\u274C Down",
            " ",
            data.websiteStatus ? `(${data.websiteStatus})` : ""
          ] }) : null
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { style: gridStyle, children: [
      /* @__PURE__ */ jsx(MetricCard, { label: "Open", value: data.openIssues, hint: "backlog + todo" }),
      /* @__PURE__ */ jsx(MetricCard, { label: "In Progress", value: data.inProgressIssues }),
      /* @__PURE__ */ jsx(MetricCard, { label: "In Review", value: data.inReviewIssues }),
      /* @__PURE__ */ jsx(MetricCard, { label: "Blocked", value: data.blockedIssues, hint: data.blockedIssues ? "Needs intervention" : "Clear" }),
      /* @__PURE__ */ jsx(MetricCard, { label: "Done", value: data.doneIssues }),
      /* @__PURE__ */ jsx(MetricCard, { label: "Agents", value: `${data.activeAgents}/${data.activeAgents + data.staleAgents}`, hint: "active / total" })
    ] }),
    /* @__PURE__ */ jsxs("section", { style: { ...cardStyle, display: "grid", gap: 12, borderLeft: `4px solid ${t.color}` }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: 16, fontWeight: 800 }, children: "Next best action" }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: 14, lineHeight: 1.55 }, children: data.recommendation }),
      data.loopDetected ? /* @__PURE__ */ jsxs("div", { style: { color: "#ef4444", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsx("span", { style: { fontSize: 18 }, children: "\u26A0\uFE0F" }),
        "Loop risk detected: ",
        data.loopAgentName ?? "Unknown agent",
        " \u2014 ",
        data.loopRuns7d ?? "?",
        " runs in 7 days"
      ] }) : null
    ] }),
    /* @__PURE__ */ jsxs("section", { style: { ...gridStyle, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }, children: [
      /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: 15 }, children: "Top blockers" }),
          data.blockedIssues > 5 ? /* @__PURE__ */ jsxs("div", { style: { ...mutedStyle, fontSize: 11 }, children: [
            data.blockedIssues,
            " total"
          ] }) : null
        ] }),
        data.topBlockers.length === 0 ? /* @__PURE__ */ jsx("div", { style: { ...mutedStyle, padding: "16px 0" }, children: "No blocked issues. Smooth sailing." }) : data.topBlockers.map((b) => /* @__PURE__ */ jsx(BlockerRow, { blocker: b }, b.issueKey))
      ] }),
      /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: 15 }, children: "Agents" }),
          /* @__PURE__ */ jsxs("div", { style: { ...mutedStyle, fontSize: 11 }, children: [
            data.staleAgents,
            " stale"
          ] })
        ] }),
        data.activeAgentList.length === 0 ? /* @__PURE__ */ jsx("div", { style: { ...mutedStyle, padding: "16px 0" }, children: "No agents registered." }) : data.activeAgentList.map((a) => /* @__PURE__ */ jsx(AgentRow, { agent: a }, a.id))
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { ...mutedStyle, textAlign: "center", padding: "8px 0" }, children: "Status Intelligence v1.0.0 \u2022 Powered by Paperclip" })
  ] });
}
var index_default = CompanyStatusPage;
export {
  CompanyStatusPage,
  index_default as default
};
//# sourceMappingURL=index.js.map
