import type { Issue, Agent, Company } from "@paperclipai/shared";
import type { PluginContext } from "@paperclipai/plugin-sdk";
import type { TopBlocker, AgentStatus, CompanyStatusOverview, StatusSnapshot, HealthBadge } from "./types.js";
export declare function nowTs(): number;
export declare function daysAgo(ts: number | string | Date | null | undefined): number;
export declare function formatIso(d?: Date | number | string | null): string | null;
export declare function computeHealthScore(params: {
    openIssues: number;
    blockedIssues: number;
    inProgressIssues: number;
    inReviewIssues: number;
    totalAgents: number;
    staleAgents: number;
    loopDetected: boolean;
    websiteHealthy: boolean;
}): number;
export declare function healthBadge(score: number): HealthBadge;
export declare function buildRecommendation(params: {
    loopDetected: boolean;
    blockedIssues: number;
    staleAgents: number;
    openIssues: number;
    healthScore: number;
    websiteHealthy: boolean;
}): string;
export declare function checkWebsite(ctx: PluginContext, company: Company): Promise<{
    status: number | null;
    healthy: boolean;
}>;
export declare function fetchAgentRuns(ctx: PluginContext, agentId: string, companyId: string, days: number): Promise<number>;
export declare function detectLoop(ctx: PluginContext, companyId: string): Promise<{
    detected: boolean;
    agentName: string | null;
    runs7d: number | null;
}>;
export declare function buildTopBlockers(issues: Issue[], company: Company): TopBlocker[];
export declare function buildAgentStatuses(ctx: PluginContext, agents: Agent[], companyId: string): Promise<AgentStatus[]>;
export declare function buildOverview(ctx: PluginContext, companyId: string): Promise<CompanyStatusOverview>;
export declare function overviewToSnapshot(overview: CompanyStatusOverview): StatusSnapshot;
export declare function buildAgentContextSnapshot(overview: CompanyStatusOverview): string;
export declare function autoPauseLoopAgent(ctx: PluginContext, companyId: string, agentId: string, runs7d: number): Promise<void>;
//# sourceMappingURL=helpers.d.ts.map