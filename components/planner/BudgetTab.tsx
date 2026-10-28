"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Undo2, Redo2, Sparkles, Lock, Unlock, Check } from "lucide-react";
import type { Plan } from "@/lib/schemas";
import { rebalance, setContingency } from "@/lib/domain/budgetEngine";
import { usePlanStore } from "@/lib/store";
import { useSectionRefinement } from "@/lib/hooks/useSectionRefinement";
import type { PlanChange } from "@/lib/hooks/usePlanActions";
const BudgetCharts = dynamic(() => import("@/components/budget/BudgetCharts"), {
  ssr: false,
  loading: () => (
    <p className="muted" aria-busy="true">
      Loading allocation charts…
    </p>
  ),
});
type BudgetTabProps = {
  plan: Plan;
  readOnly: boolean;
  onChange: PlanChange;
  onNotice: (v: string) => void;
};
export function BudgetTab(props: BudgetTabProps) {
  return <BudgetEditor key={`${props.plan.id}:${props.readOnly}`} {...props} />;
}
function BudgetEditor({
  plan: p,
  readOnly,
  onChange: change,
  onNotice,
}: BudgetTabProps) {
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: p.input.currency,
      maximumFractionDigits: 0,
    }).format(n);
  const undo = usePlanStore((s) => s.undo);
  const redo = usePlanStore((s) => s.redo);
  const history = usePlanStore((s) => s.history);
  const { busy, preview, request, accept, dismiss } = useSectionRefinement({
    plan: p,
    section: "budget",
    readOnly,
    onChange: change,
    onNotice,
  });
  const frame = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = undefined;
    },
    [],
  );
  const adjust = (id: string, pct: number) => {
    if (readOnly) return;
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      const state = usePlanStore.getState();
      const current = state.plans.find((plan) => plan.id === p.id);
      if (!current || state.currentPlanId !== p.id) return;
      const r = rebalance(
        current.budget.lines,
        id,
        { pct },
        current.budget.total - current.budget.contingencyAmount,
      );
      if (r.ok)
        change(
          { budget: { ...current.budget, lines: r.lines } },
          current.version,
        );
      else onNotice(r.error);
    });
  };
  return (
    <>
      <div className="row between">
        <div>
          <h2>Dream big. Spend thoughtfully.</h2>
          <p className="muted">
            All amounts are estimates. Adjust a category; the rest stays
            balanced.
          </p>
        </div>
        {!readOnly && (
          <div className="row">
            <button
              className="icon-button"
              disabled={!history.past.length}
              aria-label="Undo"
              onClick={undo}
            >
              <Undo2 size={19} />
            </button>
            <button
              className="icon-button"
              disabled={!history.future.length}
              aria-label="Redo"
              onClick={redo}
            >
              <Redo2 size={19} />
            </button>
            <button
              className="button secondary small"
              disabled={busy}
              onClick={() =>
                void request(
                  "Optimize allocations around my priorities. Preserve locked amounts and exact total. Explain changes in per-line notes.",
                )
              }
            >
              <Sparkles size={15} />
              {busy ? "Optimizing…" : "Ask AI to optimize"}
            </button>
          </div>
        )}
      </div>
      {preview && (
        <section className="panel">
          <h3>Review the suggested allocation</h3>
          {preview.lines.map((l) => (
            <p key={l.id}>
              {l.label}: {money(l.allocatedAmount)} —{" "}
              {l.notes || "Balanced against your event priorities."}
            </p>
          ))}
          <div className="row">
            <button
              className="button small"
              onClick={() => {
                if (accept())
                  onNotice("Suggestion applied. Undo is available.");
              }}
            >
              <Check size={15} /> Accept suggestion
            </button>
            <button className="button secondary small" onClick={dismiss}>
              Keep current budget
            </button>
          </div>
        </section>
      )}
      <div className="budget-layout">
        <section className="panel">
          <div className="budget-total">
            <span>Your total budget</span>
            <strong>{money(p.budget.total)}</strong>
            <small>
              {money(p.budget.perGuestCost)} per guest
              {p.input.eventSpecific.type === "wedding"
                ? ` · ${money(p.budget.total / Math.max(1, p.input.eventSpecific.functions.length) / p.input.guestCount)} per guest per function`
                : ""}
            </small>
          </div>
          <BudgetCharts budget={p.budget} />
          {p.budget.lines.map((l, i) => (
            <div className="budget-row" key={l.id}>
              <div className="row between">
                <span>
                  <i
                    style={{
                      background: [
                        "#a95238",
                        "#c27d59",
                        "#c1a455",
                        "#6d7b60",
                        "#998298",
                        "#628087",
                      ][i % 6],
                    }}
                  />
                  {l.label}
                </span>
                <strong>{money(l.allocatedAmount)}</strong>
              </div>
              <div className="row">
                <input
                  aria-label={`${l.label} allocation`}
                  type="range"
                  min={l.minPct}
                  max={l.maxPct}
                  step={0.5}
                  value={l.pct}
                  disabled={readOnly || l.locked}
                  onChange={(e) => adjust(l.id, Number(e.target.value))}
                />
                <small>{l.pct.toFixed(1)}%</small>
                <button
                  className="icon-button"
                  disabled={readOnly}
                  aria-label={`${l.locked ? "Unlock" : "Lock"} ${l.label}`}
                  onClick={() =>
                    change({
                      budget: {
                        ...p.budget,
                        lines: p.budget.lines.map((x) =>
                          x.id === l.id ? { ...x, locked: !x.locked } : x,
                        ),
                      },
                    })
                  }
                >
                  {l.locked ? <Lock size={15} /> : <Unlock size={15} />}
                </button>
              </div>
              {l.notes && <p>{l.notes}</p>}
            </div>
          ))}
        </section>
        <aside>
          <section className="panel contingency">
            <span className="eyebrow">A LITTLE BREATHING ROOM</span>
            <h3>The just-in-case fund</h3>
            <strong>{money(p.budget.contingencyAmount)}</strong>
            <label htmlFor="contingency">
              Contingency · {p.budget.contingencyPct}%
            </label>
            <input
              id="contingency"
              disabled={readOnly}
              type="range"
              min={5}
              max={20}
              value={p.budget.contingencyPct}
              onChange={(e) => {
                const r = setContingency(p.budget, Number(e.target.value));
                if (r.ok) change({ budget: r.budget });
                else onNotice(r.error);
              }}
            />
            <p>
              Locked amounts stay fixed. An adjustment is rejected when the
              remaining allocations cannot fit.
            </p>
          </section>
          <section className="panel">
            <h3>Keep in mind</h3>
            {p.budget.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
            <p>
              Allocated + contingency ={" "}
              {money(
                p.budget.lines.reduce((s, l) => s + l.allocatedAmount, 0) +
                  p.budget.contingencyAmount,
              )}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
