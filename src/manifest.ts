import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import { ACTION_KEYS, EXPORT_NAMES, PAGE_ROUTE, PLUGIN_ID, PLUGIN_VERSION, SLOT_IDS } from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Company Status Intelligence",
  description: "A focused status page for every Paperclip company, surfacing health, blockers, agent drift, and loop risk.",
  author: "Ola Turmo",
  categories: ["automation"],
  capabilities: ["companies.read", "issues.read", "agents.read", "plugin.state.read", "plugin.state.write", "events.subscribe"],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "page",
        id: SLOT_IDS.page,
        displayName: "Status Intelligence",
        exportName: EXPORT_NAMES.page,
        routePath: PAGE_ROUTE,
      },
    ],
  },
};

export default manifest;
