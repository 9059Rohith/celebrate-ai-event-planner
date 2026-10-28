"use client";
import Link from "next/link";
import { use, useSyncExternalStore, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePlanStore } from "@/lib/store";
import { Workspace } from "@/components/planner/Workspace";
import { PlanEnhancementPreview } from "@/components/planner/PlanEnhancementPreview";
import { usePlanGeneration } from "@/lib/hooks/usePlanGeneration";
import type { Plan } from "@/lib/schemas";
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
      <PlanLoader key={id} id={id} />
    </Suspense>
  );
}
function PlanLoader({ id }: { id: string }) {
  const plan = usePlanStore((state) =>
    state.plans.find((item) => item.id === id),
  );
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const params = useSearchParams();
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
  return <SavedPlan plan={plan} automatic={params.get("generating") === "1"} />;
}
function SavedPlan({ plan, automatic }: { plan: Plan; automatic: boolean }) {
  const generation = usePlanGeneration(plan, automatic);
  return (
    <>
      {generation.preview && (
        <PlanEnhancementPreview
          plan={generation.preview.plan}
          enhancement={generation.preview.enhancement}
          onAccept={generation.accept}
          onDismiss={generation.dismiss}
        />
      )}
      <Workspace
        plan={plan}
        busy={generation.busy}
        generationError={generation.error}
        onRetry={generation.retry}
      />
    </>
  );
}
