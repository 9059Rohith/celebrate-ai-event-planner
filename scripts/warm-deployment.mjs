import { writeFileSync } from "node:fs";
const base = "https://celebrate-ai-event-planner.vercel.app";
const paths = ["/", "/plan/new", "/evals", "/privacy", "/offline", "/shared"];
const requests = [];
const assets = new Set();
async function get(path) {
  const start = performance.now();
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.text();
  requests.push({
    path,
    status: response.status,
    ms: performance.now() - start,
    cache: response.headers.get("x-vercel-cache"),
    bytes: Buffer.byteLength(data),
  });
  if (!response.ok) throw Error(`Warmup failed: ${path} (${response.status})`);
  return data;
}
try {
  for (const path of paths) {
    const html = await get(path);
    for (const tag of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
      const path = tag[0].match(/(?:src|href)="([^\"]+)"/)?.[1];
      if (path?.startsWith("/_next/static/") && /\.(js|css)(?:\?|$)/.test(path))
        assets.add(path.replaceAll("&amp;", "&"));
    }
  }
  const queue = [...assets];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (;;) {
        const path = queue.shift();
        if (!path) return;
        await get(path);
      }
    }),
  );
  console.log(
    JSON.stringify({
      ok: true,
      pages: paths.length,
      assets: assets.size,
      maxRequestMs: Math.max(...requests.map((r) => r.ms)),
    }),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  writeFileSync(
    "reports/deployment-warmup.json",
    JSON.stringify(
      {
        url: base,
        timestamp: new Date().toISOString(),
        method:
          "Explicit post-deployment server/CDN warmup only; no browser profile or browser cache is warmed. Every request recorded.",
        requests,
      },
      null,
      2,
    ),
  );
}
