export const runtime = "nodejs";
export const preferredRegion = "bom1";
import { EventInputSchema } from "@/lib/schemas";
import { createPlan } from "@/lib/domain/planner";
import { generatePlan } from "@/lib/llm/generatePlan";
import { sseResponse } from "@/lib/llm/sse";
import { sanitizeData } from "@/lib/llm/guardrails";
import { checkedBody, apiError } from "@/lib/security/request";
import { z } from "zod";
import { hydratePlan, TransportPlanSchema } from "@/lib/llm/snapshot";
import { createPlanEnhancement } from "@/lib/llm/planEnhancement";
const Body = z.union([
  EventInputSchema,
  z.strictObject({ mode: z.literal("refine"), plan: TransportPlanSchema }),
]);
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = Body.parse(await checkedBody(request));
    if ("mode" in body) {
      const context = hydratePlan(body.plan);
      context.meta = { source: "fallback", promptVersion: "2026-10-v2" };
      const updated = await generatePlan(context.input, {
        currentPlan: context,
        signal: request.signal,
      });
      request.signal.throwIfAborted();
      return Response.json(createPlanEnhancement(context, updated), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const input = body;
    return sseResponse(request, async (send, signal) => {
      const skeleton = createPlan(sanitizeData(input));
      send("status", { message: "Building your celebration" });
      send("skeleton", skeleton);
      for (const section of [
        "summary",
        "budget",
        "timeline",
        "vendors",
        "ideas",
      ] as const)
        send(section, skeleton[section]);
      const plan = await generatePlan(input, { signal });
      for (const section of [
        "summary",
        "budget",
        "timeline",
        "vendors",
        "ideas",
      ] as const)
        send(section, plan[section]);
      send("complete", plan);
    });
  } catch (error) {
    return apiError(error);
  }
}
