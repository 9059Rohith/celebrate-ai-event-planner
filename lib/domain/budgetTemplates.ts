export interface BudgetTemplate {
  category: string;
  label: string;
  defaultPct: number;
  minPct: number;
  maxPct: number;
}

const WEDDING_TEMPLATE: BudgetTemplate[] = [
  {
    category: "venue",
    label: "Venue & Rentals",
    defaultPct: 18,
    minPct: 10,
    maxPct: 35,
  },
  {
    category: "catering",
    label: "Catering & Beverages",
    defaultPct: 32,
    minPct: 20,
    maxPct: 50,
  },
  {
    category: "decor",
    label: "Decor & Florals",
    defaultPct: 12,
    minPct: 5,
    maxPct: 25,
  },
  {
    category: "photography",
    label: "Photography & Video",
    defaultPct: 9,
    minPct: 3,
    maxPct: 20,
  },
  {
    category: "attire",
    label: "Attire & Beauty",
    defaultPct: 8,
    minPct: 3,
    maxPct: 18,
  },
  {
    category: "music",
    label: "Music/DJ & Entertainment",
    defaultPct: 6,
    minPct: 2,
    maxPct: 15,
  },
  {
    category: "invitations",
    label: "Invitations & Stationery",
    defaultPct: 2,
    minPct: 0.5,
    maxPct: 5,
  },
  {
    category: "rituals",
    label: "Rituals, Priest & Mandap",
    defaultPct: 3,
    minPct: 1,
    maxPct: 8,
  },
  {
    category: "transport",
    label: "Transport & Logistics",
    defaultPct: 3,
    minPct: 1,
    maxPct: 8,
  },
  {
    category: "accommodation",
    label: "Guest Accommodation",
    defaultPct: 4,
    minPct: 0,
    maxPct: 12,
  },
  {
    category: "gifts",
    label: "Gifts & Favors",
    defaultPct: 1.5,
    minPct: 0,
    maxPct: 5,
  },
  {
    category: "misc",
    label: "Miscellaneous",
    defaultPct: 1.5,
    minPct: 0.5,
    maxPct: 5,
  },
];

const BIRTHDAY_TEMPLATE: BudgetTemplate[] = [
  {
    category: "venue",
    label: "Venue & Rentals",
    defaultPct: 20,
    minPct: 8,
    maxPct: 40,
  },
  {
    category: "catering",
    label: "Catering & Cake",
    defaultPct: 38,
    minPct: 20,
    maxPct: 55,
  },
  {
    category: "decor",
    label: "Decor & Balloons",
    defaultPct: 10,
    minPct: 3,
    maxPct: 25,
  },
  {
    category: "entertainment",
    label: "Entertainment & Activities",
    defaultPct: 14,
    minPct: 5,
    maxPct: 30,
  },
  {
    category: "photography",
    label: "Photography",
    defaultPct: 4,
    minPct: 0,
    maxPct: 15,
  },
  {
    category: "invitations",
    label: "Invitations",
    defaultPct: 2,
    minPct: 0,
    maxPct: 8,
  },
  {
    category: "gifts",
    label: "Return Gifts & Favors",
    defaultPct: 6,
    minPct: 0,
    maxPct: 15,
  },
  {
    category: "misc",
    label: "Logistics & Miscellaneous",
    defaultPct: 6,
    minPct: 1,
    maxPct: 12,
  },
];

const COMMUNITY_TEMPLATE: BudgetTemplate[] = [
  {
    category: "venue",
    label: "Venue & Permits",
    defaultPct: 18,
    minPct: 8,
    maxPct: 35,
  },
  {
    category: "food",
    label: "Food & Refreshments",
    defaultPct: 24,
    minPct: 10,
    maxPct: 40,
  },
  {
    category: "av-sound",
    label: "AV, Sound & Lighting",
    defaultPct: 14,
    minPct: 5,
    maxPct: 25,
  },
  {
    category: "marketing",
    label: "Marketing & Printing",
    defaultPct: 10,
    minPct: 2,
    maxPct: 20,
  },
  {
    category: "staffing",
    label: "Staffing & Volunteer Support",
    defaultPct: 8,
    minPct: 2,
    maxPct: 18,
  },
  {
    category: "safety",
    label: "Safety, First Aid & Insurance",
    defaultPct: 7,
    minPct: 3,
    maxPct: 15,
  },
  {
    category: "programming",
    label: "Entertainment & Programming",
    defaultPct: 10,
    minPct: 3,
    maxPct: 25,
  },
  {
    category: "supplies",
    label: "Supplies & Rentals",
    defaultPct: 6,
    minPct: 2,
    maxPct: 15,
  },
  {
    category: "misc",
    label: "Miscellaneous",
    defaultPct: 3,
    minPct: 0.5,
    maxPct: 8,
  },
];

export function getTemplate(eventType: string): BudgetTemplate[] {
  switch (eventType) {
    case "wedding":
      return WEDDING_TEMPLATE.map((t) => ({ ...t }));
    case "birthday":
      return BIRTHDAY_TEMPLATE.map((t) => ({ ...t }));
    case "community":
      return COMMUNITY_TEMPLATE.map((t) => ({ ...t }));
    default:
      return BIRTHDAY_TEMPLATE.map((t) => ({ ...t }));
  }
}

// ─── City tier heuristics ─────────────────────────────────────────

const TIER1_CITIES = [
  "mumbai",
  "delhi",
  "bangalore",
  "bengaluru",
  "chennai",
  "kolkata",
  "hyderabad",
  "pune",
  "ahmedabad",
  "new delhi",
  "gurgaon",
  "gurugram",
  "noida",
  "new york",
  "london",
  "san francisco",
  "los angeles",
];
const TIER2_CITIES = [
  "jaipur",
  "lucknow",
  "chandigarh",
  "kochi",
  "indore",
  "bhopal",
  "nagpur",
  "coimbatore",
  "mysore",
  "visakhapatnam",
  "vizag",
  "surat",
  "vadodara",
  "thiruvananthapuram",
];

export function getCityTier(city: string): 1 | 2 | 3 {
  const lower = city.toLowerCase().trim();
  if (TIER1_CITIES.includes(lower)) return 1;
  if (TIER2_CITIES.includes(lower)) return 2;
  return 3;
}

export function getCityMultiplier(city: string): number {
  const tier = getCityTier(city);
  if (tier === 1) return 1.25;
  if (tier === 2) return 1.0;
  return 0.85;
}

// ─── Default contingency ──────────────────────────────────────────

export function getDefaultContingencyPct(
  eventType: string,
  flexibility: string,
): number {
  let base: number;
  switch (eventType) {
    case "wedding":
      base = 10;
      break;
    case "birthday":
      base = 8;
      break;
    case "community":
      base = 12;
      break;
    default:
      base = 10;
  }
  if (flexibility === "strict") base += 2;
  return base;
}

// ─── Priority boost ───────────────────────────────────────────────

export function applyPriorityBoost(
  weights: Map<string, number>,
  priorities: string[],
  templates: BudgetTemplate[],
): void {
  const boosts = [10, 6, 3]; // relative % increase for top 3
  priorities.forEach((priority, idx) => {
    if (idx >= boosts.length) return;
    const current = weights.get(priority);
    if (current !== undefined) {
      const template = templates.find((t) => t.category === priority);
      const maxPct = template?.maxPct ?? 50;
      const boosted = Math.min(current * (1 + boosts[idx] / 100), maxPct);
      weights.set(priority, boosted);
    }
  });
}

// ─── Dietary/vibe adjustments ─────────────────────────────────────

export function applyVibeAdjustments(
  weights: Map<string, number>,
  vibe: string[],
  dietary: string[],
): void {
  if (vibe.includes("luxury")) {
    adjustWeight(weights, "decor", 1.2);
    adjustWeight(weights, "attire", 1.1);
  }
  if (vibe.includes("minimalist")) {
    adjustWeight(weights, "decor", 0.75);
    adjustWeight(weights, "invitations", 0.8);
  }
  if (vibe.includes("eco-friendly")) {
    adjustWeight(weights, "decor", 0.9);
  }
  if (vibe.includes("music")) {
    adjustWeight(weights, "music", 1.2);
    adjustWeight(weights, "entertainment", 1.15);
  }
  if (vibe.includes("fun") || vibe.includes("kids-focused")) {
    adjustWeight(weights, "entertainment", 1.2);
    adjustWeight(weights, "activities", 1.15);
  }
  // Dietary specialization typically increases catering cost
  const specialDiets = ["vegan", "jain", "halal", "kosher", "gluten-free"];
  const specialCount = dietary.filter((d) => specialDiets.includes(d)).length;
  if (specialCount > 0) {
    adjustWeight(weights, "catering", 1 + 0.05 * specialCount);
    adjustWeight(weights, "food", 1 + 0.05 * specialCount);
  }
}

function adjustWeight(
  weights: Map<string, number>,
  category: string,
  multiplier: number,
): void {
  const current = weights.get(category);
  if (current !== undefined) {
    weights.set(category, current * multiplier);
  }
}
