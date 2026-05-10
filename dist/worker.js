import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { DATA_KEYS, ACTION_KEYS, EVENT_NAMES, COMPUTE_INTERVAL_MS } from "./constants.js";
import {
  buildOverview,
  overviewToSnapshot,
  buildAgentContextSnapshot,
  autoPauseLoopAgent,
  nowTs
} from "./helpers.js";
const STATE_KEYS = {
  snapshots: "snapshots",
  runCounts: "run_counts"
};
async function saveSnapshot(ctx, overview) {
  const snapshot = overviewToSnapshot(overview);
  const existing = await ctx.state.get({ scopeKind: "company", scopeId: overview.companyId, stateKey: STATE_KEYS.snapshots });
  const history = existing ?? [];
  history.unshift(snapshot);
  if (history.length > 50) history.length = 50;
  await ctx.state.set({ scopeKind: "company", scopeId: overview.companyId, stateKey: STATE_KEYS.snapshots }, history);
}
async function computeAndSave(ctx, companyId) {
  const overview = await buildOverview(ctx, companyId);
  await saveSnapshot(ctx, overview);
  ctx.streams.emit("status_updated", {
    companyId,
    healthScore: overview.healthScore,
    healthBadge: overview.healthBadge,
    refreshedAt: overview.refreshedAt
  });
  return overview;
}
const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("Company Status Plugin starting up");
    ctx.data.register(DATA_KEYS.overview, async (query) => {
      const companyId = typeof query.companyId === "string" ? query.companyId : "";
      if (!companyId) throw new Error("companyId is required");
      const overview = await buildOverview(ctx, companyId);
      await saveSnapshot(ctx, overview);
      return overview;
    });
    ctx.data.register(DATA_KEYS.history, async (query) => {
      const companyId = typeof query.companyId === "string" ? query.companyId : "";
      if (!companyId) throw new Error("companyId is required");
      const history = await ctx.state.get({ scopeKind: "company", scopeId: companyId, stateKey: STATE_KEYS.snapshots });
      const overview = history?.[0] ?? null;
      return {
        companyId,
        history: history ?? [],
        healthTrend: (history ?? []).slice().reverse().map((s) => ({
          date: s.computedAt,
          score: s.healthScore
        })),
        latest: overview
      };
    });
    ctx.data.register(DATA_KEYS.trends, async (query) => {
      const companyId = typeof query.companyId === "string" ? query.companyId : "";
      if (!companyId) throw new Error("companyId is required");
      const history = await ctx.state.get({ scopeKind: "company", scopeId: companyId, stateKey: STATE_KEYS.snapshots });
      const openTrend = (history ?? []).slice().reverse().map((s) => ({
        date: s.computedAt,
        value: s.openCount
      }));
      const blockedTrend = (history ?? []).slice().reverse().map((s) => ({
        date: s.computedAt,
        value: s.blockedCount
      }));
      return { companyId, openTrend, blockedTrend, agentTrend: [] };
    });
    ctx.data.register(DATA_KEYS.snapshots, async (query) => {
      const companyId = typeof query.companyId === "string" ? query.companyId : "";
      const limit = typeof query.limit === "number" ? query.limit : 20;
      if (!companyId) throw new Error("companyId is required");
      const history = await ctx.state.get({ scopeKind: "company", scopeId: companyId, stateKey: STATE_KEYS.snapshots });
      return { companyId, snapshots: (history ?? []).slice(0, limit) };
    });
    ctx.actions.register(ACTION_KEYS.refresh, async (params) => {
      const { companyId } = params;
      const overview = await computeAndSave(ctx, companyId);
      return { ok: true, overview };
    });
    ctx.actions.register(ACTION_KEYS.pauseAgent, async (params) => {
      const { agentId, companyId, reason } = params;
      await ctx.agents.pause(agentId, companyId);
      if (reason) {
        await ctx.issues.create({
          companyId,
          title: `[AUTO] Agent paused \u2014 ${reason}`,
          description: `Agent was paused. Reason: ${reason}`,
          status: "blocked",
          priority: "high"
        });
      }
      return { ok: true };
    });
    ctx.actions.register(ACTION_KEYS.resumeAgent, async (params) => {
      const { agentId, companyId } = params;
      await ctx.agents.resume(agentId, companyId);
      return { ok: true };
    });
    ctx.actions.register(ACTION_KEYS.computeSnapshot, async (params) => {
      const { companyId } = params;
      const overview = await computeAndSave(ctx, companyId);
      return { ok: true, overview };
    });
    ctx.events.on("agent.run.finished", async (event) => {
      const payload = event.payload;
      if (!payload?.agentId || !payload?.companyId) return;
      const runCounts = await ctx.state.get({
        scopeKind: "company",
        scopeId: payload.companyId,
        stateKey: STATE_KEYS.runCounts
      });
      const counts = runCounts ?? {};
      const entry = counts[payload.agentId] ?? { count: 0, windowStart: nowTs() };
      const windowMs = 7 * 864e5;
      if (nowTs() - entry.windowStart > windowMs) {
        entry.count = 1;
        entry.windowStart = nowTs();
      } else {
        entry.count += 1;
      }
      counts[payload.agentId] = entry;
      await ctx.state.set({ scopeKind: "company", scopeId: payload.companyId, stateKey: STATE_KEYS.runCounts }, counts);
      if (entry.count >= 100) {
        ctx.logger.warn(`Loop detected for agent ${payload.agentId} in company ${payload.companyId}: ${entry.count} runs in 7d`);
        await autoPauseLoopAgent(ctx, payload.companyId, payload.agentId, entry.count);
        ctx.streams.emit(EVENT_NAMES.loopDetected, {
          companyId: payload.companyId,
          agentId: payload.agentId,
          runs7d: entry.count
        });
      }
    });
    ctx.events.on("agent.run.started", async (event) => {
      const payload = event.payload;
      if (!payload?.agentId || !payload?.companyId) return;
      try {
        const overview = await buildOverview(ctx, payload.companyId);
        const snapshotMarkdown = buildAgentContextSnapshot(overview);
        const agent = await ctx.agents.get(payload.agentId, payload.companyId);
        if (!agent) return;
        ctx.logger.info(`Injecting company status snapshot into agent ${agent.name} context`);
        ctx.streams.emit("context_snapshot", {
          companyId: payload.companyId,
          agentId: payload.agentId,
          runId: payload.runId,
          snapshot: snapshotMarkdown
        });
      } catch (err) {
        ctx.logger.error(`Failed to build context snapshot: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
    ctx.events.on("issue.created", async (event) => {
      const payload = event.payload;
      const companyId = payload?.issue?.companyId;
      if (!companyId) return;
      try {
        await computeAndSave(ctx, companyId);
      } catch {
      }
    });
    ctx.events.on("issue.updated", async (event) => {
      const payload = event.payload;
      const companyId = payload?.issue?.companyId;
      if (!companyId) return;
      try {
        await computeAndSave(ctx, companyId);
      } catch {
      }
    });
    ctx.events.on("agent.status_changed", async (event) => {
      const payload = event.payload;
      if (!payload?.companyId) return;
      try {
        await computeAndSave(ctx, payload.companyId);
      } catch {
      }
    });
    const computeAll = async () => {
      try {
        const companies = await ctx.companies.list();
        for (const company of companies) {
          try {
            await computeAndSave(ctx, company.id);
            ctx.logger.info(`Computed status snapshot for ${company.name}`);
          } catch (err) {
            ctx.logger.error(`Failed to compute snapshot for ${company.name}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } catch (err) {
        ctx.logger.error(`Failed to list companies for snapshot computation: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    computeAll();
    const intervalId = setInterval(computeAll, COMPUTE_INTERVAL_MS);
    ctx.logger.info("Company Status Plugin ready");
  },
  async onHealth() {
    return { status: "ok" };
  }
});
var worker_default = plugin;
runWorker(plugin, import.meta.url);
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
