import type { Issue, Agent, Company } from "@paperclipai/shared";

export type HealthBadge = "healthy" | "warning" | "critical";

export interface TopBlocker {
  issueKey: string;
  title: string;
  ageDays: number;
  priority?: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  status: string;
  lastHeartbeatAt: string | null;
  role: string;
  runs7d: number;
  isStale: boolean;
}

export interface CompanyStatusOverview {
  companyId: string;
  companyName: string;
  issuePrefix: string;
  healthScore: number;
  healthBadge: HealthBadge;
  openIssues: number;
  blockedIssues: number;
  doneIssues: number;
  inProgressIssues: number;
  inReviewIssues: number;
  activeAgents: number;
  staleAgents: number;
  loopDetected: boolean;
  loopAgentName: string | null;
  loopRuns7d: number | null;
  topBlockers: TopBlocker[];
  activeAgentList: AgentStatus[];
  websiteStatus: number | null;
  websiteHealthy: boolean;
  recommendation: string;
  refreshedAt: string;
}

export interface StatusSnapshot {
  id?: string;
  companyId: string;
  computedAt: string;
  healthScore: number;
  openCount: number;
  blockedCount: number;
  doneCount: number;
  activeAgents: number;
  staleAgents: number;
  loopDetected: boolean;
  loopAgentName: string | null;
  loopRuns7d: number | null;
  websiteStatus: number | null;
  topBlockers: TopBlocker[];
  snapshotJson: Record<string, unknown>;
}

export interface CompanyTrends {
  companyId: string;
  history: StatusSnapshot[];
  healthTrend: { date: string; score: number }[];
  issueVelocity: { date: string; opened: number; closed: number }[];
}

export interface PauseAgentParams {
  agentId: string;
  companyId: string;
  reason?: string;
}

export interface ResumeAgentParams {
  agentId: string;
  companyId: string;
}

export interface RefreshParams {
  companyId: string;
}

export interface ComputeSnapshotParams {
  companyId: string;
}

export interface RunEventPayload {
  runId: string;
  agentId: string;
  companyId: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface AgentRunFinishedEvent {
  runId: string;
  agentId: string;
  companyId: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface IssueEventPayload {
  issue: Issue;
  previousStatus?: string;
}

export interface AgentStatusChangedEvent {
  agentId: string;
  companyId: string;
  previousStatus?: string;
  status: string;
}
