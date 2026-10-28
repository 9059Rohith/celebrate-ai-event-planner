"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { PlanSchema, type Plan } from "@/lib/schemas";
import { compactPlanSnapshot } from "@/lib/llm/snapshot";
import { usePlanStore } from "@/lib/store";
type Section = "timeline" | "vendors" | "ideas";
type RegenerateSectionProps = {
  plan: Plan;
  section: Section;
  onChange: (v: Partial<Plan>) => void;
  onNotice: (v: string) => void;
};
export function RegenerateSection(props: RegenerateSectionProps) {
  return (
    <SectionPreview key={`${props.plan.id}:${props.section}`} {...props} />
  );
}
function SectionPreview({
  plan,
  section,
  onChange,
  onNotice,
}: RegenerateSectionProps) {
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    value: Plan[Section];
    version: number;
    stored: boolean;
  } | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
    },
    [],
  );
  async function request() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    const stored = usePlanStore.getState().plans.find((p) => p.id === plan.id);
    const snapshot = stored ?? plan;
    setBusy(true);
    setPreview(null);
    try {
      const response = await fetch("/api/plan/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          plan: compactPlanSnapshot(snapshot),
          section,
          instructions,
        }),
      });
      const data = await response.json();
      if (controller.signal.aborted || pending.current !== controller) return;
      if (!response.ok) throw Error(data.error);
      const value = PlanSchema.shape[section].parse(data.value);
      setPreview({ value, version: snapshot.version, stored: !!stored });
    } catch (error) {
      if (controller.signal.aborted || pending.current !== controller) return;
      onNotice(
        error instanceof Error
          ? error.message
          : "Unable to regenerate. Please retry.",
      );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
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
                if (
                  (preview.stored && !current) ||
                  (current ?? plan).version !== preview.version
                ) {
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
