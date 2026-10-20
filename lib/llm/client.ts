if (typeof window !== "undefined") throw new Error("LLM client is server-only");
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getServerEnv } from "@/lib/security/env";
import { reserveTokens } from "./cost";
import { outputSafe } from "./guardrails";
import { dedupeCall } from "./dedupe";
import { cacheKey } from "./cache";
let singleton: OpenAI | undefined;
export function getClient(): OpenAI | undefined {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) return undefined;
  return (singleton ??= new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: env.OPENAI_TIMEOUT_MS,
    maxRetries: env.OPENAI_MAX_RETRIES,
  }));
}
export class LlmValidationError extends Error {}
export async function moderate(
  text: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const client = getClient();
  if (!client) return true;
  try {
    return !(
      await client.moderations.create(
        { model: "omni-moderation-latest", input: text },
        { signal },
      )
    ).results.some((r) => r.flagged);
  } catch {
    return false;
  }
}
async function structuredRequest<T>({
  schema,
  name,
  messages,
  maxTokens = 1400,
  temperature = 0.4,
  signal,
}: {
  schema: z.ZodType<T>;
  name: string;
  messages: ChatCompletionMessageParam[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<{
  data: T;
  tokens: { in: number; out: number };
  repaired: boolean;
}> {
  const client = getClient();
  if (
    !client ||
    !(await reserveTokens(
      maxTokens + Math.ceil(JSON.stringify(messages).length / 3),
    ))
  )
    throw new Error("AI unavailable");
  let errors = "";
  const start = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    signal?.throwIfAborted();
    const response = await client.chat.completions.create(
      {
        model: getServerEnv().OPENAI_MODEL,
        messages: attempt
          ? [
              ...messages,
              {
                role: "developer",
                content: `Repair the response once. Validation errors: ${errors.slice(0, 1000)}. Return valid schema only.`,
              },
            ]
          : messages,
        response_format: zodResponseFormat(schema, name),
        max_completion_tokens: maxTokens,
        temperature: attempt ? 0 : temperature,
      },
      { signal },
    );
    const content = response.choices[0]?.message.content || "";
    try {
      if (!outputSafe(content)) throw new Error("Unsafe output");
      const data = schema.parse(JSON.parse(content));
      console.info(
        JSON.stringify({
          event: "llm",
          requestId: crypto.randomUUID(),
          operation: name,
          inputHash: cacheKey(messages),
          model: getServerEnv().OPENAI_MODEL,
          latencyMs: Date.now() - start,
          tokensIn: response.usage?.prompt_tokens || 0,
          tokensOut: response.usage?.completion_tokens || 0,
          outcome: attempt ? "repaired" : "valid",
        }),
      );
      return {
        data,
        tokens: {
          in: response.usage?.prompt_tokens || 0,
          out: response.usage?.completion_tokens || 0,
        },
        repaired: !!attempt,
      };
    } catch (error) {
      errors =
        error instanceof z.ZodError
          ? JSON.stringify(
              error.issues.map((i) => ({ path: i.path, code: i.code })),
            )
          : "Invalid JSON or unsafe content";
    }
  }
  throw new LlmValidationError("Model response failed validation");
}

export function callStructured<T>(
  options: Parameters<typeof structuredRequest<T>>[0],
): ReturnType<typeof structuredRequest<T>> {
  const { signal, ...input } = options;
  return dedupeCall(
    {
      name: input.name,
      messages: input.messages,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    },
    signal,
    (signal) => structuredRequest({ ...input, signal }),
  );
}
