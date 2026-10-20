"use client";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { decodePlan } from "@/lib/share";
import type { Plan } from "@/lib/schemas";
import { Workspace } from "@/components/planner/Workspace";
export default function Shared() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      setPlan(decodePlan(location.hash.slice(1)));
      setReady(true);
    });
  }, []);
  return (
    <Suspense fallback={<p>Opening shared plan…</p>}>
      {plan ? (
        <Workspace plan={plan} readOnly />
      ) : (
        <div className="page-shell">
          <h1>
            {ready
              ? "This shared link is invalid or too large."
              : "Opening shared celebration…"}
          </h1>
          <Link href="/" className="button">
            Back to celebrations
          </Link>
        </div>
      )}
    </Suspense>
  );
}
