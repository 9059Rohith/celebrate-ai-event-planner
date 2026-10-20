"use client";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { decodePlan } from "@/lib/share";
import { Workspace } from "./Workspace";
const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const getFragment = () => window.location.hash.slice(1);
const serverFragment = () => "";
const getReady = () => true;
const serverReady = () => false;
export function SharedPlan() {
  // React uses the server snapshots for the initial hydration pass. Browser-only
  // fragment reads and updates happen inside the already-hydrated boundary.
  const fragment = useSyncExternalStore(subscribe, getFragment, serverFragment);
  const ready = useSyncExternalStore(subscribe, getReady, serverReady);
  const plan = useMemo(
    () => (fragment ? decodePlan(fragment) : null),
    [fragment],
  );
  if (plan) return <Workspace plan={plan} readOnly />;
  return (
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
  );
}
