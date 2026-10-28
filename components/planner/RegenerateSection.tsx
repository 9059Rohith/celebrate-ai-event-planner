"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { Plan } from "@/lib/schemas";
import type { PlanChange } from "@/lib/hooks/usePlanActions";
import { useSectionRefinement } from "@/lib/hooks/useSectionRefinement";
type Section = "timeline" | "vendors" | "ideas";
type RegenerateSectionProps = {
  plan: Plan;
  section: Section;
  onChange: PlanChange;
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
  const { busy, preview, request, accept, dismiss } = useSectionRefinement({
    plan,
    section,
    onChange,
    onNotice,
  });
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
        onClick={() => void request(instructions)}
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
          <pre className="preview-json">{JSON.stringify(preview, null, 2)}</pre>
          <div className="row">
            <button className="button small" onClick={accept}>
              Accept section
            </button>
            <button className="button secondary small" onClick={dismiss}>
              Keep current section
            </button>
          </div>
        </div>
      )}
    </details>
  );
}
