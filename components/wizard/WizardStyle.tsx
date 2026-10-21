"use client";
import type { EventInput } from "@/lib/schemas";
import { OrderedPriorities } from "@/components/planner/OrderedPriorities";
export function WizardStyle({
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
      <label>Your celebration’s vibe</label>
      <div className="chips">
        {[
          "traditional",
          "modern",
          "minimalist",
          "rustic",
          "luxury",
          "fun",
          "spiritual",
          "eco-friendly",
          "kids-focused",
          "music",
          "elegant",
          "intimate",
        ].map((v) => (
          <button
            type="button"
            key={v}
            aria-pressed={input.vibe.includes(v as EventInput["vibe"][number])}
            className={
              input.vibe.includes(v as EventInput["vibe"][number])
                ? "selected"
                : ""
            }
            onClick={() =>
              patch({
                vibe: input.vibe.includes(v as EventInput["vibe"][number])
                  ? input.vibe.filter((x) => x !== v)
                  : [...input.vibe, v as EventInput["vibe"][number]],
              })
            }
          >
            {v}
          </button>
        ))}
      </div>
      <label>Dietary needs</label>
      <div className="chips">
        {[
          "vegetarian",
          "vegan",
          "jain",
          "halal",
          "kosher",
          "gluten-free",
          "nut-allergy",
          "no-alcohol",
          "alcohol-ok",
        ].map((d) => (
          <button
            type="button"
            key={d}
            aria-pressed={input.dietary.includes(
              d as EventInput["dietary"][number],
            )}
            className={
              input.dietary.includes(d as EventInput["dietary"][number])
                ? "selected"
                : ""
            }
            onClick={() =>
              patch({
                dietary: input.dietary.includes(
                  d as EventInput["dietary"][number],
                )
                  ? input.dietary.filter((x) => x !== d)
                  : [...input.dietary, d as EventInput["dietary"][number]],
              })
            }
          >
            {d}
          </button>
        ))}
      </div>
      <label>
        Top priorities <span className="muted">(pick up to 3, in order)</span>
      </label>
      <div className="chips">
        {(
          [
            "catering",
            "venue",
            "decor",
            "photography",
            "music",
            "activities",
          ] as const
        ).map((c) => (
          <button
            type="button"
            key={c}
            aria-pressed={input.priorities.includes(c)}
            className={input.priorities.includes(c) ? "selected" : ""}
            onClick={() =>
              patch({
                priorities: input.priorities.includes(c)
                  ? input.priorities.filter((x) => x !== c)
                  : input.priorities.length < 3
                    ? [...input.priorities, c]
                    : input.priorities,
              })
            }
          >
            {input.priorities.includes(c)
              ? `${input.priorities.indexOf(c) + 1}. `
              : ""}
            {c}
          </button>
        ))}
      </div>
      <OrderedPriorities
        value={input.priorities}
        onChange={(priorities) => patch({ priorities })}
      />
      <label htmlFor="culture">Traditions, stories or cultural details</label>
      <textarea
        id="culture"
        maxLength={500}
        value={input.culturalNotes || ""}
        placeholder="Tell us what matters to you — we won’t assume."
        onChange={(e) => patch({ culturalNotes: e.target.value })}
      />
      <div className="form-grid">
        <div>
          <label htmlFor="must">Must-haves, comma separated</label>
          <input
            id="must"
            value={input.mustHaves?.join(",") || ""}
            onChange={(e) => patch({ mustHaves: e.target.value.split(",") })}
          />
        </div>
        <div>
          <label htmlFor="avoid">Things to avoid</label>
          <input
            id="avoid"
            value={input.avoid?.join(",") || ""}
            onChange={(e) => patch({ avoid: e.target.value.split(",") })}
          />
        </div>
      </div>
    </>
  );
}
