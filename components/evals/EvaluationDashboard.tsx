"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};
const getFeedback = () => {
  try {
    return localStorage.getItem("celebrate-feedback") || "[]";
  } catch {
    return "[]";
  }
};
import type { Run } from "@/evals/harness";
export function EvaluationDashboard({
  initial,
  baseline,
}: {
  initial: Run;
  baseline: Run;
}) {
  const [run, setRun] = useState(initial);
  const [label, setLabel] = useState("Static snapshot");
  const stored = useSyncExternalStore(subscribe, getFeedback, () => "[]");
  const feedback = useMemo(() => {
    try {
      const raw: unknown = JSON.parse(stored);
      if (!Array.isArray(raw)) return { up: 0, down: 0, reasons: {} };
      let up = 0,
        down = 0;
      const reasons: Record<string, number> = {};
      for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue;
        if (entry.rating === "up") up++;
        if (entry.rating === "down") down++;
        if (typeof entry.reason === "string")
          reasons[entry.reason] = (reasons[entry.reason] || 0) + 1;
      }
      return { up, down, reasons };
    } catch {
      return { up: 0, down: 0, reasons: {} };
    }
  }, [stored]);
  useEffect(() => {
    const onRun = (event: Event) => {
      const detail = (event as CustomEvent<Run>).detail;
      if (detail?.results) {
        setRun(detail);
        setLabel("Live mini evaluation response");
      }
    };
    window.addEventListener("celebrate-eval", onRun);
    return () => window.removeEventListener("celebrate-eval", onRun);
  }, []);
  const download = () => {
    const blob = new Blob(
      [localStorage.getItem("celebrate-feedback") || "[]"],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "celebrate-human-feedback.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="notice">
        {label} ·{" "}
        {new Date(run.timestamp).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}{" "}
        · {run.mode}
      </div>
      <div className="stats stat-cards">
        <div>
          <span>Cases passing</span>
          <strong>
            {run.passed} / {run.totalCases}
          </strong>
          <small>{run.completed ? "Run complete" : "Partial run"}</small>
        </div>
        <div>
          <span>p50 / p95 completion</span>
          <strong>
            {run.p50LatencyMs.toFixed(1)} / {run.p95LatencyMs.toFixed(1)} ms
          </strong>
          <small>Engine time; transport TTFB unavailable</small>
        </div>
        <div>
          <span>Model usage</span>
          <strong>{run.tokens.toLocaleString()} tokens</strong>
          <small>
            {(run.tokens / Math.max(1, run.totalCases)).toFixed(0)} average
            tokens/plan
          </small>
          <small>
            {run.costUsd === null
              ? "Cost unavailable"
              : `$${run.costUsd.toFixed(5)} estimated total · $${(run.costUsd / Math.max(1, run.totalCases)).toFixed(5)}/plan`}
          </small>
        </div>
      </div>
      <section className="panel">
        <h2>Metric pass rates and run comparison</h2>
        <p>
          Pre-fix fallback baseline (label {baseline.promptVersion}):{" "}
          {baseline.passed}/{baseline.totalCases} · Current run (label{" "}
          {run.promptVersion}): {run.passed}/{run.totalCases}. Offline runs
          exercise the deterministic engine; prompt quality is unmeasured.
        </p>
        <table className="eval-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Pre-fix engine</th>
              <th>Current run</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(run.metricRates).map(([name, value]) => (
              <tr key={name}>
                <th>{name}</th>
                <td>{((baseline.metricRates[name] || 0) * 100).toFixed(1)}%</td>
                <td>{(value * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>{run.judgeStatus}</p>
        <p>
          Thresholds:{" "}
          {Object.entries(run.thresholds)
            .map(
              ([k, v]) =>
                `${k}: ${k === "judge" && !run.results.some((r) => r.judge) ? "skipped / N/A" : v ? "pass" : "fail"}`,
            )
            .join(" · ")}
        </p>
      </section>
      <section className="panel">
        <h2>Case results and failure evidence</h2>
        <p>
          Expand a case to inspect the actual input, output and metric
          rationale.
        </p>
        {run.results.map((r) => (
          <details key={r.id}>
            <summary>
              {r.passed ? "✓" : "✕"} {r.id} · {r.latencyMs.toFixed(1)} ms ·{" "}
              {r.tokensIn + r.tokensOut} tokens
            </summary>
            <ul>
              {Object.entries(r.checks).map(([key, c]) => (
                <li key={key}>
                  {c.passed ? "Pass" : "Fail"} — {key}: {c.rationale}
                </li>
              ))}
            </ul>
            {r.error && <p>{r.error}</p>}
            {r.judge && (
              <p>
                Judge: {r.judge.first.rationale} · Repeat:{" "}
                {r.judge.second.rationale}
              </p>
            )}
            <details>
              <summary>Input / output JSON</summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontSize: 12,
                }}
              >
                {JSON.stringify({ input: r.input, output: r.output }, null, 2)}
              </pre>
            </details>
          </details>
        ))}
      </section>
      <section className="panel">
        <h2>Human feedback (this device)</h2>
        <p>
          {feedback.up} helpful · {feedback.down} needs improvement
        </p>
        {Object.entries(feedback.reasons).map(([reason, count]) => (
          <p key={reason}>
            {reason}: {count}
          </p>
        ))}
        <button className="button secondary small" onClick={download}>
          Export local feedback
        </button>
      </section>
    </>
  );
}
