"use client";
import type { EventInput } from "@/lib/schemas";
const steps = ["The occasion", "People & budget", "Your style", "The details"];
export function WizardReview({
  input,
  patch,
  setStep,
}: {
  input: EventInput;
  patch: (v: Partial<EventInput>) => void;
  setStep: (n: number) => void;
}) {
  void patch;
  return (
    <>
      <div className="review-card">
        <span className="eyebrow">YOUR NEXT GREAT MEMORY</span>
        <h3>{input.title || `A beautiful ${input.eventType}`}</h3>
        <p>
          {input.location.city} ·{" "}
          {input.date || `${input.planningWeeks} weeks to plan`}
        </p>
        <div className="stats">
          <div>
            <strong>{input.guestCount}</strong>
            <span>happy guests</span>
          </div>
          <div>
            <strong>
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: input.currency,
                maximumFractionDigits: 0,
              }).format(input.totalBudget)}
            </strong>
            <span>thoughtful budget</span>
          </div>
        </div>
        <p>
          {input.vibe.join(" · ")}
          <br />
          {input.dietary.join(" · ")}
        </p>
      </div>
      <div className="chips">
        {steps.slice(0, 4).map((label, i) => (
          <button key={label} type="button" onClick={() => setStep(i)}>
            Edit {label.toLowerCase()}
          </button>
        ))}
      </div>
      <p className="muted">
        You’ll get a complete budget, a timeline, vendor checklists and ideas
        picked for you. Everything is editable and saved on this device.
      </p>
    </>
  );
}
