/**
 * Share utilities — encode/decode plan to URL fragment
 * Uses lz-string for compression + base64url encoding
 * Fragment never reaches server (privacy)
 */

import LZString from "lz-string";
import { PlanSchema, type Plan } from "@/lib/schemas";
import { decompressBounded } from "./boundedDecompress";

const MAX_COMPRESSED_SIZE = 64 * 1024; // 64KB max
const MAX_DECOMPRESSED_SIZE = 256 * 1024; // 256KB decompression bomb guard

/**
 * Encode a plan for sharing via URL fragment
 */
export function encodePlan(plan: Plan): string | null {
  try {
    const json = JSON.stringify(plan);
    if (json.length > MAX_DECOMPRESSED_SIZE) {
      console.warn("[share] Plan too large to share");
      return null;
    }
    const compressed = LZString.compressToEncodedURIComponent(json);
    if (compressed && compressed.length > MAX_COMPRESSED_SIZE) {
      console.warn("[share] Compressed plan exceeds 64KB limit");
      return null;
    }
    return compressed;
  } catch {
    return null;
  }
}

/**
 * Decode a plan from URL fragment
 */
export function decodePlan(encoded: string): Plan | null {
  try {
    if (encoded.length > MAX_COMPRESSED_SIZE) {
      console.warn("[share] Encoded payload exceeds size limit");
      return null;
    }

    const json = decompressBounded(encoded, MAX_DECOMPRESSED_SIZE);
    if (!json) return null;

    if (json.length > MAX_DECOMPRESSED_SIZE) {
      console.warn("[share] Decompressed payload exceeds size limit");
      return null;
    }

    const parsed = JSON.parse(json);
    // Basic shape validation
    if (!parsed || !parsed.id || !parsed.summary || !parsed.budget) {
      return null;
    }

    const validated = PlanSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

/**
 * Generate a shareable URL
 */
export function getShareUrl(plan: Plan, baseUrl?: string): string | null {
  const encoded = encodePlan(plan);
  if (!encoded) return null;
  const base =
    baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/shared#${encoded}`;
}
