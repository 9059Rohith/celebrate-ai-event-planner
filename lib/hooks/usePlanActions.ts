"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlanSchema, type Plan } from "@/lib/schemas";
import { usePlanStore } from "@/lib/store";

export type PlanChange = (
  updates: Partial<Plan>,
  expectedVersion?: number,
) => boolean | void;

export function usePlanActions(
  plan: Plan,
  readOnly: boolean,
  setNotice: (notice: string) => void,
) {
  const router = useRouter();
  const add = usePlanStore((s) => s.addPlan);
  const remove = usePlanStore((s) => s.deletePlan);
  const duplicate = usePlanStore((s) => s.duplicatePlan);
  const pushHistory = usePlanStore((s) => s.pushHistory);
  const update = usePlanStore((s) => s.updatePlan);
  const setCurrent = usePlanStore((s) => s.setCurrentPlan);
  const undo = usePlanStore((s) => s.undo);
  const redo = usePlanStore((s) => s.redo);
  const historyState = usePlanStore((s) => s.history);
  useEffect(() => {
    if (!readOnly) setCurrent(plan.id);
  }, [plan.id, readOnly, setCurrent]);
  const change = (
    updates: Partial<Plan>,
    expectedVersion?: number,
  ): boolean => {
    if (readOnly) return false;
    try {
      const state = usePlanStore.getState();
      const latest = state.plans.find((x) => x.id === plan.id);
      if (!latest || state.currentPlanId !== plan.id) return false;
      if (expectedVersion !== undefined && latest.version !== expectedVersion) {
        setNotice(
          "Your plan changed. Request a fresh preview before applying it.",
        );
        return false;
      }
      const next = PlanSchema.parse({ ...latest, ...updates });
      pushHistory(latest);
      update(plan.id, next);
      return true;
    } catch {
      setNotice(
        "The change could not be validated. Your current plan was kept.",
      );
      return false;
    }
  };
  async function share() {
    const { getShareUrl } = await import("@/lib/share");
    const url = getShareUrl(plan);
    if (!url) {
      setNotice(
        "This plan is too large for a shared link. Export JSON instead.",
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice(
        "Read-only share link copied. Anyone with the link can view this copy.",
      );
    } catch {
      setNotice(url);
    }
  }

  const importCopy = () => {
    const copy = { ...plan, id: crypto.randomUUID() };
    add(copy);
    router.push(`/plan/${copy.id}`);
  };
  const duplicatePlan = () => {
    if (readOnly) return;
    const copy = duplicate(plan.id);
    if (copy) router.push(`/plan/${copy.id}`);
  };
  const deletePlan = () => {
    if (readOnly) return;
    if (confirm("Delete this celebration from this device?")) {
      remove(plan.id);
      router.push("/");
    }
  };
  return {
    change,
    share,
    importCopy,
    duplicatePlan,
    deletePlan,
    undo,
    redo,
    historyState,
  };
}
