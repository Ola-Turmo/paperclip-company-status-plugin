# Paperclip Company Status Plugin

A Paperclip plugin that adds a company-scoped Status Intelligence page at:

`/:companyPrefix/status-intelligence`

It surfaces:

- company health score
- open / blocked / done issue counts
- active vs stale agents
- top blockers
- loop-risk signal
- a clear next-best-action recommendation

## Build

```sh
npm install --legacy-peer-deps
npm run typecheck
npm run build
```

## Install into Paperclip

Build first, then install the local path through the Paperclip plugin install API or plugin manager:

```json
{
  "packageName": "/root/work/Ola-Turmo/paperclip-company-status-plugin",
  "isLocalPath": true
}
```

Plugin id: `ola.company-status`
