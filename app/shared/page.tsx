import { Suspense } from "react";
import { SharedPlan } from "@/components/planner/SharedPlan";
export default function Shared() {
  return (
    <Suspense fallback={<p>Opening shared plan…</p>}>
      <SharedPlan />
    </Suspense>
  );
}
