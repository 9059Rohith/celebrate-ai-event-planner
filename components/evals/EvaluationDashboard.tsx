"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import {
  EvaluationSummarySchema,
  type EvaluationSummary,
} from "@/lib/schemas/evaluation";
export function EvaluationDashboard({
  initial,
  baseline,
}: {
  initial: EvaluationSummary;
  baseline: EvaluationSummary;
}) {
  const [run, setRun] = useState(initial);
  const [isSnapshot, setIsSnapshot] = useState(true);
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
      const parsed = EvaluationSummarySchema.safeParse(
        (event as CustomEvent<unknown>).detail,
      );
      if (parsed.success) {
        setRun(parsed.data);
        setIsSnapshot(false);
      }
    };
    window.addEventListener("celebrate-eval", onRun);
    return () => window.removeEventListener("celebrate-eval", onRun);
  }, []);
  const download = () => {
    const blob = new Blob([getFeedback()], { type: "application/json" });
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
        {isSnapshot ? "Static snapshot" : "Live mini evaluation response"} ·{" "}
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
          Provider structured enhancement validity:{" "}
          {run.structuredValidation?.observedCases
            ? `${run.structuredValidation.observedCases} observed cases; first attempt ${((run.structuredValidation.firstAttemptValidRate ?? 0) * 100).toFixed(1)}%; valid after repair ${((run.structuredValidation.validAfterRepairRate ?? 0) * 100).toFixed(1)}%; ${run.structuredValidation.repairSuccesses} successful repairs / ${run.structuredValidation.repairAttempts} attempts.`
            : "Not measured — no provider validation observations in this run."}{" "}
          Cached responses and fallback-only cases are excluded.
        </p>
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
          <CaseResultRow
            key={`${run.id}:${r.id}`}
            r={r}
            isSnapshot={isSnapshot}
          />
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

function CaseEvidence({
  result,
  isSnapshot,
}: {
  result: EvaluationSummary["results"][number];
  isSnapshot: boolean;
}) {
  const [evidence, setEvidence] = useState<unknown>(
    result.output ? { input: result.input, output: result.output } : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function load(open: boolean) {
    if (!isSnapshot || !open || evidence || loading) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/evals/cases/${encodeURIComponent(result.id)}.json`,
        { signal: controller.signal },
      );
      if (!response.ok) throw Error("Evidence unavailable");
      const data: unknown = await response.json();
      if (!controller.signal.aborted) setEvidence(data);
    } catch {
      if (!controller.signal.aborted)
        setError("Could not load this case. Close and reopen to retry.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return (
    <details onToggle={(event) => void load(event.currentTarget.open)}>
      <summary>Input / output JSON</summary>
      {loading && <p role="status">Loading case evidence…</p>}
      {error && <p role="alert">{error}</p>}
      {!isSnapshot && evidence == null && (
        <p>This run did not produce output for this case.</p>
      )}
      {evidence != null && (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontSize: 12,
          }}
        >
          {JSON.stringify(evidence, null, 2)}
        </pre>
      )}
    </details>
  );
}

function CaseResultRow({
  r,
  isSnapshot,
}: {
  r: EvaluationSummary["results"][number];
  isSnapshot: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        {r.passed ? "✓" : "✕"} {r.id} · {r.latencyMs.toFixed(1)} ms ·{" "}
        {r.tokensIn + r.tokensOut} tokens
      </summary>
      {open && (
        <>
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
          <CaseEvidence result={r} isSnapshot={isSnapshot} />
        </>
      )}
    </details>
  );
}
