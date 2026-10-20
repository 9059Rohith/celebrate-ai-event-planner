/**
 * Event type configuration
 * Adding a new event type is a config change, not a rewrite.
 */

export interface EventTypeConfig {
  id: string;
  label: string;
  emoji: string;
  description: string;
  defaultContingencyPct: number;
  defaultCategories: string[];
  sampleTitle: string;
  sampleBudget: { INR: number; USD: number; EUR: number; GBP: number };
  sampleGuests: number;
  sampleCity: string;
}

export const EVENT_TYPES: Record<string, EventTypeConfig> = {
  wedding: {
    id: "wedding",
    label: "Wedding",
    emoji: "💒",
    description:
      "Plan your dream wedding — from intimate ceremonies to grand multi-day celebrations.",
    defaultContingencyPct: 10,
    defaultCategories: [
      "venue",
      "catering",
      "decor",
      "photography",
      "attire",
      "music",
      "invitations",
      "rituals",
      "transport",
      "accommodation",
      "gifts",
      "misc",
    ],
    sampleTitle: "Our Dream Wedding",
    sampleBudget: { INR: 800000, USD: 15000, EUR: 14000, GBP: 12000 },
    sampleGuests: 250,
    sampleCity: "Hyderabad",
  },
  birthday: {
    id: "birthday",
    label: "Birthday",
    emoji: "🎂",
    description:
      "Create an unforgettable birthday celebration for any age — kids, teens, or adults.",
    defaultContingencyPct: 8,
    defaultCategories: [
      "venue",
      "catering",
      "decor",
      "entertainment",
      "photography",
      "invitations",
      "gifts",
      "misc",
    ],
    sampleTitle: "Riya's 5th Birthday Bash",
    sampleBudget: { INR: 50000, USD: 1000, EUR: 900, GBP: 800 },
    sampleGuests: 30,
    sampleCity: "Mumbai",
  },
  community: {
    id: "community",
    label: "Community Event",
    emoji: "🎪",
    description:
      "Organize festivals, fundraisers, meetups, sports days, and cultural gatherings.",
    defaultContingencyPct: 12,
    defaultCategories: [
      "venue",
      "food",
      "av-sound",
      "marketing",
      "staffing",
      "safety",
      "programming",
      "supplies",
      "misc",
    ],
    sampleTitle: "Annual Colony Festival",
    sampleBudget: { INR: 200000, USD: 5000, EUR: 4500, GBP: 4000 },
    sampleGuests: 500,
    sampleCity: "Pune",
  },
};

export function getEventTypeConfig(eventType: string): EventTypeConfig {
  return EVENT_TYPES[eventType] ?? EVENT_TYPES.birthday;
}
