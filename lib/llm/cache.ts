import { createHash } from "node:crypto";
import { redis } from "@/lib/security/rateLimit";
const cache = new Map<string, { value: unknown; expires: number }>();
export function cacheKey(value: unknown): string {
  const stable = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(stable)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, stable(x)]),
          )
        : v;
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}
export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    cache.delete(key);
    cache.set(key, entry);
    return structuredClone(entry.value) as T;
  }
  try {
    const value = await redis(["GET", `cache:${key}`]);
    if (typeof value === "string") return JSON.parse(value) as T;
  } catch {}
  return undefined;
}
export async function cacheSet(key: string, value: unknown): Promise<void> {
  cache.set(key, {
    value: structuredClone(value),
    expires: Date.now() + 3600000,
  });
  if (cache.size > 100) cache.delete(cache.keys().next().value!);
  try {
    await redis(["SET", `cache:${key}`, JSON.stringify(value), "EX", 3600]);
  } catch {}
}
