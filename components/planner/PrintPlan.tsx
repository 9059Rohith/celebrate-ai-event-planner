import type { Plan } from "@/lib/schemas";
export function PrintPlan({ plan: p }: { plan: Plan }) {
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: p.input.currency,
      maximumFractionDigits: 0,
    }).format(n);
  return (
    <article className="print-plan">
      <h1>{p.summary.headline}</h1>
      <p>
        {p.input.eventType} · {p.input.location.city} · {p.timeline.eventDate} ·{" "}
        {p.input.guestCount} guests
      </p>
      <h2>Your vision</h2>
      <p>{p.summary.oneParagraphVision}</p>
      <h3>Risks and assumptions</h3>
      <ul>
        {[...p.summary.keyRisks, ...p.summary.assumptions].map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
      <h2>Budget · {money(p.budget.total)}</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Estimate</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {p.budget.lines.map((l) => (
            <tr key={l.id}>
              <td>{l.label}</td>
              <td>{money(l.allocatedAmount)}</td>
              <td>{l.notes}</td>
            </tr>
          ))}
          <tr>
            <td>Contingency</td>
            <td>{money(p.budget.contingencyAmount)}</td>
            <td>{p.budget.contingencyPct}%</td>
          </tr>
        </tbody>
      </table>
      <p>
        Per guest: {money(p.budget.perGuestCost)}. All amounts are estimates,
        not quotes.
      </p>
      <h2>Planning timeline</h2>
      {p.timeline.milestones.map((m) => (
        <p key={m.id}>
          {m.status === "done" ? "☑" : "☐"} {m.dueDate} · {m.title} — {m.notes}
        </p>
      ))}
      <h2>Run of show</h2>
      {p.timeline.dayOf.map((s) => (
        <p key={s.id}>
          Day {s.day || 1} · {s.startTime} ({s.durationMin} min) · {s.title} ·{" "}
          {s.owner || ""} — {s.notes}
        </p>
      ))}
      <h2>Vendor guidance</h2>
      {p.vendors.map((v) => (
        <section key={v.id}>
          <h3>{v.category}</h3>
          <p>
            {v.why} · Book {v.bookLeadWeeks} weeks ahead · Estimated{" "}
            {money(v.estPriceRange.min)}–{money(v.estPriceRange.max)} /{" "}
            {v.estPriceRange.unit}
          </p>
          <ul>
            {v.checklist.map((c) => (
              <li key={c.id}>
                {c.done ? "☑" : "☐"} {c.text}
              </li>
            ))}
          </ul>
          <h4>Questions to ask</h4>
          <ul>
            {v.questionsToAsk.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h4>Red flags</h4>
          <ul>
            {v.redFlags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h4>Contract must-haves</h4>
          <ul>
            {v.contractMustHaves.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ))}
      <h2>Personalized ideas</h2>
      {p.ideas.map((i) => (
        <section key={i.id}>
          <h3>
            {i.title}
            {i.saved ? " ♥" : ""}
          </h3>
          <p>{i.description}</p>
          <p>
            {i.whyItFits} · Estimated {money(i.estCost.min)}–
            {money(i.estCost.max)} · {i.effort} effort
          </p>
        </section>
      ))}
    </article>
  );
}
