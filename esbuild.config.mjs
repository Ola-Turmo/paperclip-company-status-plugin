import { build, context } from "esbuild";

const watch = process.argv.includes("--watch");

const uiConfig = {
  bundle: true,
  platform: "browser",
  format: "esm",
  sourcemap: true,
  target: ["es2022"],
  external: ["react", "react-dom", "@paperclipai/plugin-sdk/ui"],
  entryPoints: ["src/ui/index.tsx"],
  outfile: "dist/ui/index.js",
  jsx: "automatic",
};

const manifestConfig = {
  bundle: false,
  format: "esm",
  platform: "node",
  target: ["node22"],
  entryPoints: ["src/manifest.ts"],
  outfile: "dist/manifest.js",
  sourcemap: true,
};

const workerConfig = {
  bundle: false,
  format: "esm",
  platform: "node",
  target: ["node22"],
  entryPoints: ["src/worker.ts"],
  outfile: "dist/worker.js",
  sourcemap: true,
};

async function main() {
  if (watch) {
    const ctx = await context(uiConfig);
    await ctx.watch();
    console.log("watching ui");
    return;
  }
  await build(uiConfig);
  await build(manifestConfig);
  await build(workerConfig);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
