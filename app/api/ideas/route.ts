export const runtime = "nodejs";
export const preferredRegion = "bom1";
import { z } from "zod";
import { generateIdeas } from "@/lib/domain/ideaSeeds";
import { hydratePlan, TransportPlanSchema } from "@/lib/llm/snapshot";
import { ideasSafe, cleanOutput } from "@/lib/llm/guardrails";
import { getClient, callStructured, moderate } from "@/lib/llm/client";
import { promptMessages } from "@/lib/llm/prompts";
import { checkedBody, apiError } from "@/lib/security/request";
const Body = z
  .object({
    plan: TransportPlanSchema,
    action: z
      .enum(["surprise", "similar", "cheaper", "traditional", "modern"])
      .optional(),
    ideaId: z.string().max(150).optional(),
  })
  .strict();
const Ideas = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string().max(100),
        description: z.string().max(600),
        whyItFits: z.string().max(300),
      }),
    )
    .min(1)
    .max(12),
});
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const raw = await checkedBody(request);
    const parsed = Body.safeParse(raw);
    const body = parsed.success
      ? parsed.data
      : {
          plan: TransportPlanSchema.parse(raw),
          action: undefined,
          ideaId: undefined,
        };
    const plan = hydratePlan(body.plan);
    const target = plan.ideas.find((i) => i.id === body.ideaId);
    const input = {
      ...plan.input,
      vibe:
        body.action === "traditional" || body.action === "modern"
          ? [body.action, ...plan.input.vibe.filter((v) => v !== body.action)]
          : plan.input.vibe,
    };
    let ideas = generateIdeas(
      input,
      plan.ideas.map((i) => i.title),
    );
    if (body.action === "similar" && target) {
      const same = ideas.filter(
        (i) =>
          i.kind === target.kind || i.tags.some((t) => target.tags.includes(t)),
      );
      if (same.length) ideas = same;
    }
    if (body.action === "cheaper") {
      const max = target?.estCost.max ?? input.totalBudget * 0.05;
      ideas = ideas
        .filter((i) => i.estCost.max <= max)
        .sort((a, b) => a.estCost.max - b.estCost.max);
    }
    if (!ideas.length) {
      ideas = generateIdeas(input)
        .filter(
          (i) => body.action !== "similar" || !target || i.kind === target.kind,
        )
        .map((i) => ({
          ...i,
          id: crypto.randomUUID(),
          title:
            i.title +
            ": " +
            (body.action === "cheaper"
              ? "simple gathering"
              : body.action === "traditional"
                ? "traditions edition"
                : body.action === "modern"
                  ? "contemporary edition"
                  : "fresh approach"),
          description:
            body.action === "cheaper"
              ? "Use a smaller, reusable version. " + i.description
              : i.description,
          estCost:
            body.action === "cheaper"
              ? {
                  min: 0,
                  max: Math.min(
                    i.estCost.max,
                    target?.estCost.max ?? input.totalBudget * 0.05,
                  ),
                }
              : i.estCost,
        }));
    }
    ideas = ideas.filter((i) => ideasSafe(JSON.stringify(i), input));
    let source: "ai" | "fallback" = "fallback";
    if (getClient() && ideas.length) {
      try {
        if (await moderate(JSON.stringify(input), request.signal)) {
          const result = await callStructured({
            schema: Ideas,
            name: "more_ideas",
            messages: promptMessages(
              {
                input,
                action: body.action,
                target,
                existingTitles: plan.ideas.map((i) => i.title),
                candidateIdeas: ideas.map((i) => ({
                  title: i.title,
                  kind: i.kind,
                  maxEstimate: i.estCost.max,
                })),
              },
              "Personalize the supplied candidate ideas for the requested action. Preserve their order and intended kind. Do not repeat existing titles; respect diets and avoid terms.",
            ),
            temperature: 0.8,
            maxTokens: 1400,
            signal: request.signal,
          });
          ideas = ideas.map((idea, i) => {
            const next = result.data.ideas[i];
            return next && ideasSafe(JSON.stringify(next), input)
              ? {
                  ...idea,
                  title: cleanOutput(next.title),
                  description: cleanOutput(next.description),
                  whyItFits: cleanOutput(next.whyItFits),
                }
              : idea;
          });
          source = "ai";
        }
      } catch {
        if (request.signal.aborted) throw request.signal.reason;
      }
    }
    const seen = new Set(plan.ideas.map((i) => i.title.toLowerCase()));
    ideas = ideas.filter((i) => {
      const title = i.title.toLowerCase();
      if (seen.has(title)) return false;
      seen.add(title);
      return true;
    });
    return Response.json(
      { ideas, source },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
