export const runtime = "nodejs";
export const preferredRegion = "bom1";
import { z } from "zod";
import { generatePlan } from "@/lib/llm/generatePlan";
import { hydratePlan, TransportPlanSchema } from "@/lib/llm/snapshot";
import { callStructured, getClient, moderate } from "@/lib/llm/client";
import { promptMessages } from "@/lib/llm/prompts";
import { cleanOutput } from "@/lib/llm/guardrails";
import { applyAiSuggestion, validateBudget } from "@/lib/domain/budgetEngine";
import { checkedBody, apiError } from "@/lib/security/request";
import { createSectionRefinement } from "@/lib/llm/refinement";
const Body = z
  .object({
    plan: TransportPlanSchema,
    section: z.enum(["budget", "timeline", "vendors", "ideas"]),
    instructions: z.string().max(1000).optional(),
  })
  .strict();
const BudgetAdvice = z.object({
  notes: z
    .array(z.object({ category: z.string(), notes: z.string().max(500) }))
    .max(30),
  suggestions: z
    .array(
      z.object({
        category: z.string(),
        deltaPct: z.number().min(-10).max(10),
        reason: z.string().max(300),
      }),
    )
    .max(3),
});
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = Body.parse(await checkedBody(request));
    const plan = hydratePlan(body.plan);
    if (body.section === "budget") {
      const budget = structuredClone(plan.budget);
      let suggestions: z.infer<typeof BudgetAdvice>["suggestions"] = [];
      let meta = { ...plan.meta, source: "fallback" as "fallback" | "hybrid" };
      if (getClient())
        try {
          if (
            await moderate(
              body.instructions || "Optimize the event budget safely",
              request.signal,
            )
          ) {
            const result = await callStructured({
              schema: BudgetAdvice,
              name: "budget_advice",
              messages: promptMessages(
                { input: plan.input, budget, instructions: body.instructions },
                "Personalize budget notes and propose up to three percentage adjustments. Locked lines must not change. Engine percentages describe shares of distributable budget excluding contingency. Never calculate money.",
              ),
              maxTokens: 700,
              signal: request.signal,
            });
            suggestions = result.data.suggestions
              .filter((s) =>
                budget.lines.some(
                  (l) => l.category === s.category && !l.locked,
                ),
              )
              .map((s) => ({ ...s, reason: cleanOutput(s.reason) }));
            const adjusted = applyAiSuggestion(
              budget.lines,
              suggestions,
              budget.total - budget.contingencyAmount,
            );
            if (adjusted.ok) {
              const next = { ...budget, lines: adjusted.lines };
              if (
                !validateBudget(next).length &&
                budget.lines
                  .filter((l) => l.locked)
                  .every(
                    (l) =>
                      next.lines.find((n) => n.id === l.id)?.allocatedAmount ===
                      l.allocatedAmount,
                  )
              )
                budget.lines = next.lines;
              else suggestions = [];
            } else suggestions = [];
            budget.lines = budget.lines.map((line) => {
              const note = result.data.notes.find(
                (n) => n.category === line.category,
              );
              return note ? { ...line, notes: cleanOutput(note.notes) } : line;
            });
            meta = {
              source: "hybrid",
              promptVersion: "2026-10-v2",
              tokens: result.tokens,
            };
          }
        } catch {
          if (request.signal.aborted) throw request.signal.reason;
        }
      return Response.json(
        {
          refinement: createSectionRefinement("budget", plan, {
            ...plan,
            budget,
          }),
          suggestions,
          meta,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const updated = await generatePlan(plan.input, {
      signal: request.signal,
      instructions: body.instructions,
      currentPlan: plan,
    });
    return Response.json(
      {
        refinement: createSectionRefinement(body.section, plan, updated),
        meta: updated.meta,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
