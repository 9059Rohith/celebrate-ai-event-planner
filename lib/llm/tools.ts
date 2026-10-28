import { z } from "zod";
import { IdeaKindEnum, EffortEnum, PlanSchema, type Plan } from "@/lib/schemas";
import {
  rebalance,
  setContingency,
  summarizeBudget,
  validateBudget,
} from "@/lib/domain/budgetEngine";
import { milestoneDueDate } from "@/lib/domain/calendar";
import { ideasSafe, cleanOutput } from "./guardrails";
const text = z.string().min(1).max(500);
export const toolArguments = {
  update_budget_line: z
    .object({
      category: text,
      newPct: z.number().min(0).max(100).nullable().optional(),
      newAmount: z.number().min(0).nullable().optional(),
      lock: z.boolean().nullable().optional(),
    })
    .strict(),
  set_contingency: z.object({ pct: z.number().min(5).max(20) }).strict(),
  add_milestone: z
    .object({
      title: text,
      dueOffsetDays: z.number().int().min(-1092).max(0),
      priority: z.enum(["must", "should", "nice"]),
      category: text,
      notes: z.string().max(500),
    })
    .strict(),
  update_milestone: z
    .object({
      id: text,
      status: z.enum(["todo", "doing", "done"]).nullable().optional(),
      dueOffsetDays: z.number().int().min(-1092).max(0).nullable().optional(),
      notes: z.string().max(500).nullable().optional(),
    })
    .strict(),
  add_checklist_item: z
    .object({ vendorCategory: text, text, critical: z.boolean() })
    .strict(),
  add_vendor_category: z.object({ category: text, why: text }).strict(),
  add_idea: z
    .object({
      kind: IdeaKindEnum,
      title: text,
      description: text,
      estCost: z
        .object({ min: z.number().min(0), max: z.number().min(0) })
        .strict(),
      effort: EffortEnum,
      tags: z.array(text).max(10),
    })
    .strict(),
  regenerate_section: z
    .object({
      section: z.enum(["budget", "timeline", "vendors", "ideas"]),
      instructions: z.string().max(1000),
    })
    .strict(),
  compare_options: z
    .object({
      optionA: text,
      optionB: text,
      criteria: z.array(text).min(1).max(10),
    })
    .strict(),
  set_total_budget: z
    .object({ value: z.number().positive().max(1000000000) })
    .strict(),
  set_guest_count: z
    .object({ value: z.number().int().min(2).max(5000) })
    .strict(),
};
export const ToolProposalSchema = z
  .object({
    id: z.string().min(1).max(150),
    name: z.enum(
      Object.keys(toolArguments) as [
        keyof typeof toolArguments,
        ...(keyof typeof toolArguments)[],
      ],
    ),
    arguments: z.record(z.string(), z.unknown()),
  })
  .strict()
  .superRefine((p, ctx) => {
    const result = toolArguments[p.name].safeParse(p.arguments);
    if (!result.success)
      ctx.addIssue({ code: "custom", message: "Invalid tool arguments" });
  });
export type ToolProposal = z.infer<typeof ToolProposalSchema>;
export function toolDefinitions() {
  return Object.entries(toolArguments).map(([name, schema]) => {
    const json = z.toJSONSchema(schema) as Record<string, unknown>;
    delete json.$schema;
    const properties = json.properties as Record<
      string,
      Record<string, unknown>
    >;
    for (const [key, value] of Object.entries(properties)) {
      if (!(json.required as string[] | undefined)?.includes(key))
        properties[key] = { anyOf: [value, { type: "null" }] };
    }
    json.required = Object.keys(properties);
    return {
      type: "function" as const,
      function: {
        name,
        description: `Propose ${name.replaceAll("_", " ")}; user confirmation is required before application.`,
        strict: true,
        parameters: json,
      },
    };
  });
}
/** Pure client-side execution after explicit user acceptance. */
export function executeToolProposal(current: Plan, raw: ToolProposal): Plan {
  const proposal = ToolProposalSchema.parse(raw);
  const plan = structuredClone(current);
  const a = proposal.arguments;
  const id = crypto.randomUUID();
  switch (proposal.name) {
    case "update_budget_line": {
      const args = toolArguments.update_budget_line.parse(a);
      const line = plan.budget.lines.find((l) => l.category === args.category);
      if (!line) throw new Error("Unknown budget category");
      if (args.newPct != null || args.newAmount != null) {
        if (args.newPct != null && args.newAmount != null)
          throw new Error("Choose amount or percentage");
        const result = rebalance(
          plan.budget.lines,
          line.id,
          {
            pct: args.newPct ?? undefined,
            amount: args.newAmount ?? undefined,
          },
          plan.budget.total - plan.budget.contingencyAmount,
        );
        if (!result.ok) throw new Error(result.error);
        plan.budget.lines = result.lines;
      }
      if (args.lock != null)
        plan.budget.lines = plan.budget.lines.map((l) =>
          l.id === line.id ? { ...l, locked: args.lock! } : l,
        );
      break;
    }
    case "set_contingency": {
      const args = toolArguments.set_contingency.parse(a);
      const result = setContingency(plan.budget, args.pct);
      if (!result.ok) throw new Error(result.error);
      plan.budget = result.budget;
      break;
    }
    case "set_total_budget":
    case "set_guest_count": {
      const value = Number(a.value);
      plan.input = {
        ...plan.input,
        ...(proposal.name === "set_total_budget"
          ? { totalBudget: value }
          : { guestCount: value }),
      };
      if (proposal.name === "set_total_budget") {
        const adjusted = setContingency(
          {
            ...plan.budget,
            total: value,
          },
          plan.budget.contingencyPct,
        );
        if (!adjusted.ok) throw new Error(adjusted.error);
        plan.budget = adjusted.budget;
      }
      break;
    }
    case "add_milestone": {
      const args = toolArguments.add_milestone.parse(a);
      plan.timeline.milestones.push({
        ...args,
        title: cleanOutput(args.title),
        notes: cleanOutput(args.notes),
        id,
        status: "todo",
        dependsOn: [],
        dueDate: milestoneDueDate(plan.timeline.eventDate, args.dueOffsetDays),
      });
      break;
    }
    case "update_milestone": {
      const args = toolArguments.update_milestone.parse(a);
      const milestone = plan.timeline.milestones.find((m) => m.id === args.id);
      if (!milestone) throw new Error("Unknown milestone");
      if (args.status) milestone.status = args.status;
      if (args.notes != null) milestone.notes = cleanOutput(args.notes);
      if (args.dueOffsetDays != null) {
        milestone.dueOffsetDays = args.dueOffsetDays;
        milestone.dueDate = milestoneDueDate(
          plan.timeline.eventDate,
          args.dueOffsetDays,
        );
      }
      break;
    }
    case "add_checklist_item": {
      const args = toolArguments.add_checklist_item.parse(a);
      const vendor = plan.vendors.find(
        (v) => v.category === args.vendorCategory,
      );
      if (!vendor) throw new Error("Unknown vendor category");
      vendor.checklist.push({
        id,
        text: cleanOutput(args.text),
        critical: args.critical,
        done: false,
      });
      break;
    }
    case "add_vendor_category": {
      const args = toolArguments.add_vendor_category.parse(a);
      if (plan.vendors.some((v) => v.category === args.category))
        throw new Error("Category already exists");
      plan.vendors.push({
        id,
        category: cleanOutput(args.category),
        why: cleanOutput(args.why),
        bookLeadWeeks: 4,
        estPriceRange: { min: 0, max: 0, unit: "estimate; request quotes" },
        checklist: [],
        questionsToAsk: ["Request an itemized written quote."],
        redFlags: ["No written contract."],
        contractMustHaves: ["Scope, payment, cancellation and safety terms."],
        status: "not-started",
      });
      break;
    }
    case "add_idea": {
      const args = toolArguments.add_idea.parse(a);
      if (
        args.estCost.max < args.estCost.min ||
        args.estCost.max > plan.budget.total ||
        !ideasSafe(JSON.stringify(args), plan.input)
      )
        throw new Error("Idea conflicts with plan constraints");
      plan.ideas.push({
        ...args,
        title: cleanOutput(args.title),
        description: cleanOutput(args.description),
        tags: args.tags.map(cleanOutput),
        id,
        saved: false,
        whyItFits: "Added after your review.",
      });
      break;
    }
    case "regenerate_section":
      throw new Error("Regeneration requires a server request and preview.");
    case "compare_options":
      return current;
  }
  plan.budget = { ...plan.budget, ...summarizeBudget(plan.input, plan.budget) };
  if (validateBudget(plan.budget).length)
    throw new Error("Budget invariants failed");
  plan.updatedAt = new Date().toISOString();
  plan.version++;
  return PlanSchema.parse(plan);
}
