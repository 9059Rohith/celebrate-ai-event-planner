import { z } from "zod";
import { createPlan } from "@/lib/domain/planner";
import { PlanSchema, type EventInput, type Plan } from "@/lib/schemas";
import { callStructured, getClient, moderate } from "./client";
import { cleanOutput, ideasSafe, sanitizeData } from "./guardrails";
import { promptMessages, type PromptVersion } from "./prompts";
import { cacheGet, cacheKey, cacheSet } from "./cache";
const Enhancement = z.object({
  vision: z.string().max(2000),
  risks: z.array(z.string().max(300)).max(5),
  assumptions: z.array(z.string().max(300)).max(5),
  budgetNotes: z.array(
    z.object({ category: z.string(), notes: z.string().max(500) }),
  ),
  timelineNotes: z.array(
    z.object({ id: z.string(), notes: z.string().max(500) }),
  ),
  vendorNotes: z.array(
    z.object({
      category: z.string(),
      why: z.string().max(500),
      questions: z.array(z.string().max(300)).max(3),
    }),
  ),
  ideas: z
    .array(
      z.object({
        title: z.string().max(100),
        description: z.string().max(800),
        whyItFits: z.string().max(500),
      }),
    )
    .max(12),
});
export async function generatePlan(
  input: EventInput,
  options: {
    signal?: AbortSignal;
    promptVersion?: PromptVersion;
    instructions?: string;
    currentPlan?: Plan;
  } = {},
): Promise<Plan> {
  const start = Date.now();
  const safe = sanitizeData(input);
  const plan = options.currentPlan
    ? structuredClone(options.currentPlan)
    : createPlan(safe);
  const version = options.promptVersion || "v2";
  plan.meta.promptVersion = `2026-10-${version.endsWith("v1") ? "v1" : "v2"}`;
  if (!getClient()) return plan;
  const key = cacheKey({
    input: safe,
    version,
    instructions: options.instructions,
    current: options.currentPlan
      ? { budget: plan.budget, ideas: plan.ideas.map((i) => i.title) }
      : undefined,
  });
  const cached = await cacheGet<z.infer<typeof Enhancement>>(key);
  try {
    options.signal?.throwIfAborted();
    if (!cached && !(await moderate(JSON.stringify(safe), options.signal)))
      return plan;
    const result = cached
      ? { data: cached, tokens: { in: 0, out: 0 } }
      : await callStructured({
          schema: Enhancement,
          name: "event_enhancement",
          messages: promptMessages(
            {
              input: safe,
              instructions: options.instructions,
              budget: plan.budget.lines.map((l) => ({
                category: l.category,
                amount: l.allocatedAmount,
              })),
              milestones: plan.timeline.milestones.map((m) => ({
                id: m.id,
                title: m.title,
              })),
              vendors: plan.vendors.map((v) => v.category),
              ideas: plan.ideas.map((i) => ({ title: i.title, kind: i.kind })),
            },
            "Personalize vision, risks, assumptions, budget rationale, milestone notes, vendor questions and ideas. Keep supplied identifiers and idea kinds. Do not calculate or alter amounts.",
            version,
          ),
          maxTokens: 3000,
          signal: options.signal,
        });
    const data = result.data;
    plan.summary.oneParagraphVision = cleanOutput(data.vision);
    plan.summary.keyRisks = [
      ...plan.summary.keyRisks,
      ...data.risks.map(cleanOutput),
    ].slice(0, 5);
    plan.summary.assumptions.push(...data.assumptions.map(cleanOutput));
    plan.budget.lines = plan.budget.lines.map((l) => ({
      ...l,
      notes: cleanOutput(
        data.budgetNotes.find((n) => n.category === l.category)?.notes ||
          l.notes,
      ),
    }));
    plan.timeline.milestones = plan.timeline.milestones.map((m) => ({
      ...m,
      notes: cleanOutput(
        data.timelineNotes.find((n) => n.id === m.id)?.notes || m.notes,
      ),
    }));
    plan.vendors = plan.vendors.map((v) => {
      const n = data.vendorNotes.find((n) => n.category === v.category);
      return n
        ? {
            ...v,
            why: cleanOutput(n.why),
            questionsToAsk: [
              ...v.questionsToAsk,
              ...n.questions.map(cleanOutput),
            ],
          }
        : v;
    });
    plan.ideas = plan.ideas.map((idea, i) => {
      const next = data.ideas[i];
      return next && ideasSafe(JSON.stringify(next), safe)
        ? {
            ...idea,
            title: cleanOutput(next.title),
            description: cleanOutput(next.description),
            whyItFits: cleanOutput(next.whyItFits),
          }
        : idea;
    });
    plan.meta = {
      source: "hybrid",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      promptVersion: plan.meta.promptVersion,
      latencyMs: Date.now() - start,
      tokens: result.tokens,
      cached: !!cached,
    };
    if (!cached) await cacheSet(key, data);
    return PlanSchema.parse(plan);
  } catch {
    if (options.signal?.aborted) throw options.signal.reason;
    const fallback = options.currentPlan
      ? structuredClone(options.currentPlan)
      : createPlan(safe);
    fallback.meta = {
      source: "fallback",
      promptVersion: plan.meta.promptVersion,
      latencyMs: Date.now() - start,
    };
    return fallback;
  }
}
