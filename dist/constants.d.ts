export declare const PLUGIN_ID = "ola.company-status";
export declare const PLUGIN_VERSION = "1.0.0";
export declare const PAGE_ROUTE = "status-intelligence";
export declare const DATA_KEYS: {
    readonly overview: "company-status.overview";
    readonly history: "company-status.history";
    readonly trends: "company-status.trends";
    readonly snapshots: "company-status.snapshots";
};
export declare const ACTION_KEYS: {
    readonly refresh: "company-status.refresh";
    readonly pauseAgent: "company-status.pause-agent";
    readonly resumeAgent: "company-status.resume-agent";
    readonly computeSnapshot: "company-status.compute-snapshot";
};
export declare const EVENT_NAMES: {
    readonly snapshotComputed: "snapshot_computed";
    readonly agentPaused: "agent_paused";
    readonly loopDetected: "loop_detected";
};
export declare const SLOT_IDS: {
    readonly page: "company-status-page";
};
export declare const EXPORT_NAMES: {
    readonly page: "CompanyStatusPage";
};
export declare const LOOP_RUN_THRESHOLD = 100;
export declare const STALE_AGENT_DAYS = 14;
export declare const OLD_ISSUE_DAYS = 7;
export declare const SNAPSHOT_HISTORY_LIMIT = 50;
export declare const COMPUTE_INTERVAL_MS: number;
export declare const HEALTH_WEIGHTS: {
    readonly blockedPenalty: 12;
    readonly blockedCap: 48;
    readonly openPenalty: 2;
    readonly openCap: 24;
    readonly loopPenalty: 18;
    readonly allStalePenalty: 12;
    readonly websiteBonus: 10;
};
//# sourceMappingURL=constants.d.ts.map