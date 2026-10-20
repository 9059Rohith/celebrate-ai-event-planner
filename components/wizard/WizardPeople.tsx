"use client";
import type { EventInput } from "@/lib/schemas";
export function WizardPeople({
  input,
  patch,
  setStep,
}: {
  input: EventInput;
  patch: (v: Partial<EventInput>) => void;
  setStep: (n: number) => void;
}) {
  void setStep;
  return (
    <>
      <p className="muted">
        Make space for your people and the things that matter.
      </p>
      <div className="form-grid">
        <div>
          <label htmlFor="guests">Number of guests</label>
          <input
            id="guests"
            type="number"
            required
            min={2}
            max={5000}
            value={input.guestCount}
            onChange={(e) => patch({ guestCount: Number(e.target.value) })}
          />
        </div>
        <div>
          <label htmlFor="currency">Currency</label>
          <select
            id="currency"
            value={input.currency}
            onChange={(e) =>
              patch({
                currency: e.target.value as EventInput["currency"],
              })
            }
          >
            {["INR", "USD", "EUR", "GBP"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="budget">Total budget</label>
          <input
            id="budget"
            type="number"
            required
            min={1}
            value={input.totalBudget}
            onChange={(e) => patch({ totalBudget: Number(e.target.value) })}
          />
        </div>
        <div>
          <label htmlFor="flex">Budget flexibility</label>
          <select
            id="flex"
            value={input.budgetFlexibility}
            onChange={(e) =>
              patch({
                budgetFlexibility: e.target
                  .value as EventInput["budgetFlexibility"],
              })
            }
          >
            <option value="strict">Keep it strict</option>
            <option value="some">A little wiggle room</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>
      <fieldset className="age-fields">
        <legend>
          Age groups <span className="muted">(optional)</span>
        </legend>
        <div className="form-grid">
          {(["kids", "teens", "adults", "seniors"] as const).map((age) => (
            <div key={age}>
              <label htmlFor={`age-${age}`}>{age}</label>
              <input
                id={`age-${age}`}
                type="number"
                min={0}
                max={5000}
                value={input.ageGroups?.[age] || 0}
                onChange={(e) =>
                  patch({
                    ageGroups: {
                      kids: 0,
                      teens: 0,
                      adults: 0,
                      seniors: 0,
                      ...input.ageGroups,
                      [age]: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="budget-preview">
        <span>Room for every guest</span>
        <strong>
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: input.currency,
            maximumFractionDigits: 0,
          }).format(input.totalBudget / Math.max(input.guestCount, 1))}
          <small> per guest</small>
        </strong>
        <p>Includes a contingency fund for the unexpected.</p>
      </div>
      {input.totalBudget / input.guestCount < 300 &&
        input.currency === "INR" && (
          <p className="notice">
            This is a tight per-guest budget. Consider a home venue, shared
            catering or a smaller guest list.
          </p>
        )}
    </>
  );
}
