import { isAiConfigured } from "@/lib/security/env";
export function GET() {
  return Response.json(
    {
      ok: true,
      aiConfigured: isAiConfigured(),
      storage: "local-device",
      rateLimiting: "best-effort-memory-or-upstash",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
