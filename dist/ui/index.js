// src/ui/index.tsx
import { useMemo, useState } from "react";
import { usePluginData } from "@paperclipai/plugin-sdk/ui";

// src/constants.ts
var DATA_KEYS = {
  overview: "company-status.overview"
};

// src/ui/index.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var page = { display: "grid", gap: 18, maxWidth: 1120, margin: "0 auto", padding: "24px 4px" };
var hero = { border: "1px solid var(--border)", borderRadius: 20, padding: 22, background: "linear-gradient(135deg, color-mix(in srgb, var(--card) 86%, #16a34a 14%), color-mix(in srgb, var(--card) 88%, #2563eb 12%))" };
var grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 };
var card = { border: "1px solid var(--border)", borderRadius: 16, padding: 16, background: "var(--card)", minWidth: 0 };
var muted = { color: "var(--muted-foreground)", fontSize: 12, lineHeight: 1.45 };
var button = { border: "1px solid var(--border)", borderRadius: 999, padding: "8px 12px", background: "var(--background)", color: "inherit", cursor: "pointer" };
function tone(score) {
  if (score >= 70) return { label: "Healthy", color: "#22c55e", bg: "rgba(34,197,94,.12)" };
  if (score >= 40) return { label: "Watch", color: "#f59e0b", bg: "rgba(245,158,11,.14)" };
  return { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,.14)" };
}
function Metric({ label, value, hint }) {
  return /* @__PURE__ */ jsxs("div", { style: card, children: [
    /* @__PURE__ */ jsx("div", { style: muted, children: label }),
    /* @__PURE__ */ jsx("div", { style: { fontSize: 30, fontWeight: 800, marginTop: 5 }, children: value }),
    hint ? /* @__PURE__ */ jsx("div", { style: { ...muted, marginTop: 4 }, children: hint }) : null
  ] });
}
function CompanyStatusPage({ context }) {
  const [nonce, setNonce] = useState(0);
  const params = useMemo(() => ({ companyId: context.companyId ?? "", nonce }), [context.companyId, nonce]);
  const { data, loading, error, refresh } = usePluginData(DATA_KEYS.overview, params);
  if (!context.companyId) return /* @__PURE__ */ jsx("div", { style: page, children: "Select a company to view status intelligence." });
  if (loading && !data) return /* @__PURE__ */ jsx("div", { style: page, children: "Loading status intelligence\u2026" });
  if (error) return /* @__PURE__ */ jsx("div", { style: page, children: /* @__PURE__ */ jsxs("div", { style: { ...card, borderColor: "#ef4444" }, children: [
    "Status plugin error: ",
    error.message
  ] }) });
  if (!data) return /* @__PURE__ */ jsx("div", { style: page, children: "No status data." });
  const t = tone(data.healthScore);
  const nextAction = data.loopDetected ? "Pause new work and inspect the suspected loop before adding tasks." : data.blockedIssues > 0 ? "Unblock the oldest blocked issue before assigning more work." : data.staleAgents > 0 ? "Wake or replace stale agents so ownership is clear." : "Keep shipping; no blocking signal is visible.";
  return /* @__PURE__ */ jsxs("main", { style: page, children: [
    /* @__PURE__ */ jsxs("section", { style: hero, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { style: { ...muted, textTransform: "uppercase", letterSpacing: ".14em" }, children: [
            data.issuePrefix,
            " company status"
          ] }),
          /* @__PURE__ */ jsx("h1", { style: { margin: "6px 0 4px", fontSize: 32, lineHeight: 1.05 }, children: data.companyName }),
          /* @__PURE__ */ jsx("p", { style: { ...muted, maxWidth: 680, fontSize: 14 }, children: "Health, blockers, agent freshness, and loop risk in one operator-readable page." })
        ] }),
        /* @__PURE__ */ jsx("button", { style: button, onClick: () => {
          setNonce((n) => n + 1);
          refresh();
        }, children: "Refresh" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14, marginTop: 18, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 64, fontWeight: 900, color: t.color, lineHeight: 1 }, children: data.healthScore }),
        /* @__PURE__ */ jsx("div", { style: { border: `1px solid ${t.color}`, color: t.color, background: t.bg, borderRadius: 999, padding: "8px 12px", fontWeight: 800 }, children: t.label }),
        /* @__PURE__ */ jsxs("div", { style: { ...muted }, children: [
          "Refreshed ",
          new Date(data.refreshedAt).toLocaleString()
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { style: grid, children: [
      /* @__PURE__ */ jsx(Metric, { label: "Open issues", value: data.openIssues }),
      /* @__PURE__ */ jsx(Metric, { label: "Blocked", value: data.blockedIssues, hint: data.blockedIssues ? "Needs intervention" : "Clear" }),
      /* @__PURE__ */ jsx(Metric, { label: "Done", value: data.doneIssues }),
      /* @__PURE__ */ jsx(Metric, { label: "Agents", value: `${data.activeAgents}/${data.activeAgents + data.staleAgents}`, hint: "active / total" })
    ] }),
    /* @__PURE__ */ jsxs("section", { style: { ...card, display: "grid", gap: 10 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: 18, fontWeight: 800 }, children: "Next best action" }),
      /* @__PURE__ */ jsx("div", { children: nextAction }),
      data.loopDetected ? /* @__PURE__ */ jsxs("div", { style: { color: "#ef4444", fontWeight: 700 }, children: [
        "Loop risk: ",
        data.loopAgentName ?? "unknown agent",
        " / ",
        data.loopRuns7d ?? "?",
        " signal count."
      ] }) : null
    ] }),
    /* @__PURE__ */ jsxs("section", { style: grid, children: [
      /* @__PURE__ */ jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, marginBottom: 10 }, children: "Top blockers" }),
        data.topBlockers.length === 0 ? /* @__PURE__ */ jsx("div", { style: muted, children: "No blocked issues." }) : data.topBlockers.map((b) => /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 3, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }, children: [
          /* @__PURE__ */ jsx("strong", { children: b.issueKey }),
          /* @__PURE__ */ jsx("span", { children: b.title }),
          /* @__PURE__ */ jsxs("span", { style: muted, children: [
            b.ageDays,
            "d old"
          ] })
        ] }, b.issueKey))
      ] }),
      /* @__PURE__ */ jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, marginBottom: 10 }, children: "Agents" }),
        data.activeAgentList.length === 0 ? /* @__PURE__ */ jsx("div", { style: muted, children: "No agents." }) : data.activeAgentList.slice(0, 8).map((a) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }, children: [
          /* @__PURE__ */ jsx("span", { children: a.name }),
          /* @__PURE__ */ jsx("span", { style: muted, children: a.status })
        ] }, a.name))
      ] })
    ] })
  ] });
}
var index_default = CompanyStatusPage;
export {
  CompanyStatusPage,
  index_default as default
};
//# sourceMappingURL=index.js.map
