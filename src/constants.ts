export const PLUGIN_ID = "ola.company-status";
export const PLUGIN_VERSION = "0.1.0";
export const PAGE_ROUTE = "status-intelligence";

export const DATA_KEYS = {
  overview: "company-status.overview",
} as const;

export const ACTION_KEYS = {
  refresh: "company-status.refresh",
} as const;

export const TOOL_NAMES = {
  snapshot: "company-status-snapshot",
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
