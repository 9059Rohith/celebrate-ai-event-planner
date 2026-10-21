"use client";
import type { EventInput } from "@/lib/schemas";
export function WizardDetails({
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
      {input.eventSpecific.type === "wedding" && (
        <>
          <label>Wedding functions</label>
          <div className="chips">
            {(
              [
                "engagement",
                "haldi",
                "mehendi",
                "sangeet",
                "ceremony",
                "reception",
                "other",
              ] as const
            ).map((f) => (
              <button
                type="button"
                key={f}
                aria-pressed={
                  input.eventSpecific.type === "wedding" &&
                  input.eventSpecific.functions.includes(f)
                }
                className={
                  input.eventSpecific.type === "wedding" &&
                  input.eventSpecific.functions.includes(f)
                    ? "selected"
                    : ""
                }
                onClick={() => {
                  if (input.eventSpecific.type === "wedding")
                    patch({
                      eventSpecific: {
                        ...input.eventSpecific,
                        functions: input.eventSpecific.functions.includes(f)
                          ? input.eventSpecific.functions.filter((x) => x !== f)
                          : [...input.eventSpecific.functions, f],
                      },
                    });
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <label htmlFor="days">How many days?</label>
          <input
            id="days"
            type="number"
            min={1}
            max={5}
            value={input.eventSpecific.days}
            onChange={(e) => {
              if (input.eventSpecific.type === "wedding")
                patch({
                  eventSpecific: {
                    ...input.eventSpecific,
                    days: Number(e.target.value),
                  },
                });
            }}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={input.eventSpecific.destination}
              onChange={(e) => {
                if (input.eventSpecific.type === "wedding")
                  patch({
                    eventSpecific: {
                      ...input.eventSpecific,
                      destination: e.target.checked,
                    },
                  });
              }}
            />{" "}
            A destination wedding
          </label>
        </>
      )}
      {input.eventSpecific.type === "birthday" && (
        <>
          <label htmlFor="age">Honoree’s age</label>
          <input
            id="age"
            type="number"
            min={0}
            max={150}
            value={input.eventSpecific.honoreeAge}
            onChange={(e) => {
              if (input.eventSpecific.type === "birthday")
                patch({
                  eventSpecific: {
                    ...input.eventSpecific,
                    honoreeAge: Number(e.target.value),
                  },
                });
            }}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={input.eventSpecific.milestone}
              onChange={(e) => {
                if (input.eventSpecific.type === "birthday")
                  patch({
                    eventSpecific: {
                      ...input.eventSpecific,
                      milestone: e.target.checked,
                    },
                  });
              }}
            />{" "}
            This is a milestone birthday
          </label>
          <label htmlFor="interests">
            Their favourite things, comma separated
          </label>
          <input
            id="interests"
            value={input.eventSpecific.honoreeInterests.join(",")}
            onChange={(e) => {
              if (input.eventSpecific.type === "birthday")
                patch({
                  eventSpecific: {
                    ...input.eventSpecific,
                    honoreeInterests: e.target.value.split(","),
                  },
                });
            }}
          />
        </>
      )}
      {input.eventSpecific.type === "community" && (
        <>
          <label htmlFor="purpose">What brings everyone together?</label>
          <select
            id="purpose"
            value={input.eventSpecific.purpose}
            onChange={(e) => {
              if (input.eventSpecific.type === "community")
                patch({
                  eventSpecific: {
                    ...input.eventSpecific,
                    purpose: e.target.value as "festival",
                  },
                });
            }}
          >
            {[
              "fundraiser",
              "festival",
              "meetup",
              "cultural",
              "sports",
              "educational",
              "religious",
              "other",
            ].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <label className="check-row">
            <input
              type="checkbox"
              checked={input.eventSpecific.permitsNeeded || false}
              onChange={(e) => {
                if (input.eventSpecific.type === "community")
                  patch({
                    eventSpecific: {
                      ...input.eventSpecific,
                      permitsNeeded: e.target.checked,
                    },
                  });
              }}
            />{" "}
            We need local permissions or permits
          </label>
          <label htmlFor="volunteers">Volunteers available</label>
          <input
            id="volunteers"
            type="number"
            min={0}
            value={input.eventSpecific.volunteersAvailable}
            onChange={(e) => {
              if (input.eventSpecific.type === "community")
                patch({
                  eventSpecific: {
                    ...input.eventSpecific,
                    volunteersAvailable: Number(e.target.value),
                  },
                });
            }}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={input.eventSpecific.ticketed}
              onChange={(e) => {
                if (input.eventSpecific.type === "community")
                  patch({
                    eventSpecific: {
                      ...input.eventSpecific,
                      ticketed: e.target.checked,
                    },
                  });
              }}
            />{" "}
            This is a ticketed event
          </label>
        </>
      )}
      <div className="notice">
        We’ll include accessibility, weather contingencies and vendor questions
        in your plan. All cost figures are estimates.
      </div>
    </>
  );
}
