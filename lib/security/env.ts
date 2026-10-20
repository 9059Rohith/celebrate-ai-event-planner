import { z } from "zod";
const number = (fallback: number) =>
  z.coerce.number().int().positive().catch(fallback).default(fallback);
const optionalText = z
  .preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional())
  .catch(undefined);
const serverEnvSchema = z.object({
  OPENAI_API_KEY: optionalText,
  OPENAI_MODEL: z.string().min(1).catch("gpt-4o-mini").default("gpt-4o-mini"),
  OPENAI_JUDGE_MODEL: z.string().default("gpt-4o"),
  OPENAI_TIMEOUT_MS: number(25000),
  OPENAI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).catch(2).default(2),
  UPSTASH_REDIS_REST_URL: z
    .preprocess(
      (v) => (v === "" ? undefined : v),
      z.url().startsWith("https://").optional(),
    )
    .catch(undefined),
  UPSTASH_REDIS_REST_TOKEN: optionalText,
  EVAL_SECRET: optionalText,
  RATE_LIMIT_PER_MIN: number(10),
  DAILY_TOKEN_BUDGET: number(2000000),
});
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = {
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_ENABLE_ANALYTICS: string;
};
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined")
    throw new Error("Server environment is unavailable in browser");
  return serverEnvSchema.parse(process.env);
}
export function getPublicEnv(): PublicEnv {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ENABLE_ANALYTICS:
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS || "false",
  };
}
export function isAiConfigured(): boolean {
  return !!getServerEnv().OPENAI_API_KEY;
}
