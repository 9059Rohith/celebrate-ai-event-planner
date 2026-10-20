import { EventInputSchema, type EventInput } from "@/lib/schemas/event";

export function exampleInput(
  type: EventInput["eventType"] = "wedding",
): EventInput {
  return EventInputSchema.parse({
    eventType: type,
    title: "",
    planningWeeks: 16,
    location: { city: "Hyderabad", country: "India", indoorOutdoor: "either" },
    guestCount: type === "wedding" ? 250 : type === "birthday" ? 40 : 150,
    totalBudget:
      type === "wedding" ? 800000 : type === "birthday" ? 30000 : 150000,
    currency: "INR",
    budgetFlexibility: "some",
    dietary: ["vegetarian"],
    vibe: ["modern", "elegant"],
    priorities: ["catering", "venue", "decor"],
    eventSpecific:
      type === "wedding"
        ? {
            type,
            functions: ["haldi", "ceremony", "reception"],
            days: 2,
            destination: false,
          }
        : type === "birthday"
          ? {
              type,
              honoreeAge: 25,
              honoreeInterests: ["music"],
              milestone: true,
            }
          : {
              type,
              purpose: "festival",
              ticketed: false,
              volunteersAvailable: 10,
            },
  });
}
