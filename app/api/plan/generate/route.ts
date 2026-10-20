import { EventInputSchema } from "@/lib/schemas";
import { createPlan } from "@/lib/domain/planner";
import { generatePlan } from "@/lib/llm/generatePlan";
import { sseResponse } from "@/lib/llm/sse";
import { sanitizeData } from "@/lib/llm/guardrails";
import { checkedBody, apiError } from "@/lib/security/request";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const input = EventInputSchema.parse(await checkedBody(request));
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
