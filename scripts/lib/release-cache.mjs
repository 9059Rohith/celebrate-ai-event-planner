import { createHash } from "node:crypto";

export const productionUrl = "https://celebrate-ai-event-planner.vercel.app";
export const pagePaths = [
  "/",
  "/plan/new",
  "/plan/release-audit",
  "/evals",
  "/privacy",
  "/offline",
  "/shared",
];
const headers = { "accept-encoding": "gzip, deflate, br" };

async function request({ base, path, fetcher, requests, phase }) {
  const start = performance.now();
  const response = await fetcher(new URL(path, base), {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.text();
  const row = {
    path,
    phase,
    status: response.status,
    ms: performance.now() - start,
    cache: response.headers.get("x-vercel-cache"),
    edge: response.headers.get("x-vercel-id"),
    encoding: response.headers.get("content-encoding"),
    bytes: Buffer.byteLength(data),
  };
  requests.push(row);
  if (!response.ok)
    throw Error(`Release request failed: ${path} (${response.status})`);
  return { data, row };
}

export async function inspectRelease({
  base = productionUrl,
  paths = pagePaths,
  fetcher = fetch,
  requests = [],
  phase = "shell",
} = {}) {
  const assets = new Set();
  for (const path of paths) {
    const { data } = await request({ base, path, fetcher, requests, phase });
    for (const [tag] of data.matchAll(/<(?:script|link)\b[^>]*>/g)) {
      const asset = tag.match(/(?:src|href)="([^"]+)"/)?.[1];
      if (
        asset?.startsWith("/_next/static/") &&
        /\.(js|css)(?:\?|$)/.test(asset)
      ) {
        assets.add(asset.replaceAll("&amp;", "&"));
      }
    }
  }
  if (!assets.size) throw Error("Release has no critical assets to verify");
  const sorted = [...assets].sort();
  return {
    assets: sorted,
    fingerprint: createHash("sha256")
      .update(JSON.stringify(sorted))
      .digest("hex"),
  };
}

export async function warmRelease({
  base = productionUrl,
  paths = pagePaths,
  fetcher = fetch,
  requests = [],
} = {}) {
  const release = await inspectRelease({ base, paths, fetcher, requests });
  for (const phase of ["warm", "verify"]) {
    const queue = [...release.assets];
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (;;) {
          const path = queue.shift();
          if (!path) return;
          const { row } = await request({
            base,
            path,
            fetcher,
            requests,
            phase,
          });
          if (phase === "verify" && row.cache !== "HIT") {
            throw Error(
              `Critical asset cache is not warm: ${path} (${row.cache})`,
            );
          }
        }
      }),
    );
  }
  const after = await inspectRelease({
    base,
    paths,
    fetcher,
    requests,
    phase: "confirm",
  });
  if (after.fingerprint !== release.fingerprint)
    throw Error("Production release changed during warmup");
  return { ...release, verifiedAssets: release.assets.length, requests };
}
