"use client";
import { useState } from "react";
import { Heart, Sparkles } from "lucide-react";
import { IdeaSchema, type Plan } from "@/lib/schemas";
import { compactPlanSnapshot } from "@/lib/llm/snapshot";
export function IdeasTab({
  plan: p,
  readOnly,
  onChange: change,
  onNotice,
}: {
  plan: Plan;
  readOnly: boolean;
  onChange: (v: Partial<Plan>) => void;
  onNotice: (v: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [effort, setEffort] = useState("all");
  const [ceiling, setCeiling] = useState(p.budget.total);
  const [busy, setBusy] = useState(false);
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: p.input.currency,
      maximumFractionDigits: 0,
    }).format(n);
  async function refine(
    action: "surprise" | "similar" | "cheaper" | "traditional" | "modern",
    ideaId?: string,
  ) {
    setBusy(true);
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: compactPlanSnapshot(p), action, ideaId }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      const ideas = IdeaSchema.array().parse(data.ideas);
      const titles = new Set(p.ideas.map((i) => i.title.toLowerCase()));
      const unique = ideas.filter((i) => !titles.has(i.title.toLowerCase()));
      if (unique.length) {
        change({ ideas: [...p.ideas, ...unique] });
        onNotice(
          `${unique.length} new ${data.source === "ai" ? "AI" : "smart-template"} ideas added.`,
        );
      } else
        onNotice(
          "No more matching ideas at the moment. Try a different style, kind or budget.",
        );
    } catch (error) {
      onNotice(
        error instanceof Error
          ? error.message
          : "Unable to load ideas. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  const shown = p.ideas.filter(
    (i) =>
      (filter === "all" ||
        (filter === "saved" && i.saved) ||
        i.kind === filter) &&
      (effort === "all" || i.effort === effort) &&
      i.estCost.max <= ceiling,
  );
  return (
    <>
      <div className="row between">
        <div>
          <h2>A little spark. A lot of possibility.</h2>
          <p className="muted">
            Picked for your people. Estimated costs are part of your existing
            category budget, not additional commitments.
          </p>
        </div>
        {!readOnly && (
          <button
            className="button secondary small"
            disabled={busy}
            onClick={() => void refine("surprise")}
          >
            <Sparkles size={16} />
            {busy ? "Finding ideas…" : "Surprise me"}
          </button>
        )}
      </div>
      <div className="chips idea-filters">
        {["all", "saved", ...new Set(p.ideas.map((i) => i.kind))].map((f) => (
          <button
            key={f}
            className={filter === f ? "selected" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="row idea-controls">
        <label>
          Effort
          <select value={effort} onChange={(e) => setEffort(e.target.value)}>
            <option value="all">All effort levels</option>
            {["low", "medium", "high"].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label>
          Maximum estimated cost
          <input
            type="number"
            min={0}
            max={p.budget.total}
            value={ceiling}
            onChange={(e) => setCeiling(Number(e.target.value))}
          />
        </label>
        {!readOnly && (
          <div className="chips">
            <button disabled={busy} onClick={() => void refine("traditional")}>
              More traditional
            </button>
            <button disabled={busy} onClick={() => void refine("modern")}>
              More modern
            </button>
            <button disabled={busy} onClick={() => void refine("cheaper")}>
              More budget-friendly
            </button>
          </div>
        )}
      </div>
      {!shown.length && (
        <div className="panel">
          <h3>No ideas match these filters yet.</h3>
          <p>Try a higher cost limit or save some ideas first.</p>
        </div>
      )}
      <div className="ideas-grid">
        {shown.map((idea, i) => (
          <article className="panel idea-card" key={idea.id}>
            <div className={`idea-art art-${i % 4}`}>
              <span aria-hidden="true">{["✳", "✦", "❋", "♡"][i % 4]}</span>
              <button
                aria-label={`${idea.saved ? "Unsave" : "Save"} ${idea.title}`}
                aria-pressed={idea.saved}
                disabled={readOnly}
                className="icon-button"
                onClick={() =>
                  change({
                    ideas: p.ideas.map((x) =>
                      x.id === idea.id ? { ...x, saved: !x.saved } : x,
                    ),
                  })
                }
              >
                <Heart size={19} fill={idea.saved ? "currentColor" : "none"} />
              </button>
            </div>
            <div className="idea-body">
              <span className="eyebrow">
                {idea.kind} · {idea.effort} effort
              </span>
              <h3>{idea.title}</h3>
              <p>{idea.description}</p>
              <p className="why">{idea.whyItFits}</p>
              <span className="estimate">
                {money(idea.estCost.min)} – {money(idea.estCost.max)}
              </span>
              {!readOnly && (
                <div className="chips refine-actions">
                  <button
                    disabled={busy}
                    onClick={() => void refine("similar", idea.id)}
                  >
                    More like this
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void refine("cheaper", idea.id)}
                  >
                    Make it cheaper
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
