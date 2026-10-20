"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PlanSchema, type Plan } from "@/lib/schemas";
import { compactPlanSnapshot } from "@/lib/llm/snapshot";
import { usePlanStore } from "@/lib/store";
type Section = "timeline" | "vendors" | "ideas";
export function RegenerateSection({
  plan,
  section,
  onChange,
  onNotice,
}: {
  plan: Plan;
  section: Section;
  onChange: (v: Partial<Plan>) => void;
  onNotice: (v: string) => void;
}) {
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    value: Plan[Section];
    version: number;
  } | null>(null);
  async function request() {
    setBusy(true);
    try {
      const response = await fetch("/api/plan/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: compactPlanSnapshot(plan),
          section,
          instructions,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      const value = PlanSchema.shape[section].parse(data.value);
      setPreview({ value, version: plan.version });
    } catch (error) {
      onNotice(
        error instanceof Error
          ? error.message
          : "Unable to regenerate. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel regenerate">
      <summary>Refine this {section} section</summary>
      <label htmlFor={`refine-${section}`}>
        What would you like to change?
      </label>
      <textarea
        id={`refine-${section}`}
        maxLength={1000}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Describe the constraints to preserve and the details to improve."
      />
      <button
        className="button secondary small"
        disabled={busy}
        onClick={() => void request()}
      >
        <Sparkles size={14} />
        {busy ? "Preparing a preview…" : "Generate preview"}
      </button>
      {preview && (
        <div>
          <h3>Review the regenerated section</h3>
          <p>
            Your current section is kept until you accept. No AI key? The
            smart-template version is returned.
          </p>
          <pre className="preview-json">
            {JSON.stringify(preview.value, null, 2)}
          </pre>
          <div className="row">
            <button
              className="button small"
              onClick={() => {
                const current = usePlanStore
                  .getState()
                  .plans.find((p) => p.id === plan.id);
                if (current && current.version !== preview.version) {
                  onNotice(
                    "Your plan changed while this preview was open. Request a fresh preview.",
                  );
                  return;
                }
                onChange({ [section]: preview.value });
                setPreview(null);
              }}
            >
              Accept section
            </button>
            <button
              className="button secondary small"
              onClick={() => setPreview(null)}
            >
              Keep current section
            </button>
          </div>
        </div>
      )}
    </details>
  );
}
