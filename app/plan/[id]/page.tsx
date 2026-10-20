"use client";
import Link from "next/link";
import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { usePlanStore } from "@/lib/store";
import { Workspace } from "@/components/planner/Workspace";
import { PlanSchema, type Plan } from "@/lib/schemas";
import { consumeSSE } from "@/lib/client/network";
import { safeStorage } from "@/lib/client/storage";
const subscribe = () => () => {};
export default function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={<p className="page-shell">Opening your celebration…</p>}
    >
      <PlanLoader id={id} />
    </Suspense>
  );
}
function PlanLoader({ id }: { id: string }) {
  const plan = usePlanStore((s) => s.plans.find((p) => p.id === id));
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const params = useSearchParams();
  const abort = useRef<AbortController | null>(null);
  const started = useRef(false);
  const shouldStart = useRef(params.get("generating") === "1");
  const generate = useCallback(async () => {
    const initial = usePlanStore.getState().plans.find((p) => p.id === id);
    if (!initial) return;
    abort.current?.abort();
    abort.current = new AbortController();
    const signal = abort.current.signal;
    setBusy(true);
    setError("");
    let expectedVersion = initial.version;
    let edited = false;
    const apply = (updates: Partial<Plan>) => {
      const store = usePlanStore.getState();
      const current = store.plans.find((p) => p.id === id);
      if (!current) return;
      if (current.version !== expectedVersion) edited = true;
      if (edited) return;
      store.updatePlan(id, updates);
      expectedVersion++;
    };
    try {
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
                ["summary", "budget", "timeline", "vendors", "ideas"].includes(
                  event,
                )
              ) {
                const field = event as
                  "summary" | "budget" | "timeline" | "vendors" | "ideas";
                const value = PlanSchema.shape[field].parse(data);
                apply({ [field]: value });
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
                if (edited)
                  usePlanStore.getState().updatePlan(id, { meta: next.meta });
              }
              if (event === "error")
                throw Error(
                  "AI enhancement was interrupted. Your existing plan is safe.",
                );
            },
            signal,
          );
          break;
        } catch (e) {
          if (signal.aborted) throw e;
          if (attempt === 1) throw e;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (e) {
      if (!signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Unable to enhance the plan. Your smart template is still usable.",
        );
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }, [id]);
  useEffect(() => {
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
      queueMicrotask(() => void generate());
    }
    return () => abort.current?.abort();
  }, [generate, id]);
  if (!ready) return <p className="page-shell">Opening your celebration…</p>;
  if (!plan)
    return (
      <div className="page-shell">
        <h1>This plan isn’t on this device.</h1>
        <p>
          Import an exported plan, open a shared link, or start a new
          celebration.
        </p>
        <Link className="button" href="/plan/new">
          Create a celebration
        </Link>
      </div>
    );
  return (
    <Workspace
      plan={plan}
      busy={busy}
      generationError={error}
      onRetry={() => void generate()}
    />
  );
}
