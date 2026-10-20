import { getServerEnv } from "@/lib/security/env";
import { redis } from "@/lib/security/rateLimit";
let day = "";
let spent = 0;
export async function reserveTokens(amount: number): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  if (day !== today) {
    day = today;
    spent = 0;
  }
  try {
    const total = await redis(["INCRBY", `tokens:${today}`, amount]);
    if (typeof total === "number") {
      await redis(["EXPIRE", `tokens:${today}`, 172800]);
      return total <= getServerEnv().DAILY_TOKEN_BUDGET;
    }
  } catch {}
  spent += amount;
  return spent <= getServerEnv().DAILY_TOKEN_BUDGET;
}
export function estimateCost(input: number, output: number): number {
  return (input * 0.15) / 1000000 + (output * 0.6) / 1000000;
}
