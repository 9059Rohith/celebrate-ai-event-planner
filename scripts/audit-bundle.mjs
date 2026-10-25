import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { spawn } from "node:child_process";
const root = process.cwd();
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
const hits = files(join(root, ".next/static"))
  .filter((f) => f.endsWith(".js"))
  .filter((f) =>
    /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9_-]{20,}/.test(readFileSync(f, "utf8")),
  );
if (hits.length) throw Error("Secret-like data found in built browser output.");
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "4111"],
  { stdio: "ignore", windowsHide: true },
);
try {
  let html = "";
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch("http://localhost:4111");
      if (r.ok) {
        html = await r.text();
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!html) throw Error("Cannot start built application for bundle audit.");
  const paths = [
    ...new Set(
      [...html.matchAll(/<script\b([^>]*)>/g)]
        .filter((m) => !/\bnomodule(?:[\s=>]|$)/i.test(m[1]))
        .map((m) => m[1].match(/src="([^"?]+)(?:\?[^"\s]*)?"/)?.[1] || "")
        .filter((s) => s.startsWith("/_next/static/") && s.endsWith(".js")),
    ),
  ];
  const sizes = paths.map((path) => ({
    path,
    gzipBytes: gzipSync(
      readFileSync(join(root, ".next", path.replace("/_next/", ""))),
    ).length,
  }));
  const total = sizes.reduce((n, s) => n + s.gzipBytes, 0);
  const result = {
    timestamp: new Date().toISOString(),
    route: "/",
    measurement:
      "Initial external JavaScript for modern browsers; nomodule-only legacy polyfills are excluded. All static JS is scanned for secrets.",
    scriptCount: sizes.length,
    gzipBytes: total,
    budgetBytes: 120 * 1024,
    passed: total <= 120 * 1024,
    secretScanPassed: true,
    scripts: sizes,
  };
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/bundle.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
} finally {
  server.kill();
}
