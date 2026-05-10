import type { Issue, Agent, Company } from "@paperclipai/shared";
import type { PluginContext } from "@paperclipai/plugin-sdk";
import type { TopBlocker, AgentStatus, CompanyStatusOverview, StatusSnapshot, HealthBadge } from "./types.js";
import { HEALTH_WEIGHTS, LOOP_RUN_THRESHOLD, STALE_AGENT_DAYS } from "./constants.js";

const DAY_MS = 86400000;

export function nowTs(): number {
  return Date.now();
}

export function daysAgo(ts: number | string | Date | null | undefined): number {
  if (!ts) return 0;
  const t = ts instanceof Date ? ts.getTime() : typeof ts === "string" ? new Date(ts).getTime() : ts;
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((nowTs() - t) / DAY_MS));
}

export function formatIso(d?: Date | number | string | null): string | null {
  if (!d) return null;
  try { return new Date(d).toISOString(); } catch { return null; }
}

export function computeHealthScore(params: {
  openIssues: number;
  blockedIssues: number;
  inProgressIssues: number;
  inReviewIssues: number;
  totalAgents: number;
  staleAgents: number;
  loopDetected: boolean;
  websiteHealthy: boolean;
}): number {
  let score = 100;
  score -= Math.min(params.blockedIssues * HEALTH_WEIGHTS.blockedPenalty, HEALTH_WEIGHTS.blockedCap);
  score -= Math.min(params.openIssues * HEALTH_WEIGHTS.openPenalty, HEALTH_WEIGHTS.openCap);
  if (params.loopDetected) score -= HEALTH_WEIGHTS.loopPenalty;
  if (params.totalAgents > 0 && params.staleAgents === params.totalAgents) {
    score -= HEALTH_WEIGHTS.allStalePenalty;
  }
  if (params.websiteHealthy) score += HEALTH_WEIGHTS.websiteBonus;
  return Math.max(0, Math.min(100, score));
}

export function healthBadge(score: number): HealthBadge {
  if (score >= 70) return "healthy";
  if (score >= 40) return "warning";
  return "critical";
}

export function buildRecommendation(params: {
  loopDetected: boolean;
  blockedIssues: number;
  staleAgents: number;
  openIssues: number;
  healthScore: number;
  websiteHealthy: boolean;
}): string {
  if (params.healthScore >= 85 && params.websiteHealthy) {
    return "Company is in excellent shape. Keep shipping and monitor for drift.";
  }
  if (params.loopDetected) {
    return "Pause new work and inspect the suspected loop before adding tasks. Check agent run history for repetitive patterns.";
  }
  if (params.blockedIssues > 3) {
    return `${params.blockedIssues} issues are blocked. Unblock the oldest blocked issues before assigning more work. Consider a blocker-busting sprint.`;
  }
  if (params.blockedIssues > 0) {
    return `Unblock the oldest blocked issue before assigning more work.`;
  }
  if (params.staleAgents > 0) {
    return `${params.staleAgents} agent${params.staleAgents > 1 ? "s are" : " is"} stale. Wake or replace stale agents so ownership is clear.`;
  }
  if (params.openIssues > 20) {
    return `${params.openIssues} open issues. Consider triaging and closing stale issues to reduce cognitive load.`;
  }
  if (!params.websiteHealthy) {
    return "Website health check failed. Verify deployment and DNS configuration.";
  }
  return "Keep shipping; no blocking signal is visible.";
}

export async function checkWebsite(ctx: PluginContext, company: Company): Promise<{ status: number | null; healthy: boolean }> {
  const meta = (company as unknown as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
  const url = meta?.websiteUrl as string | undefined;
  if (!url) return { status: null, healthy: false };
  try {
    const resp = await ctx.http.fetch(url, { method: "HEAD", redirect: "follow" });
    const healthy = resp.status >= 200 && resp.status < 400;
    return { status: resp.status, healthy };
  } catch {
    return { status: null, healthy: false };
  }
}

export async function fetchAgentRuns(ctx: PluginContext, agentId: string, companyId: string, days: number): Promise<number> {
  try {
    const since = new Date(nowTs() - days * DAY_MS).toISOString();
    const rows = await ctx.db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM heartbeat_runs WHERE agent_id = $1 AND company_id = $2 AND started_at >= $3`,
      [agentId, companyId, since],
    );
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function detectLoop(ctx: PluginContext, companyId: string): Promise<{ detected: boolean; agentName: string | null; runs7d: number | null }> {
  try {
    const since = new Date(nowTs() - 7 * DAY_MS).toISOString();
    const rows = await ctx.db.query<{ agent_id: string; count: number }>(
      `SELECT agent_id, COUNT(*) as count FROM heartbeat_runs WHERE company_id = $1 AND started_at >= $2 GROUP BY agent_id ORDER BY count DESC LIMIT 1`,
      [companyId, since],
    );
    if (!rows.length) return { detected: false, agentName: null, runs7d: null };
    const top = rows[0];
    if (top.count < LOOP_RUN_THRESHOLD) return { detected: false, agentName: null, runs7d: top.count };
    const agent = await ctx.agents.get(top.agent_id, companyId);
    return { detected: true, agentName: agent?.name ?? "Unknown", runs7d: top.count };
  } catch {
    return { detected: false, agentName: null, runs7d: null };
  }
}

export function buildTopBlockers(issues: Issue[], company: Company): TopBlocker[] {
  const blockers = issues
    .filter((i) => i.status === "blocked")
    .sort((a, b) => {
      const ageA = daysAgo(a.createdAt);
      const ageB = daysAgo(b.createdAt);
      return ageB - ageA;
    })
    .slice(0, 5)
    .map((i) => ({
      issueKey: i.identifier ?? `${company.issuePrefix}-${i.issueNumber ?? i.id.slice(0, 6)}`,
      title: i.title,
      ageDays: daysAgo(i.createdAt),
      priority: i.priority,
    }));
  return blockers;
}

export async function buildAgentStatuses(ctx: PluginContext, agents: Agent[], companyId: string): Promise<AgentStatus[]> {
  const since = new Date(nowTs() - 7 * DAY_MS).toISOString();
  const results: AgentStatus[] = [];
  for (const agent of agents) {
    const heartbeatAt = agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).getTime() : NaN;
    const isStale = !agent.lastHeartbeatAt || Number.isNaN(heartbeatAt) || nowTs() - heartbeatAt > STALE_AGENT_DAYS * DAY_MS;
    let runs7d = 0;
    try {
      const rows = await ctx.db.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM heartbeat_runs WHERE agent_id = $1 AND company_id = $2 AND started_at >= $3`,
        [agent.id, companyId, since],
      );
      runs7d = rows[0]?.count ?? 0;
    } catch { /* ignore */ }
    results.push({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      lastHeartbeatAt: agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).toISOString() : null,
      role: agent.role,
      runs7d,
      isStale,
    });
  }
  return results;
}

export async function buildOverview(ctx: PluginContext, companyId: string): Promise<CompanyStatusOverview> {
  const company = await ctx.companies.get(companyId);
  if (!company) throw new Error(`Company not found: ${companyId}`);

  const [issues, agents] = await Promise.all([
    ctx.issues.list({ companyId, limit: 500, offset: 0 }),
    ctx.agents.list({ companyId, limit: 200, offset: 0 }),
  ]);

  let openIssues = 0;
  let blockedIssues = 0;
  let doneIssues = 0;
  let inProgressIssues = 0;
  let inReviewIssues = 0;

  for (const issue of issues) {
    switch (issue.status) {
      case "done": doneIssues++; break;
      case "blocked": blockedIssues++; break;
      case "in_progress": inProgressIssues++; break;
      case "in_review": inReviewIssues++; break;
      case "backlog":
      case "todo":
        openIssues++; break;
      default: break;
    }
  }

  const activeAgentList = await buildAgentStatuses(ctx, agents, companyId);
  const staleAgents = activeAgentList.filter((a) => a.isStale).length;

  const loopInfo = await detectLoop(ctx, companyId);
  const websiteInfo = await checkWebsite(ctx, company);

  const healthScore = computeHealthScore({
    openIssues,
    blockedIssues,
    inProgressIssues,
    inReviewIssues,
    totalAgents: agents.length,
    staleAgents,
    loopDetected: loopInfo.detected,
    websiteHealthy: websiteInfo.healthy,
  });

  const topBlockers = buildTopBlockers(issues, company);

  const recommendation = buildRecommendation({
    loopDetected: loopInfo.detected,
    blockedIssues,
    staleAgents,
    openIssues,
    healthScore,
    websiteHealthy: websiteInfo.healthy,
  });

  return {
    companyId,
    companyName: company.name,
    issuePrefix: company.issuePrefix,
    healthScore,
    healthBadge: healthBadge(healthScore),
    openIssues,
    blockedIssues,
    doneIssues,
    inProgressIssues,
    inReviewIssues,
    activeAgents: agents.length - staleAgents,
    staleAgents,
    loopDetected: loopInfo.detected,
    loopAgentName: loopInfo.agentName,
    loopRuns7d: loopInfo.runs7d,
    topBlockers,
    activeAgentList,
    websiteStatus: websiteInfo.status,
    websiteHealthy: websiteInfo.healthy,
    recommendation,
    refreshedAt: new Date().toISOString(),
  };
}

export function overviewToSnapshot(overview: CompanyStatusOverview): StatusSnapshot {
  return {
    companyId: overview.companyId,
    computedAt: overview.refreshedAt,
    healthScore: overview.healthScore,
    openCount: overview.openIssues + overview.inProgressIssues + overview.inReviewIssues,
    blockedCount: overview.blockedIssues,
    doneCount: overview.doneIssues,
    activeAgents: overview.activeAgents,
    staleAgents: overview.staleAgents,
    loopDetected: overview.loopDetected,
    loopAgentName: overview.loopAgentName,
    loopRuns7d: overview.loopRuns7d,
    websiteStatus: overview.websiteStatus,
    topBlockers: overview.topBlockers,
    snapshotJson: {
      inProgressIssues: overview.inProgressIssues,
      inReviewIssues: overview.inReviewIssues,
      recommendation: overview.recommendation,
      websiteHealthy: overview.websiteHealthy,
    },
  };
}

export function buildAgentContextSnapshot(overview: CompanyStatusOverview): string {
  const emoji = overview.healthBadge === "healthy" ? "🟢" : overview.healthBadge === "warning" ? "🟡" : "🔴";
  const lines: string[] = [
    `# ${emoji} Company Status Snapshot — ${overview.companyName}`,
    ``,
    `- **Health Score:** ${overview.healthScore}/100 (${overview.healthBadge})`,
    `- **Active Agents:** ${overview.activeAgents} | **Stale:** ${overview.staleAgents}`,
    `- **Open Issues:** ${overview.openIssues} | **In Progress:** ${overview.inProgressIssues} | **In Review:** ${overview.inReviewIssues} | **Blocked:** ${overview.blockedIssues} | **Done:** ${overview.doneIssues}`,
    `- **Website:** ${overview.websiteHealthy ? "✅ Healthy" : "❌ Unreachable"} ${overview.websiteStatus ? `(${overview.websiteStatus})` : ""}`,
  ];

  if (overview.loopDetected) {
    lines.push(`- **⚠️ LOOP RISK:** ${overview.loopAgentName ?? "Unknown agent"} has ${overview.loopRuns7d ?? "?"} runs in 7 days`);
  }

  if (overview.topBlockers.length > 0) {
    lines.push(`- **Top Blockers:**`);
    for (const b of overview.topBlockers) {
      lines.push(`  - ${b.issueKey}: ${b.title} (${b.ageDays}d old)`);
    }
  }

  lines.push(`- **Recommendation:** ${overview.recommendation}`);
  lines.push(``);
  lines.push(`_Snapshot taken at ${overview.refreshedAt}_`);

  return lines.join("\n");
}

export async function autoPauseLoopAgent(ctx: PluginContext, companyId: string, agentId: string, runs7d: number): Promise<void> {
  try {
    await ctx.agents.pause(agentId, companyId);
    await ctx.issues.create({
      companyId,
      title: `[AUTO] Agent paused — ${runs7d} runs exceeds threshold`,
      description: `This agent was automatically paused because it executed ${runs7d} runs in the last 7 days, exceeding the threshold of ${LOOP_RUN_THRESHOLD}.\n\nPlease review the agent's behavior and resume when appropriate.`,
      status: "blocked",
      priority: "high",
    });
  } catch (err) {
    ctx.logger.error(`Failed to auto-pause agent ${agentId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
