"use client";
import { useEffect, useRef, useState } from "react";
import type { Plan } from "@/lib/schemas";
import { compactPlanSnapshot } from "@/lib/llm/snapshot";
import {
  applySectionRefinement,
  type RefinableSection,
} from "@/lib/llm/refinement";
import { usePlanStore } from "@/lib/store";
import type { PlanChange } from "./usePlanActions";

export function useSectionRefinement<S extends RefinableSection>({
  plan,
  section,
  readOnly = false,
  onChange,
  onNotice,
}: {
  plan: Plan;
  section: S;
  readOnly?: boolean;
  onChange: PlanChange;
  onNotice: (notice: string) => void;
}) {
  const owner = JSON.stringify([plan.id, section, readOnly]);
  const [session, setSession] = useState<{
    owner: string;
    busy: boolean;
    preview: { plan: Plan; version: number; stored: boolean } | null;
  }>({ owner, busy: false, preview: null });
  // Reset during render so no old preview or busy state is exposed for a new owner.
  if (session.owner !== owner)
    setSession({ owner, busy: false, preview: null });
  const preview = session.owner === owner ? session.preview : null;
  const busy = session.owner === owner && session.busy;
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
    },
    [owner],
  );

  async function request(instructions: string) {
    if (readOnly || pending.current) return;
    const state = usePlanStore.getState();
    const stored = state.plans.find((p) => p.id === plan.id);
    if (stored && state.currentPlanId !== plan.id) return;
    const snapshot = stored ?? plan;
    const controller = new AbortController();
    pending.current = controller;
    setSession({ owner, busy: true, preview: null });
    try {
      const response = await fetch("/api/plan/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          plan: compactPlanSnapshot(snapshot),
          section,
          instructions,
        }),
      });
      const data = await response.json();
      if (controller.signal.aborted || pending.current !== controller) return;
      if (!response.ok) throw new Error(data.error);
      const next = applySectionRefinement(snapshot, data.refinement, section);
      setSession({
        owner,
        busy: false,
        preview: { plan: next, version: snapshot.version, stored: !!stored },
      });
    } catch (error) {
      if (!controller.signal.aborted && pending.current === controller)
        onNotice(
          error instanceof Error
            ? error.message
            : "Unable to refine this section. Please retry.",
        );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setSession((current) =>
          current.owner === owner ? { ...current, busy: false } : current,
        );
      }
    }
  }

  function accept(): boolean {
    if (readOnly || !preview) return false;
    const state = usePlanStore.getState();
    const current = state.plans.find((p) => p.id === plan.id);
    if (
      (preview.stored && (!current || state.currentPlanId !== plan.id)) ||
      (current ?? plan).version !== preview.version
    ) {
      onNotice(
        "Your plan changed while this preview was open. Request a fresh preview.",
      );
      return false;
    }
    if (
      onChange({ [section]: preview.plan[section] }, preview.version) === false
    )
      return false;
    setSession({ owner, busy: false, preview: null });
    return true;
  }

  return {
    busy,
    preview: preview?.plan[section] ?? null,
    request,
    accept,
    dismiss: () => setSession({ owner, busy: false, preview: null }),
  };
}
