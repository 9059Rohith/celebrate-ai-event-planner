"use client";
import { useEffect, useRef } from "react";
import type { Plan } from "@/lib/schemas";
import type { PlanEnhancement } from "@/lib/llm/planEnhancement";

export function PlanEnhancementPreview({
  plan,
  enhancement,
  onAccept,
  onDismiss,
}: {
  plan: Plan;
  enhancement: PlanEnhancement;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const rows = enhancement.sections.flatMap((section) => {
    switch (section.section) {
      case "budget":
        return section.changes.map((change) => ({
          id: `budget-${change.id}`,
          label: plan.budget.lines.find((line) => line.id === change.id)!.label,
          text: [change.notes],
        }));
      case "timeline":
        return section.changes.map((change) => ({
          id: `timeline-${change.id}`,
          label: plan.timeline.milestones.find((row) => row.id === change.id)!
            .title,
          text: [change.notes],
        }));
      case "vendors":
        return section.changes.map((change) => ({
          id: `vendor-${change.id}`,
          label: plan.vendors.find((row) => row.id === change.id)!.category,
          text: [change.why, ...(change.questionsToAdd ?? [])],
        }));
      case "ideas":
        return section.changes.map((change) => ({
          id: `idea-${change.id}`,
          label: plan.ideas.find((row) => row.id === change.id)!.title,
          text: [change.description, change.whyItFits],
        }));
    }
  });
  return (
    <section
      className="panel page-shell no-print"
      aria-labelledby="enhancement-title"
    >
      <h2 id="enhancement-title" ref={heading} tabIndex={-1}>
        Review AI details
      </h2>
      <p>
        Your saved plan stays unchanged until you accept. You can undo this
        update.
      </p>
      {enhancement.summary.oneParagraphVision && (
        <p>{enhancement.summary.oneParagraphVision}</p>
      )}
      {[
        ...(enhancement.summary.keyRisksToAdd ?? []),
        ...(enhancement.summary.assumptionsToAdd ?? []),
      ].map((text) => (
        <p key={text}>{text}</p>
      ))}
      {rows.length > 0 && (
        <details>
          <summary>Section details ({rows.length})</summary>
          <dl>
            {rows.map((row) => (
              <div key={row.id}>
                <dt>
                  <strong>{row.label}</strong>
                </dt>
                {row.text
                  .filter((text) => text !== undefined)
                  .map((text, index) => (
                    <dd key={index}>{text}</dd>
                  ))}
              </div>
            ))}
          </dl>
        </details>
      )}
      <div className="row">
        <button className="button" onClick={onAccept}>
          Accept AI details
        </button>
        <button className="button secondary" onClick={onDismiss}>
          Keep current plan
        </button>
      </div>
    </section>
  );
}
