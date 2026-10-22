import { expect, test, vi } from "vitest";
import { inspectRelease, warmRelease } from "../scripts/lib/release-cache.mjs";

test("default warmup covers the saved-plan route's distinct script", async () => {
  const fetcher = vi.fn(async (url: RequestInfo | URL) => {
    const path = new URL(String(url)).pathname;
    if (path.startsWith("/_next/static/"))
      return new Response("ready", { headers: { "x-vercel-cache": "HIT" } });
    const saved = path.startsWith("/plan/") && path !== "/plan/new";
    return new Response(
      `<script src="/_next/static/${saved ? "saved" : "public"}.js"></script>`,
    );
  });
  const report = await warmRelease({ base: "https://example.test", fetcher });
  expect(report.assets).toContain("/_next/static/saved.js");
});

function server({ change = false, staysCold = false } = {}) {
  let pages = 0;
  const hits = new Map<string, number>();
  return vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
    expect(options?.headers).toBeDefined();
    const path = new URL(String(url)).pathname;
    if (!path.startsWith("/_next/static/")) {
      const asset = change && pages++ > 0 ? "new" : "old";
      return new Response(`<script src="/_next/static/${asset}.js"></script>`, {
        headers: { "content-type": "text/html" },
      });
    }
    hits.set(path, (hits.get(path) || 0) + 1);
    return new Response("window.ready=true", {
      headers: {
        "x-vercel-cache": staysCold || hits.get(path) === 1 ? "MISS" : "HIT",
      },
    });
  });
}

test("verifies a CDN hit after warming, using browser compression, without warming a browser", async () => {
  const fetcher = server();
  const report = await warmRelease({
    base: "https://example.test",
    paths: ["/shared"],
    fetcher,
  });
  expect(report.verifiedAssets).toBe(1);
  expect(
    report.requests
      .filter((r: { phase: string }) => r.phase === "verify")
      .every((r: { cache: string }) => r.cache === "HIT"),
  ).toBe(true);
  expect(
    new Headers(fetcher.mock.calls[1][1]?.headers).get("accept-encoding"),
  ).toContain("br");
});

test("rejects a deployment that changes while assets are being warmed", async () => {
  await expect(
    warmRelease({
      base: "https://example.test",
      paths: ["/shared"],
      fetcher: server({ change: true }),
    }),
  ).rejects.toThrow(/changed/);
});

test("rejects assets that remain cold instead of silently claiming warmup succeeded", async () => {
  await expect(
    warmRelease({
      base: "https://example.test",
      paths: ["/shared"],
      fetcher: server({ staysCold: true }),
    }),
  ).rejects.toThrow(/cache/);
});

test("fingerprints only the current same-origin critical JS and CSS", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        '<script src="https://evil.test/ignore.js"></script><script src="/_next/static/main.js"></script><link href="/_next/static/styles.css" rel="stylesheet"><script src="/api/ignore.js"></script>',
      ),
  );
  const release = await inspectRelease({
    base: "https://example.test",
    paths: ["/shared"],
    fetcher,
  });
  expect(release.assets).toEqual([
    "/_next/static/main.js",
    "/_next/static/styles.css",
  ]);
  expect(release.fingerprint).toMatch(/^[a-f0-9]{64}$/);
});
