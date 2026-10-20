export const runtime = "nodejs";
export const preferredRegion = "bom1";
import { timingSafeEqual } from "node:crypto";
import { runEvaluation } from "@/evals/harness";
import { rateLimit } from "@/lib/security/rateLimit";
export const maxDuration = 60;
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return Response.json({ error: "Origin not allowed." }, { status: 403 });
  if (!(await rateLimit(request)))
    return Response.json(
      { error: "Please wait before running another evaluation." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  const expected = process.env.EVAL_SECRET;
  const actual = request.headers.get("x-eval-secret") || "";
  if (!expected)
    return Response.json(
      {
        error: "Mini evaluations are disabled until EVAL_SECRET is configured.",
      },
      { status: 503 },
    );
  if (
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return Response.json(
      { error: "Invalid evaluation secret." },
      { status: 403 },
    );
  if (Number(request.headers.get("content-length") || 0) > 32768)
    return Response.json({ error: "Request too large." }, { status: 413 });
  try {
    const live = !!process.env.OPENAI_API_KEY;
    const result = await runEvaluation({
      suite: "deterministic",
      mock: !live,
      limit: 5,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      promptVersion: "v2",
      concurrency: 3,
      maxUsd: 1,
      signal: request.signal,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Evaluation unavailable. Retry later or run the offline CLI." },
      { status: 503 },
    );
  }
}
