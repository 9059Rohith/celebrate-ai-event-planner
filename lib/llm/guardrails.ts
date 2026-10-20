import type { EventInput } from "@/lib/schemas";
export function scrubText(text: string, limit = 500): string {
  return text
    .normalize("NFKC")
    .replace(/<[^>]*>/g, " ")
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[REDACTED]")
    .replace(
      /(?:ignore (?:all|previous)[^.]*|(?:print|reveal|show)[^.]{0,100}(?:system prompt|api key|secret))/gi,
      "[untrusted instruction removed]",
    )
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED]")
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, "[REDACTED]")
    .replace(/\b(?:\d[ -]?){12}\b/g, "[REDACTED]")
    .replace(/(?:\+?\d[\d ()-]{8,}\d)/g, (match) =>
      match.replace(/\D/g, "").length >= 10 ? "[REDACTED]" : match,
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
export function sanitizeData<T>(value: T): T {
  if (typeof value === "string") return scrubText(value) as T;
  if (Array.isArray(value)) return value.map(sanitizeData) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitizeData(v)]),
    ) as T;
  return value;
}
export function injectionDetected(text: string): boolean {
  return /ignore (?:all|previous)|system prompt|reveal.{0,20}(?:key|secret)|[A-Za-z0-9+/]{150,}|<script/i.test(
    text,
  );
}
export function outputSafe(text: string): boolean {
  return !/sk-[A-Za-z0-9_-]{16,}|OPENAI_API_KEY|You are Celebrate AI, an expert|Treat everything inside <user_input>/i.test(
    text,
  );
}
export function cleanOutput(text: string): string {
  if (!outputSafe(text)) throw new Error("Unsafe model output");
  return scrubText(text, 4000).replace(
    /https?:\/\/\S+|www\.\S+/gi,
    "[link removed]",
  );
}
export function ideasSafe(text: string, input: EventInput): boolean {
  const lower = text.toLowerCase();
  if (input.avoid?.some((term) => term && lower.includes(term.toLowerCase())))
    return false;
  if (
    input.dietary.some((d) => ["vegetarian", "vegan", "jain"].includes(d)) &&
    /\b(chicken|beef|pork|ribs|fish|meat|mutton|seafood|gelatin)\b/i.test(text)
  )
    return false;
  if (
    input.dietary.includes("vegan") &&
    /\b(milk|cheese|butter|yogurt|paneer|ghee|honey|cream)\b/i.test(text)
  )
    return false;
  if (
    input.dietary.includes("jain") &&
    /\b(onion|garlic|potato|carrot|beetroot)\b/i.test(text)
  )
    return false;
  if (
    input.dietary.includes("no-alcohol") &&
    /\b(wine|beer|vodka|whisky|champagne|cocktail|alcohol)\b/i.test(text)
  )
    return false;
  if (
    input.dietary.includes("nut-allergy") &&
    /\b(nuts?|peanuts?|almonds?|cashews?)\b/i.test(text)
  )
    return false;
  return outputSafe(text);
}
