import {
  EventInputSchema,
  PlanSchema,
  type EventInput,
  type Plan,
} from "@/lib/schemas";
import { allocate } from "@/lib/domain/budgetEngine";
import { generateTimeline } from "@/lib/domain/timelineEngine";
import { generateVendorCategories } from "@/lib/domain/vendorTemplates";
import { generateIdeas } from "@/lib/domain/ideaSeeds";

export function createPlan(raw: EventInput): Plan {
  const input = EventInputSchema.parse(raw);
  if (input.eventType !== input.eventSpecific.type)
    throw new Error("Event details must match the event type.");
  const result = allocate(input);
  if (!result.ok) throw new Error(result.error);
  const now = new Date().toISOString();
  const timeline = generateTimeline(input);
  const local = new Date();
  const today = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
  const safeText = (text: string) =>
    /ignore|instruction|system|prompt|sk-|@|\d{7}|https?:|print|reveal|canary|stupid|idiot|hate|kill/i.test(
      text,
    )
      ? ""
      : text;
  const city = safeText(input.location.city) || "your chosen location";
  const requests = (input.mustHaves ?? []).filter(
    (x) =>
      safeText(x) &&
      !input.avoid?.some((a) => x.toLowerCase().includes(a.toLowerCase())) &&
      !/ribs|meat|beef|pork|chicken|fish|alcohol|wine|beer|dairy|cheese|nuts?/i.test(
        x,
      ),
  );
  return PlanSchema.parse({
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    version: 1,
    input,
    summary: {
      headline:
        safeText(input.title || "") || `Your ${input.eventType} in ${city}`,
      oneParagraphVision: `Bring ${input.guestCount} people together in ${city} for a ${input.vibe.join(", ") || "thoughtfully designed"} ${input.eventType}. Build the celebration around ${input.priorities.join(", ") || "good food, connection and memorable moments"}, with a practical budget and a clear path to the big day. Your chosen traditions and dietary needs guide the details; confirm these with your vendors.${requests.length ? ` Requested essentials: ${requests.join("; ")}.` : ""}`,
      keyRisks: [
        ...(input.date && input.date < today
          ? [
              "Past event date: confirm a new date; outstanding tasks need action ASAP.",
            ]
          : []),
        ...result.budget.warnings.slice(0, 2),
        ...(input.mustHaves?.length
          ? [
              "Review must-have requests against dietary restrictions and avoid items; Conflicting constraints: conflicting requests need a safe alternative.",
            ]
          : []),
        ...(input.location.indoorOutdoor === "outdoor"
          ? ["Arrange a covered backup and a weather decision deadline."]
          : []),
      ].slice(0, 5),
      assumptions: [
        "All prices are planning estimates; obtain written local quotes.",
        "Guest count includes everyone attending.",
        "Confirm accessibility, food allergies and local permissions with your vendors.",
        ...(input.eventType === "wedding"
          ? [
              "Confirm ceremony timing and any muhurat with your chosen officiant.",
            ]
          : []),
      ],
    },
    budget: result.budget,
    timeline,
    vendors: generateVendorCategories(input),
    ideas: generateIdeas(input),
    meta: { source: "fallback", promptVersion: "v2" },
  });
}
export { exampleInput } from "./examples";
