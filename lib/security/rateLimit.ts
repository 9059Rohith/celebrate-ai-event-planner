import { createHash } from "node:crypto";
import { getServerEnv } from "./env";
const windows = new Map<string, number[]>();
const localSalt = crypto.randomUUID();
export async function redis(command: (string | number)[]): Promise<unknown> {
  const env = getServerEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
    return undefined;
  const response = await fetch(env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(1500),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Cache unavailable");
  return ((await response.json()) as { result: unknown }).result;
}
export async function rateLimit(request: Request): Promise<boolean> {
  const route = new URL(request.url).pathname;
  const limit = route.includes("generate")
    ? 5
    : route.includes("chat")
      ? 20
      : route.includes("eval")
        ? 2
        : 10;
  const now = Date.now();
  const hash = createHash("sha256")
    .update(
      `${getServerEnv().UPSTASH_REDIS_REST_TOKEN || localSalt}:${new Date().toISOString().slice(0, 10)}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`,
    )
    .digest("hex");
  const key = `rate:${route}:${hash}`;
  const sliding =
    "redis.call('ZREMRANGEBYSCORE',KEYS[1],0,ARGV[1]-60000); if redis.call('ZCARD',KEYS[1]) >= tonumber(ARGV[2]) then return 0 end; redis.call('ZADD',KEYS[1],ARGV[1],ARGV[3]); redis.call('EXPIRE',KEYS[1],61); return 1";
  try {
    const allowed = await redis([
      "EVAL",
      sliding,
      1,
      key,
      now,
      limit,
      crypto.randomUUID(),
    ]);
    if (typeof allowed === "number") return allowed === 1;
  } catch {}
  const hits = (windows.get(key) || []).filter((t) => now - t < 60000);
  windows.set(key, [...hits, now]);
  if (windows.size > 10000)
    for (const [k, v] of windows)
      if (now - v[v.length - 1] > 60000) windows.delete(k);
  return hits.length < limit;
}
