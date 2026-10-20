"use client";
import { ArrowRight, Wallet, Users, CalendarDays } from "lucide-react";
import { useState } from "react";
import type { Plan } from "@/lib/schemas";
export function OverviewTab({
  plan: p,
  readOnly,
  onChange: change,
  onTab: setTab,
}: {
  plan: Plan;
  readOnly: boolean;
  onChange: (v: Partial<Plan>) => void;
  onTab: (t: string) => void;
}) {
  const [now] = useState(() => Date.now());
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: p.input.currency,
      maximumFractionDigits: 0,
    }).format(n);
  const completed = p.timeline.milestones.filter(
    (m) => m.status === "done",
  ).length;
  const progress = Math.round(
    (completed / Math.max(p.timeline.milestones.length, 1)) * 100,
  );
  return (
    <>
      <div className="overview-grid">
        <div className="vision-panel">
          <span className="eyebrow">THE VISION</span>
          <h2>A celebration that feels like you.</h2>
          <p>{p.summary.oneParagraphVision}</p>
          <button className="text-link" onClick={() => setTab("Ideas")}>
            Find your inspiration <ArrowRight size={16} />
          </button>
          <span className="vision-spark">✳</span>
        </div>
        <div className="panel progress-panel">
          <div
            className="progress-ring"
            style={{
              background: `conic-gradient(var(--accent) ${progress}%,var(--border) 0)`,
            }}
          >
            <div>
              <strong>{progress}%</strong>
              <span>ready to celebrate</span>
            </div>
          </div>
          <p>
            {completed} of {p.timeline.milestones.length} milestones complete
          </p>
        </div>
      </div>
      <div className="stats stat-cards">
        <div>
          <Wallet size={20} />
          <span>Total budget</span>
          <strong>{money(p.budget.total)}</strong>
          <small>{money(p.budget.contingencyAmount)} kept for surprises</small>
        </div>
        <div>
          <Users size={20} />
          <span>A place for everyone</span>
          <strong>{p.input.guestCount} guests</strong>
          <small>{money(p.budget.perGuestCost)} per person</small>
        </div>
        <div>
          <CalendarDays size={20} />
          <span>The countdown</span>
          <strong>
            {p.timeline.eventDate
              ? `${Math.ceil((new Date(p.timeline.eventDate).getTime() - now) / 86400000)} days`
              : `${p.input.planningWeeks} weeks`}
          </strong>
          <small>One thoughtful step at a time</small>
        </div>
      </div>
      <div className="two-column">
        <section className="panel">
          <div className="row between">
            <h3>Your next little steps</h3>
            <button className="text-link" onClick={() => setTab("Timeline")}>
              See timeline <ArrowRight size={15} />
            </button>
          </div>
          {p.timeline.milestones
            .filter((m) => m.status !== "done")
            .slice(0, 5)
            .map((m) => (
              <label className="task-row" key={m.id}>
                <input
                  type="checkbox"
                  disabled={readOnly}
                  onChange={() =>
                    change({
                      timeline: {
                        ...p.timeline,
                        milestones: p.timeline.milestones.map((x) =>
                          x.id === m.id ? { ...x, status: "done" } : x,
                        ),
                      },
                    })
                  }
                />
                <span>
                  {m.title}
                  <small>
                    {m.dueDate || `${Math.abs(m.dueOffsetDays)} days before`} ·{" "}
                    {m.category}
                  </small>
                </span>
                <span className="badge">{m.priority}</span>
              </label>
            ))}
        </section>
        <section className="panel">
          <h3>A little foresight goes a long way</h3>
          {p.summary.keyRisks.length ? (
            p.summary.keyRisks.map((r) => (
              <p className="risk" key={r}>
                {r}
              </p>
            ))
          ) : (
            <p>
              Your plan has room to breathe. Confirm actual quotes before making
              commitments.
            </p>
          )}
          <details>
            <summary>What we’ve assumed</summary>
            {p.summary.assumptions.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </details>
        </section>
      </div>
    </>
  );
}
