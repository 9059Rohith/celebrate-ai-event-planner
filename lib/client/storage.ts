"use client";
import { PlanSchema, type Plan } from "@/lib/schemas";
import type { StateStorage } from "zustand/middleware";
let lastError = "";
export function storageError() {
  return lastError;
}
export function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    lastError =
      "Device storage is full or unavailable. Your changes are in memory; export JSON to keep a backup.";
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("celebrate-storage-error"));
    return false;
  }
}
export const safeStorage: StateStorage = {
  getItem(key) {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    writeLocal(key, value);
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
export function migratePlans(raw: unknown): {
  plans: Plan[];
  currentPlanId: string | null;
} {
  const state =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const plans = Array.isArray(state.plans)
    ? state.plans.flatMap((value) => {
        const result = PlanSchema.safeParse(value);
        return result.success ? [result.data] : [];
      })
    : [];
  return {
    plans,
    currentPlanId:
      typeof state.currentPlanId === "string" &&
      plans.some((p) => p.id === state.currentPlanId)
        ? state.currentPlanId
        : null,
  };
}
