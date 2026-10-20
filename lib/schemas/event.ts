import { z } from "zod";
// Disable runtime code generation so validation respects nonce-only script CSP.
z.config({jitless:true});

// ─── Enums & Literals ─────────────────────────────────────────────
export const EventTypeEnum = z.enum(["wedding", "birthday", "community"]);
export type EventType = z.infer<typeof EventTypeEnum>;

export const CurrencyEnum = z.enum(["INR", "USD", "EUR", "GBP"]);
export type Currency = z.infer<typeof CurrencyEnum>;

export const IndoorOutdoorEnum = z.enum(["indoor", "outdoor", "either"]);
export const BudgetFlexibilityEnum = z.enum(["strict", "some", "flexible"]);

export const DietaryOptionEnum = z.enum([
  "vegetarian",
  "vegan",
  "jain",
  "halal",
  "kosher",
  "gluten-free",
  "nut-allergy",
  "no-alcohol",
  "alcohol-ok",
]);
export type DietaryOption = z.infer<typeof DietaryOptionEnum>;

export const VibeTagEnum = z.enum([
  "traditional",
  "modern",
  "minimalist",
  "rustic",
  "luxury",
  "fun",
  "spiritual",
  "eco-friendly",
  "kids-focused",
  "tech",
  "sports",
  "music",
  "artistic",
  "elegant",
  "bohemian",
  "vintage",
  "tropical",
  "cultural",
  "festive",
  "intimate",
]);

export const WeddingFunctionEnum = z.enum([
  "engagement",
  "haldi",
  "mehendi",
  "sangeet",
  "ceremony",
  "reception",
  "other",
]);

export const CommunityPurposeEnum = z.enum([
  "fundraiser",
  "festival",
  "meetup",
  "cultural",
  "sports",
  "educational",
  "religious",
  "other",
]);

export const CategoryEnum = z.enum([
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
  "cake",
  "entertainment",
  "activities",
  "av-sound",
  "marketing",
  "staffing",
  "safety",
  "supplies",
  "permits",
  "volunteers",
  "food",
  "programming",
]);

// ─── Sub-schemas ──────────────────────────────────────────────────
export const LocationSchema = z.strictObject({
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100).default("India"),
  indoorOutdoor: IndoorOutdoorEnum,
});

export const AgeGroupsSchema = z.strictObject({
  kids: z.number().int().min(0).default(0),
  teens: z.number().int().min(0).default(0),
  adults: z.number().int().min(0).default(0),
  seniors: z.number().int().min(0).default(0),
});

// ─── Event-specific schemas (discriminated union) ──────────────────
export const WeddingSpecificSchema = z.strictObject({
  type: z.literal("wedding"),
  functions: z.array(WeddingFunctionEnum).min(1),
  days: z.number().int().min(1).max(5),
  destination: z.boolean().default(false),
});

export const BirthdaySpecificSchema = z.strictObject({
  type: z.literal("birthday"),
  honoreeAge: z.number().int().min(0).max(150),
  honoreeInterests: z.array(z.string().max(50)).max(10).default([]),
  milestone: z.boolean().default(false),
});

export const CommunitySpecificSchema = z.strictObject({
  type: z.literal("community"),
  purpose: CommunityPurposeEnum,
  ticketed: z.boolean().default(false),
  volunteersAvailable: z.number().int().min(0).default(0),
  permitsNeeded: z.boolean().optional(),
});

export const EventSpecificSchema = z.discriminatedUnion("type", [
  WeddingSpecificSchema,
  BirthdaySpecificSchema,
  CommunitySpecificSchema,
]);

// ─── Main EventInput ─────────────────────────────────────────────
export const EventInputSchema = z.strictObject({
  eventType: EventTypeEnum,
  title: z.string().max(80).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO date YYYY-MM-DD")
    .refine(
      (v) =>
        Number.isFinite(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v,
      "Choose a real calendar date",
    )
    .optional(),
  planningWeeks: z.number().int().min(1).max(156).optional(),
  location: LocationSchema,
  guestCount: z.number().int().min(2).max(5000),
  totalBudget: z.number().int().min(1).max(1000000000000),
  currency: CurrencyEnum.default("INR"),
  budgetFlexibility: BudgetFlexibilityEnum.default("some"),
  ageGroups: AgeGroupsSchema.optional(),
  dietary: z.array(DietaryOptionEnum).default([]),
  vibe: z.array(VibeTagEnum).default([]),
  priorities: z.array(CategoryEnum).max(3).default([]),
  culturalNotes: z.string().max(500).optional(),
  mustHaves: z.array(z.string().max(100)).max(20).optional(),
  avoid: z.array(z.string().max(100)).max(20).optional(),
  eventSpecific: EventSpecificSchema,
});

export type EventInput = z.infer<typeof EventInputSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type AgeGroups = z.infer<typeof AgeGroupsSchema>;
export type WeddingSpecific = z.infer<typeof WeddingSpecificSchema>;
export type BirthdaySpecific = z.infer<typeof BirthdaySpecificSchema>;
export type CommunitySpecific = z.infer<typeof CommunitySpecificSchema>;
