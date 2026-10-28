"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlanSchema, type Plan } from "@/lib/schemas";
import { usePlanStore } from "@/lib/store";
import { consumeSSE } from "@/lib/client/network";
import { safeStorage } from "@/lib/client/storage";
import { compactPlanSnapshot } from "@/lib/client/planSnapshot";
import {
  applyPlanEnhancement,
  PlanEnhancementSchema,
  type PlanEnhancement,
} from "@/lib/llm/planEnhancement";
import { usePlanActions } from "./usePlanActions";

type Preview = { plan: Plan; version: number; enhancement: PlanEnhancement };

/** Initial creation streams immediately; saved-plan retries require one undoable acceptance. */
export function usePlanGeneration(plan: Plan, automatic: boolean) {
  const id = plan.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const { change } = usePlanActions(plan, false, setError);
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const started = useRef(false);
  const shouldStart = useRef(automatic);

  const request = useCallback(
    async (creation = false) => {
      const state = usePlanStore.getState();
      const initial = state.plans.find((item) => item.id === id);
      if (!initial || state.currentPlanId !== id || !mounted.current) return;
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      const signal = controller.signal;
      const active = () =>
        mounted.current && pending.current === controller && !signal.aborted;
      setBusy(true);
      setError("");
      setPreview(null);
      try {
        if (!creation || initial.version !== 1) {
          const response = await fetch("/api/plan/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "refine",
              plan: compactPlanSnapshot(initial),
            }),
            signal,
          });
          const raw: unknown = await response.json();
          if (!active()) return;
          if (!response.ok)
            throw new Error(
              "Unable to request AI details. Your saved plan was kept.",
            );
          const enhancement = PlanEnhancementSchema.parse(raw);
          const next = applyPlanEnhancement(initial, enhancement);
          const current = usePlanStore.getState();
          if (
            current.currentPlanId !== id ||
            current.plans.find((item) => item.id === id)?.version !==
              initial.version
          )
            throw new Error(
              "Your plan changed. Request a fresh preview before applying it.",
            );
          if (enhancement.meta.source === "fallback") {
            setError("AI is unavailable. Your saved plan has not changed.");
            return;
          }
          setPreview({ plan: next, version: initial.version, enhancement });
          return;
        }

        let expectedVersion = initial.version;
        let edited = false;
        const apply = (updates: Partial<Plan>) => {
          if (!active()) return;
          const store = usePlanStore.getState();
          const current = store.plans.find((item) => item.id === id);
          if (
            !current ||
            store.currentPlanId !== id ||
            current.version !== expectedVersion
          )
            edited = true;
          if (edited) return;
          store.updatePlan(id, updates);
          expectedVersion++;
        };
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await fetch("/api/plan/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(initial.input),
              signal,
            });
            await consumeSSE(
              response,
              (event, data) => {
                if (
                  [
                    "summary",
                    "budget",
                    "timeline",
                    "vendors",
                    "ideas",
                  ].includes(event)
                ) {
                  const field = event as
                    "summary" | "budget" | "timeline" | "vendors" | "ideas";
                  apply({ [field]: PlanSchema.shape[field].parse(data) });
                }
                if (event === "complete") {
                  const next = PlanSchema.parse(data);
                  apply({
                    summary: next.summary,
                    budget: next.budget,
                    timeline: next.timeline,
                    vendors: next.vendors,
                    ideas: next.ideas,
                    meta: next.meta,
                  });
                }
                if (event === "error")
                  throw new Error(
                    "AI enhancement was interrupted. Your existing plan is safe.",
                  );
              },
              signal,
            );
            break;
          } catch (failure) {
            if (signal.aborted || attempt === 1) throw failure;
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
        if (edited && active())
          setError(
            "Your plan changed during enhancement. Retry to review fresh AI details.",
          );
      } catch (failure) {
        if (active())
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to enhance the plan. Your saved plan was kept.",
          );
      } finally {
        if (active()) setBusy(false);
        if (pending.current === controller) pending.current = null;
      }
    },
    [id],
  );

  useEffect(() => {
    mounted.current = true;
    if (
      !started.current &&
      shouldStart.current &&
      safeStorage.getItem(`celebrate-enhance-${id}`)
    ) {
      started.current = true;
      safeStorage.removeItem(`celebrate-enhance-${id}`);
      const url = new URL(location.href);
      url.searchParams.delete("generating");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
      queueMicrotask(() => {
        if (mounted.current) void request(true);
      });
    }
    return () => {
      mounted.current = false;
      pending.current?.abort();
    };
  }, [id, request]);

  function accept() {
    if (!preview) return;
    if (change(preview.plan, preview.version)) {
      setPreview(null);
      setError("");
    }
  }
  return {
    busy,
    error,
    preview,
    retry: () => void request(),
    accept,
    dismiss: () => setPreview(null),
  };
}
