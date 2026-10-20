/**
 * Idea Seeds — curated fallback ideas for each event type and kind.
 * Used when AI is unavailable.
 */

import type { EventInput, Idea } from "@/lib/schemas";

interface IdeaSeed {
  kind: Idea["kind"];
  title: string;
  description: string;
  effort: Idea["effort"];
  tags: string[];
  costMultiplier: number; // fraction of total budget
  suitableFor: string[]; // event types
  vibes?: string[]; // matching vibes
  diets?: string[]; // relevant dietary tags
}

const IDEA_SEEDS: IdeaSeed[] = [
  // Themes
  {
    kind: "theme",
    title: "Rustic Garden Party",
    description:
      "Natural greenery, wooden elements, mason jar centerpieces, and fairy lights create a warm, earthy atmosphere.",
    effort: "medium",
    tags: ["rustic", "outdoor", "green"],
    costMultiplier: 0.03,
    suitableFor: ["wedding", "birthday"],
    vibes: ["rustic", "eco-friendly"],
  },
  {
    kind: "theme",
    title: "Royal Rajasthani",
    description:
      "Rich colors, marigold garlands, puppet decor, mirror work, and traditional Rajasthani motifs for a regal celebration.",
    effort: "high",
    tags: ["traditional", "indian", "luxury"],
    costMultiplier: 0.05,
    suitableFor: ["wedding"],
    vibes: ["traditional", "luxury"],
  },
  {
    kind: "theme",
    title: "Minimalist Elegance",
    description:
      "Clean lines, monochrome palette with a single accent color, geometric shapes, and curated simplicity.",
    effort: "low",
    tags: ["modern", "minimal"],
    costMultiplier: 0.02,
    suitableFor: ["wedding", "birthday"],
    vibes: ["minimalist", "modern", "elegant"],
  },
  {
    kind: "theme",
    title: "Bollywood Night",
    description:
      "Movie poster cutouts, marquee lights, red carpet, and a Bollywood music playlist for a filmy evening.",
    effort: "medium",
    tags: ["fun", "indian", "music"],
    costMultiplier: 0.03,
    suitableFor: ["birthday", "community"],
    vibes: ["fun", "music"],
  },
  {
    kind: "theme",
    title: "Eco-Conscious Celebration",
    description:
      "Potted plant centerpieces, seed paper invites, locally sourced food, reusable decor, and zero-waste goals.",
    effort: "medium",
    tags: ["sustainability", "green"],
    costMultiplier: 0.02,
    suitableFor: ["wedding", "birthday", "community"],
    vibes: ["eco-friendly"],
  },

  // Menu ideas
  {
    kind: "menu",
    title: "Live Chaat Counter",
    description:
      "Interactive chaat station with pani puri, bhel, dahi puri, and sev puri — customizable toppings for each guest.",
    effort: "medium",
    tags: ["vegetarian", "interactive", "indian"],
    costMultiplier: 0.01,
    suitableFor: ["wedding", "birthday", "community"],
    diets: ["vegetarian"],
  },
  {
    kind: "menu",
    title: "Farm-to-Table Vegetarian Feast",
    description:
      "Seasonal, locally-sourced vegetarian menu with creative presentations. Reduces carbon footprint and supports local farmers.",
    effort: "medium",
    tags: ["vegetarian", "sustainable", "fresh"],
    costMultiplier: 0.02,
    suitableFor: ["wedding", "community"],
    vibes: ["eco-friendly"],
    diets: ["vegetarian", "vegan"],
  },
  {
    kind: "menu",
    title: "Multi-Cuisine Buffet Stations",
    description:
      "Separate stations for Indian, Chinese, Italian, and desserts. Clear allergen labels at each station.",
    effort: "high",
    tags: ["variety", "buffet"],
    costMultiplier: 0.03,
    suitableFor: ["wedding", "birthday"],
  },
  {
    kind: "menu",
    title: "Dessert Bar",
    description:
      "A dedicated sweet station with gulab jamun, jalebi, brownies, macarons, and ice cream — satisfies every sweet tooth.",
    effort: "low",
    tags: ["dessert", "crowd-pleaser"],
    costMultiplier: 0.008,
    suitableFor: ["wedding", "birthday"],
  },

  // Activities
  {
    kind: "activity",
    title: "Photo Booth with Props",
    description:
      "Set up a themed photo booth with fun props, instant print, and a digital gallery guests can access later.",
    effort: "low",
    tags: ["interactive", "fun", "photo"],
    costMultiplier: 0.008,
    suitableFor: ["wedding", "birthday", "community"],
  },
  {
    kind: "activity",
    title: "Mehendi Station",
    description:
      "Live mehendi artists for guests during the pre-wedding functions. Budget for 2-3 artists for 200+ guests.",
    effort: "medium",
    tags: ["traditional", "interactive", "indian"],
    costMultiplier: 0.01,
    suitableFor: ["wedding"],
    vibes: ["traditional", "cultural"],
  },
  {
    kind: "activity",
    title: "Treasure Hunt for Kids",
    description:
      "Age-appropriate treasure hunt with clues around the venue. Small prizes at each station keep kids engaged.",
    effort: "medium",
    tags: ["kids", "active", "fun"],
    costMultiplier: 0.005,
    suitableFor: ["birthday", "community"],
    vibes: ["fun", "kids-focused"],
  },
  {
    kind: "activity",
    title: "Art & Craft Workshop",
    description:
      "Guided craft activity (tie-dye, pottery painting, greeting cards) that doubles as a party favor guests take home.",
    effort: "medium",
    tags: ["creative", "interactive"],
    costMultiplier: 0.008,
    suitableFor: ["birthday", "community"],
    vibes: ["artistic"],
  },

  // Entertainment
  {
    kind: "entertainment",
    title: "Live Band / Acoustic Set",
    description:
      "A 3-piece acoustic band for cocktail hour or dinner, transitioning to DJ for dancing.",
    effort: "high",
    tags: ["music", "live"],
    costMultiplier: 0.03,
    suitableFor: ["wedding", "birthday"],
  },
  {
    kind: "entertainment",
    title: "Sangeet Dance Performances",
    description:
      "Choreographed family dance performances. Hire a choreographer 4-6 weeks before for rehearsals.",
    effort: "high",
    tags: ["traditional", "dance", "indian"],
    costMultiplier: 0.02,
    suitableFor: ["wedding"],
    vibes: ["traditional", "fun"],
  },
  {
    kind: "entertainment",
    title: "Magic Show",
    description:
      "A 30-45 minute magic show perfect for kids and family audiences. Book an experienced stage magician.",
    effort: "low",
    tags: ["kids", "show"],
    costMultiplier: 0.008,
    suitableFor: ["birthday", "community"],
    vibes: ["fun", "kids-focused"],
  },

  // Decor
  {
    kind: "decor",
    title: "Fairy Light Canopy",
    description:
      "Create a stunning overhead canopy of warm white fairy lights for outdoor or indoor venues. Magical for evening events.",
    effort: "medium",
    tags: ["lighting", "romantic"],
    costMultiplier: 0.01,
    suitableFor: ["wedding", "birthday"],
  },
  {
    kind: "decor",
    title: "Marigold & Jasmine Installations",
    description:
      "Traditional floral installations using marigold and jasmine — fragrant, beautiful, and culturally rich.",
    effort: "medium",
    tags: ["traditional", "floral", "indian"],
    costMultiplier: 0.015,
    suitableFor: ["wedding"],
    vibes: ["traditional", "cultural"],
  },
  {
    kind: "decor",
    title: "Balloon Arch & Sculpture",
    description:
      "Professional balloon installations in theme colors. Budget-friendly yet impressive.",
    effort: "low",
    tags: ["fun", "colorful"],
    costMultiplier: 0.005,
    suitableFor: ["birthday", "community"],
    vibes: ["fun", "kids-focused"],
  },

  // Favors
  {
    kind: "favor",
    title: "Seed Paper Thank You Cards",
    description:
      "Plantable seed paper cards that guests can grow into wildflowers. Eco-friendly and meaningful.",
    effort: "low",
    tags: ["sustainable", "unique"],
    costMultiplier: 0.003,
    suitableFor: ["wedding", "birthday", "community"],
    vibes: ["eco-friendly"],
  },
  {
    kind: "favor",
    title: "Customized Sweet Boxes",
    description:
      "Beautifully packed boxes with assorted sweets and dry fruits, personalized with event details.",
    effort: "medium",
    tags: ["traditional", "edible", "indian"],
    costMultiplier: 0.005,
    suitableFor: ["wedding", "birthday"],
  },

  // Photo
  {
    kind: "photo",
    title: "Drone Photography",
    description:
      "Aerial shots of the venue and group photos from above. Check local regulations and venue permissions.",
    effort: "medium",
    tags: ["tech", "unique"],
    costMultiplier: 0.01,
    suitableFor: ["wedding", "community"],
    vibes: ["modern", "tech"],
  },

  // Sustainability
  {
    kind: "sustainability",
    title: "Food Donation Partnership",
    description:
      "Partner with a local food bank to donate surplus food. Plan portions carefully to minimize waste while ensuring enough for guests.",
    effort: "low",
    tags: ["social-impact", "waste-reduction"],
    costMultiplier: 0.001,
    suitableFor: ["wedding", "birthday", "community"],
    vibes: ["eco-friendly"],
  },
  {
    kind: "sustainability",
    title: "Digital Invitations",
    description:
      "Beautiful digital invitations via email/WhatsApp save paper and money. Use platforms that track RSVPs.",
    effort: "low",
    tags: ["digital", "eco-friendly", "budget-friendly"],
    costMultiplier: 0.001,
    suitableFor: ["wedding", "birthday", "community"],
  },

  // Accessibility
  {
    kind: "accessibility",
    title: "Inclusive Event Design",
    description:
      "Ensure wheelchair access, sign language interpreter, large-print programs, sensory-friendly quiet zone, and dietary labels.",
    effort: "medium",
    tags: ["inclusive", "thoughtful"],
    costMultiplier: 0.005,
    suitableFor: ["wedding", "birthday", "community"],
  },
  {
    kind: "accessibility",
    title: "Kid-Friendly Zone",
    description:
      "Dedicated supervised play area with age-appropriate activities, keeping children entertained and parents relaxed.",
    effort: "medium",
    tags: ["kids", "comfort"],
    costMultiplier: 0.005,
    suitableFor: ["wedding", "community"],
    vibes: ["kids-focused"],
  },

  // Invitations
  {
    kind: "invitation",
    title: "Video Invitation",
    description:
      "Short animated or live-action video invitation shareable on WhatsApp and social media. Modern and engaging.",
    effort: "medium",
    tags: ["digital", "modern"],
    costMultiplier: 0.005,
    suitableFor: ["wedding", "birthday"],
    vibes: ["modern", "tech"],
  },
];

// ─── ID generation ────────────────────────────────────────────────

let ideaCounter = 0;
function ideaId(): string {
  ideaCounter += 1;
  return `idea_${Date.now()}_${ideaCounter}`;
}

// ─── Generate ideas from seeds ────────────────────────────────────

export function generateIdeas(
  input: EventInput,
  existingTitles: string[] = [],
): Idea[] {
  const titleSet = new Set(existingTitles.map((t) => t.toLowerCase()));

  // Filter seeds by suitability
  const candidates = IDEA_SEEDS.filter((seed) => {
    if (!seed.suitableFor.includes(input.eventType)) return false;
    if (titleSet.has(seed.title.toLowerCase())) return false;
    if (
      input.avoid
        ?.filter(Boolean)
        .some((term) =>
          (seed.title + " " + seed.description)
            .toLowerCase()
            .includes(term.toLowerCase()),
        )
    )
      return false;
    if (
      input.dietary.includes("nut-allergy") &&
      /nuts?|dry fruits/i.test(seed.description)
    )
      return false;
    if (
      input.dietary.includes("vegan") &&
      /dairy|dahi|paneer|honey|cheese|butter/i.test(seed.description)
    )
      return false;
    return true;
  });

  // Hard constraints apply to the whole card, including titles, descriptions and tags.
  const forbidden: RegExp[] = [];
  if (input.dietary.some((d) => ["vegetarian", "vegan", "jain"].includes(d)))
    forbidden.push(
      /\b(meat|beef|pork|ribs|chicken|fish|seafood|gelatin|egg)\b/i,
    );
  if (input.dietary.includes("vegan"))
    forbidden.push(
      /\b(dairy|dahi|paneer|honey|cheese|butter|milk|yogurt|cream)\b/i,
    );
  if (input.dietary.includes("jain"))
    forbidden.push(/\b(onion|garlic|potato|carrot|root vegetables)\b/i);
  if (input.dietary.includes("nut-allergy"))
    forbidden.push(/\b(nuts?|almond|cashew|peanut|pistachio|dry fruits)\b/i);
  if (input.dietary.includes("no-alcohol"))
    forbidden.push(/\b(alcohol|wine|beer|cocktail|champagne|spirits)\b/i);
  if (input.dietary.includes("gluten-free"))
    forbidden.push(/\b(wheat|bread|pasta|roti|naan|semolina)\b/i);
  for (let i = candidates.length - 1; i >= 0; i--) {
    const text = [
      candidates[i].title,
      candidates[i].description,
      ...candidates[i].tags,
    ].join(" ");
    if (forbidden.some((re) => re.test(text))) candidates.splice(i, 1);
  }
  // Score candidates by relevance
  const scored = candidates.map((seed) => {
    let score = 1;

    // Vibe match
    if (seed.vibes) {
      const vibeMatches = seed.vibes.filter((v) =>
        input.vibe.includes(v as (typeof input.vibe)[number]),
      );
      score += vibeMatches.length * 2;
    }

    // Dietary match
    if (seed.diets) {
      const dietMatches = seed.diets.filter((d) =>
        input.dietary.includes(d as (typeof input.dietary)[number]),
      );
      score += dietMatches.length * 3;
    }

    // Budget fit
    const estCost = seed.costMultiplier * input.totalBudget;
    if (estCost <= input.totalBudget * 0.1) score += 1;
    if (estCost <= input.totalBudget * 0.05) score += 1;

    return { seed, score };
  });

  // Sort by score and take top 12
  scored.sort((a, b) => b.score - a.score);
  const reserved = [
    scored.find((x) => x.seed.kind === "sustainability"),
    scored.find((x) => x.seed.kind === "accessibility"),
    scored.find((x) => x.seed.costMultiplier <= 0.01),
  ].filter((x): x is (typeof scored)[number] => !!x);
  const selected = [
    ...new Set([
      ...reserved,
      ...scored.filter(
        (x, i, a) => a.findIndex((y) => y.seed.kind === x.seed.kind) === i,
      ),
      ...scored,
    ]),
  ].slice(0, 12);

  return selected.map(({ seed }) => {
    const estCostBase = seed.costMultiplier * input.totalBudget;
    // Convert if needed
    return {
      id: ideaId(),
      kind: seed.kind,
      title: seed.title,
      description: seed.description,
      whyItFits: generateWhyItFits(seed, input),
      estCost: {
        min: Math.round(estCostBase * 0.7),
        max: Math.round(estCostBase * 1.3),
      },
      effort: seed.effort,
      tags: seed.tags,
      saved: false,
    };
  });
}

function generateWhyItFits(seed: IdeaSeed, input: EventInput): string {
  const reasons: string[] = [];

  if (seed.vibes) {
    const matches = seed.vibes.filter((v) =>
      input.vibe.includes(v as (typeof input.vibe)[number]),
    );
    if (matches.length > 0) {
      reasons.push(`Matches your ${matches.join(", ")} vibe`);
    }
  }

  if (seed.diets) {
    const matches = seed.diets.filter((d) =>
      input.dietary.includes(d as (typeof input.dietary)[number]),
    );
    if (matches.length > 0) {
      reasons.push(`Supports your ${matches.join(", ")} dietary needs`);
    }
  }

  if (seed.effort === "low") {
    reasons.push("Easy to implement");
  }

  const estCost = seed.costMultiplier * input.totalBudget;
  if (estCost <= input.totalBudget * 0.02) {
    reasons.push("Budget-friendly option");
  }

  if (
    input.location.indoorOutdoor === "outdoor" &&
    seed.tags.includes("outdoor")
  ) {
    reasons.push("Great for your outdoor setting");
  }

  if (reasons.length === 0) {
    reasons.push(
      `A popular choice for ${input.eventType} celebrations in ${input.location.city}`,
    );
  }

  return reasons.join(". ") + ".";
}
