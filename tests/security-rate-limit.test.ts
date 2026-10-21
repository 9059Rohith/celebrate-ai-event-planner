import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("RATE_LIMIT_PER_MIN", "10");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const request = (ip: string) =>
  new Request("https://celebrate.example/api/plan/generate", {
    headers: { "x-forwarded-for": ip },
  });

it.each(["/api/plan/generate", "/api/ideas"])(
  "applies the configured ceiling to %s",
  async (route) => {
    vi.stubEnv("RATE_LIMIT_PER_MIN", "2");
    const { rateLimit } = await import("@/lib/security/rateLimit");
    const client = new Request(`https://celebrate.example${route}`, {
      headers: { "x-forwarded-for": "192.0.2.2" },
    });
    expect(await rateLimit(client)).toBe(true);
    expect(await rateLimit(client)).toBe(true);
    expect(await rateLimit(client)).toBe(false);
  },
);

it("passes the configured ceiling to the shared Redis sliding window", async () => {
  vi.stubEnv("RATE_LIMIT_PER_MIN", "2");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  const fetch = vi.fn().mockResolvedValue(Response.json({ result: 1 }));
  vi.stubGlobal("fetch", fetch);
  const { rateLimit } = await import("@/lib/security/rateLimit");
  expect(await rateLimit(request("192.0.2.3"))).toBe(true);
  const command = JSON.parse(fetch.mock.calls[0][1].body) as unknown[];
  expect(command[5]).toBe(2);
});

it("does not extend the accepted-request window when blocked clients retry", async () => {
  const { rateLimit } = await import("@/lib/security/rateLimit");
  const client = request("192.0.2.1");
  for (let i = 0; i < 5; i++) expect(await rateLimit(client)).toBe(true);
  vi.advanceTimersByTime(59000);
  for (let i = 0; i < 20; i++) expect(await rateLimit(client)).toBe(false);
  vi.advanceTimersByTime(1001);
  expect(await rateLimit(client)).toBe(true);
});

it("bounds memory for many client identities and admits new clients after expiry", async () => {
  const { rateLimit } = await import("@/lib/security/rateLimit");
  for (let i = 0; i < 10000; i++) {
    expect(await rateLimit(request(`client-${i}`))).toBe(true);
  }
  expect(await rateLimit(request("overflow-client"))).toBe(false);
  vi.advanceTimersByTime(60001);
  expect(await rateLimit(request("overflow-client"))).toBe(true);
});
