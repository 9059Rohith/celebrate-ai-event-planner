"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePlanStore } from "@/lib/store";
const subscribe = () => () => {};
export default function Offline() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const plans = usePlanStore((s) => s.plans);
  return (
    <div className="page-shell">
      <h1>Your celebrations are still here.</h1>
      <p>
        You’re offline. Open the planner shell to create or edit a locally saved
        celebration.
      </p>
      <Link href="/plan/new" className="button">
        Open offline planner
      </Link>
      {ready &&
        plans.map((p) => (
          <article key={p.id} className="panel">
            <h2>{p.summary.headline}</h2>
            <p>
              {p.input.guestCount} guests · {p.input.currency}{" "}
              {p.budget.total.toLocaleString("en-IN")}
            </p>
            <Link
              href={`/plan/new?offlinePlan=${encodeURIComponent(p.id)}`}
              className="text-link"
            >
              Open saved plan offline →
            </Link>
          </article>
        ))}
    </div>
  );
}
