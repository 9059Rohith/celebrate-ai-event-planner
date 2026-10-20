"use client";
import { useState } from "react";
export function MiniEval() {
  const [secret, setSecret] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h2>Run a mini evaluation</h2>
      <p>
        For evaluators. The secret is sent to this server and cleared after use.
        Five live generation cases run when AI is configured; otherwise the
        response explicitly reports an offline run.
      </p>
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setResult("Running five cases…");
          try {
            const response = await fetch("/api/eval/run", {
              method: "POST",
              headers: { "x-eval-secret": secret },
            });
            const data = await response.json();
            setResult(
              response.ok
                ? `${data.passed}/${data.totalCases} passed · ${data.mode}`
                : data.error,
            );
            if (response.ok)
              window.dispatchEvent(
                new CustomEvent("celebrate-eval", { detail: data }),
              );
          } catch {
            setResult("Unable to connect. Try again.");
          } finally {
            setSecret("");
            setBusy(false);
          }
        }}
      >
        <input
          type="password"
          autoComplete="off"
          aria-label="Evaluation secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Evaluation secret"
        />
        <button
          className="button small"
          disabled={busy || !secret}
          type="submit"
        >
          {busy ? "Running…" : "Run 5 cases"}
        </button>
      </form>
      <p role="status">{result}</p>
    </section>
  );
}
