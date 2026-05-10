export const PLUGIN_ID = "ola.company-status";
export const PLUGIN_VERSION = "1.0.0";
export const PAGE_ROUTE = "status-intelligence";

export const DATA_KEYS = {
  overview: "company-status.overview",
  history: "company-status.history",
  trends: "company-status.trends",
  snapshots: "company-status.snapshots",
} as const;

export const ACTION_KEYS = {
  refresh: "company-status.refresh",
  pauseAgent: "company-status.pause-agent",
  resumeAgent: "company-status.resume-agent",
  computeSnapshot: "company-status.compute-snapshot",
} as const;

export const EVENT_NAMES = {
  snapshotComputed: "snapshot_computed",
  agentPaused: "agent_paused",
  loopDetected: "loop_detected",
} as const;

export const SLOT_IDS = {
  page: "company-status-page",
} as const;

export const EXPORT_NAMES = {
  page: "CompanyStatusPage",
} as const;

export const LOOP_RUN_THRESHOLD = 100;
export const STALE_AGENT_DAYS = 14;
export const OLD_ISSUE_DAYS = 7;
export const SNAPSHOT_HISTORY_LIMIT = 50;
export const COMPUTE_INTERVAL_MS = 5 * 60 * 1000;

export const HEALTH_WEIGHTS = {
  blockedPenalty: 12,
  blockedCap: 48,
  openPenalty: 2,
  openCap: 24,
  loopPenalty: 18,
  allStalePenalty: 12,
  websiteBonus: 10,
} as const;
