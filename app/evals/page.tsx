import "../workspace.css";
import snapshot from "@/evals/results/latest.summary.json";
import baseline from "@/evals/results/v1.summary.json";
import type { Run } from "@/evals/harness";
import { EvaluationDashboard } from "@/components/evals/EvaluationDashboard";
import { MiniEval } from "@/components/planner/MiniEval";
export default function Evals() {
  return (
    <div className="page-shell">
      <div className="eyebrow">A LITTLE RIGOR BEHIND THE MAGIC</div>
      <h1>A planner you can put to the test.</h1>
      <p>
        Measured checks, visible failures and honest limits. The saved run works
        without API credentials.
      </p>
      <EvaluationDashboard
        initial={snapshot as unknown as Run}
        baseline={baseline as unknown as Run}
      />
      <MiniEval />
    </div>
  );
}
