"use client";
import type { EventInput } from "@/lib/schemas";
import { Heart, Cake, Users } from "lucide-react";
import { exampleInput } from "@/lib/domain/examples";
export function WizardBasics({
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
      <label>What are we celebrating?</label>
      <div className="type-options">
        {(["wedding", "birthday", "community"] as const).map((type, i) => {
          const Icon = [Heart, Cake, Users][i];
          return (
            <button
              key={type}
              type="button"
              className={input.eventType === type ? "selected" : ""}
              onClick={() =>
                patch({
                  ...exampleInput(type),
                  title: input.title,
                  location: input.location,
                })
              }
            >
              <Icon size={21} />
              {type === "community" ? "Community" : type}
            </button>
          );
        })}
      </div>
      <label htmlFor="title">Give your celebration a name</label>
      <input
        id="title"
        maxLength={80}
        placeholder="e.g. Aanya & Arjun’s wedding"
        value={input.title || ""}
        onChange={(e) => patch({ title: e.target.value })}
      />
      <div className="form-grid">
        <div>
          <label htmlFor="city">City</label>
          <input
            id="city"
            required
            value={input.location.city}
            onChange={(e) =>
              patch({
                location: { ...input.location, city: e.target.value },
              })
            }
          />
        </div>
        <div>
          <label htmlFor="country">Country</label>
          <input
            id="country"
            maxLength={100}
            required
            value={input.location.country}
            onChange={(e) =>
              patch({
                location: {
                  ...input.location,
                  country: e.target.value,
                },
              })
            }
          />
        </div>
        <div>
          <label htmlFor="date">
            Event date <span className="muted">(optional)</span>
          </label>
          <input
            id="date"
            type="date"
            value={input.date || ""}
            onChange={(e) => patch({ date: e.target.value || undefined })}
          />
        </div>
        <div>
          <label htmlFor="weeks">Planning horizon in weeks</label>
          <input
            id="weeks"
            type="number"
            min={1}
            max={156}
            value={input.planningWeeks || 16}
            onChange={(e) => patch({ planningWeeks: Number(e.target.value) })}
          />
        </div>
        <div>
          <label htmlFor="setting">Setting</label>
          <select
            id="setting"
            value={input.location.indoorOutdoor}
            onChange={(e) =>
              patch({
                location: {
                  ...input.location,
                  indoorOutdoor: e.target
                    .value as EventInput["location"]["indoorOutdoor"],
                },
              })
            }
          >
            <option value="either">Open to either</option>
            <option value="indoor">Indoors</option>
            <option value="outdoor">Outdoors</option>
          </select>
        </div>
      </div>
    </>
  );
}
