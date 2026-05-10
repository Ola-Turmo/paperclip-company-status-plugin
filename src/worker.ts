import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { DATA_KEYS } from "./constants.js";

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register(DATA_KEYS.overview, async (params) => {
      const companyId = typeof params.companyId === "string" ? params.companyId : "";
      if (!companyId) {
        throw new Error("companyId is required");
      }

      const company = await ctx.companies.get(companyId);
      if (!company) {
        throw new Error(`Company not found: ${companyId}`);
      }

      const issues = await ctx.issues.list({ companyId, limit: 500, offset: 0 });
      const agents = await ctx.agents.list({ companyId, limit: 200, offset: 0 });
      const now = Date.now();

      let openIssues = 0;
      let blockedIssues = 0;
      let doneIssues = 0;
      const topBlockers: Array<{ issueKey: string; title: string; ageDays: number }> = [];

      for (const issue of issues) {
        if (issue.status === "done") doneIssues += 1;
        else if (issue.status === "blocked") {
          blockedIssues += 1;
          if (topBlockers.length < 5) {
            topBlockers.push({
              issueKey: issue.identifier ?? `${company.issuePrefix}-${issue.issueNumber ?? issue.id.slice(0, 6)}`,
              title: issue.title,
              ageDays: issue.createdAt ? Math.max(0, Math.floor((now - new Date(issue.createdAt).getTime()) / 86400000)) : 0,
            });
          }
        } else if (issue.status !== "cancelled") {
          openIssues += 1;
        }
      }

      let staleAgents = 0;
      const activeAgentList: Array<{ name: string; status: string; lastHeartbeatAt: string | null }> = [];
      for (const agent of agents) {
        const heartbeatAt = agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).getTime() : NaN;
        if (!agent.lastHeartbeatAt || heartbeatAt !== heartbeatAt || now - heartbeatAt > 14 * 86400000) {
          staleAgents += 1;
        }
        activeAgentList.push({
          name: agent.name,
          status: agent.status,
          lastHeartbeatAt: agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).toISOString() : null,
        });
      }

      const loopDetected = issues.length > 100;
      const healthScore = Math.max(0, 100 - Math.min(blockedIssues * 12, 48) - Math.min(openIssues * 2, 24) - (loopDetected ? 18 : 0) - (agents.length > 0 && staleAgents === agents.length ? 12 : 0));

      return {
        companyId,
        companyName: company.name,
        issuePrefix: company.issuePrefix,
        healthScore,
        healthBadge: healthScore >= 70 ? "healthy" : healthScore >= 40 ? "warning" : "critical",
        openIssues,
        blockedIssues,
        doneIssues,
        activeAgents: agents.length - staleAgents,
        staleAgents,
        loopDetected,
        loopAgentName: loopDetected && agents.length > 0 ? agents[0].name : null,
        loopRuns7d: loopDetected ? issues.length : null,
        topBlockers,
        activeAgentList,
        refreshedAt: new Date().toISOString(),
      };
    });
  },

  async onHealth() {
    return { status: "ok" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
