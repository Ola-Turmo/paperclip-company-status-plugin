# Paperclip Company Status Plugin

A production-grade Paperclip plugin that adds a per-company **Status Intelligence** page at:

```
/:companyPrefix/status-intelligence
```

## Features

- **Health Score** — Composite score (0–100) based on issues, agents, blockers, loop risk, and website health
- **Loop Auto-Pause** — Automatically pauses agents exceeding 100 runs in 7 days and creates a high-priority issue
- **Website Health Check** — Pings company websites and grants a health bonus when online
- **Agent Context Injection** — Injects company status snapshot into agent run context on every start
- **Periodic Snapshots** — Computes and stores status history every 5 minutes for trend analysis
- **Real-Time Event Updates** — Reacts to issue/agent/run events to keep status current
- **Next Best Action** — AI-driven recommendation based on current company state
- **Rich UI** — Health gauge, metric cards, sparklines, blocker list, agent freshness table

## Architecture

```
src/
  manifest.ts      — Plugin manifest (capabilities, slots, entrypoints)
  constants.ts     — Keys, thresholds, configuration
  types.ts         — TypeScript interfaces
  helpers.ts       — Computation logic, health scoring, snapshot building
  worker.ts        — Data handlers, action handlers, event subscriptions, cron
  ui/index.tsx     — CompanyStatusPage React component
```

## Data Handlers

| Key | Description |
|---|---|
| `company-status.overview` | Current status snapshot for a company |
| `company-status.history` | Historical snapshots + health trend |
| `company-status.trends` | Issue/agent trend data |
| `company-status.snapshots` | Paginated snapshot list |

## Action Handlers

| Key | Description |
|---|---|
| `company-status.refresh` | Force recompute and save snapshot |
| `company-status.pause-agent` | Pause an agent + create issue |
| `company-status.resume-agent` | Resume a paused agent |
| `company-status.compute-snapshot` | Compute snapshot without UI refresh |

## Events

| Event | Behavior |
|---|---|
| `agent.run.finished` | Track run counts, auto-pause loop agents |
| `agent.run.started` | Build context snapshot, emit to stream |
| `issue.created` | Recompute status |
| `issue.updated` | Recompute status |
| `agent.status_changed` | Recompute status |

## Build

```sh
npm install --legacy-peer-deps
npm run typecheck
npm test
npm run build
```

Outputs:
- `dist/manifest.js` — Plugin manifest
- `dist/worker.js` — Worker bundle
- `dist/ui/index.js` — UI bundle

## Install into Paperclip

Build first, then install via the Paperclip plugin manager or API:

```json
{
  "packageName": "/root/work/Ola-Turmo/paperclip-company-status-plugin",
  "isLocalPath": true
}
```

Plugin ID: `ola.company-status`

## Health Score Algorithm

```
base = 100
- blockedIssues * 12 (capped at 48)
- openIssues * 2 (capped at 24)
- loopDetected ? 18 : 0
- allAgentsStale ? 12 : 0
+ websiteHealthy ? 10 : 0
= clamp(0, 100)
```

## License

MIT
