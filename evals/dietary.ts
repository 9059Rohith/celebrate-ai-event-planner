import type { EventInput, Plan } from "@/lib/schemas";

type Rule = { terms: string; alternatives?: RegExp };
const meat: Rule = {
  terms: "meat|beef|pork|ribs|chicken|fish|seafood|mutton|lamb|gelatin",
  alternatives:
    /\b(?:vegan|plant[- ]based|meatless)\s+(?:meat|beef|pork|ribs|chicken|fish|seafood|mutton|lamb|gelatin)\b/gi,
};
const eggs: Rule = {
  terms: "eggs?|omelettes?",
  alternatives:
    /\b(?:vegan|plant[- ]based|egg[- ]free)\s+(?:eggs?|omelettes?)\b/gi,
};
const dairy: Rule = {
  terms:
    "paneer|ghee|dahi|ice cream|dairy|cheese|milk|butter|yogurt|cream|honey",
  alternatives:
    /\b(?:(?:vegan|plant[- ]based|non[- ]dairy|dairy[- ]free)\s+(?:paneer|ghee|dahi|ice cream|cheese|milk|butter|yogurt|cream|honey)|(?:coconut|oat|soy|almond|rice)\s+(?:milk|cream)|peanut butter)\b/gi,
};
const alcohol: Rule = {
  terms: "alcohol|wine|beer|cocktails?|whisky|whiskey|champagne|spirits",
  alternatives:
    /\b(?:non[- ]alcoholic|alcohol[- ]free)\s+(?:wine|beer|cocktails?|whisky|whiskey|champagne|spirits)\b/gi,
};
const rules: Partial<Record<EventInput["dietary"][number], Rule[]>> = {
  vegetarian: [meat],
  vegan: [meat, eggs, dairy],
  jain: [
    meat,
    eggs,
    {
      terms:
        "onions?|garlic|potatoes|potato|carrots?|beetroots?|root vegetables",
    },
  ],
  halal: [{ terms: "pork|bacon|ham|lard" }, alcohol],
  "no-alcohol": [alcohol],
  "nut-allergy": [
    {
      terms: "nuts?|peanuts?|cashews?|almonds?|pistachios?|walnuts?|hazelnuts?",
    },
  ],
  "gluten-free": [
    {
      terms: "wheat|naan|bread|pasta|roti|semolina|barley|rye",
      alternatives:
        /\b(?:(?:gluten[- ]free)\s+(?:naan|bread|pasta|roti)|(?:rice|corn|chickpea)\s+(?:pasta|roti))\b/gi,
    },
  ],
};

/** A lexical mutation check, not ingredient certification or semantic judging. */
export function dietaryViolations(
  input: EventInput,
  ideas: Plan["ideas"],
): string[] {
  const activeRules = input.dietary.flatMap((diet) => rules[diet] || []);
  const fields = ideas
    .filter((idea) => idea.kind === "menu")
    .flatMap((idea) => [
      idea.title,
      idea.description,
      idea.whyItFits,
      ...idea.tags,
    ]);
  const violations = new Set<string>();
  for (const field of fields) {
    // Keep exclusions local: "avoid pork, but serve wine" still reports wine.
    const clauses = field
      .normalize("NFKC")
      .toLowerCase()
      .split(
        /[.!?;\n]+|\b(?:but|however|yet)\b|(?:,|\band\b)\s*(?=(?:serve|offer|include|add)\b)/,
      );
    for (const rule of activeRules) {
      for (const clause of clauses) {
        const alternativesRemoved = rule.alternatives
          ? clause.replace(rule.alternatives, " ")
          : clause;
        const recommendations = alternativesRemoved.replace(
          /\b(?:avoid|exclude|omit|without|no|do not (?:serve|use|include)|free (?:of|from))\b.*$/,
          " ",
        );
        for (const match of recommendations.matchAll(
          new RegExp(`\\b(?:${rule.terms})\\b`, "gi"),
        )) {
          // A suffixed exclusion such as "nut-free" is not a recommendation.
          if (
            !/^[- ]free\b/.test(
              recommendations.slice(match.index + match[0].length),
            )
          )
            violations.add(match[0]);
        }
      }
    }
  }
  return [...violations];
}
