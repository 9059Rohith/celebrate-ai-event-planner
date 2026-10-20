"use client";
import Link from "next/link";
import { ArrowRight, CalendarDays, Trash2, Copy, Upload } from "lucide-react";
import { useSyncExternalStore, useRef, useState } from "react";
import { usePlanStore } from "@/lib/store";
import { PlanSchema } from "@/lib/schemas";
const subscribe = () => () => {};
export default function MyPlans() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const plans = usePlanStore((s) => s.plans);
  const remove = usePlanStore((s) => s.deletePlan);
  const duplicate = usePlanStore((s) => s.duplicatePlan);
  const add = usePlanStore((s) => s.addPlan);
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  return (
    <section id="my-plans" className="my-plans">
      <div className="row between">
        <div>
          <div className="eyebrow">YOUR LITTLE COLLECTION OF BIG MOMENTS</div>
          <h2>My celebrations</h2>
        </div>
        <button
          className="button secondary small"
          onClick={() => file.current?.click()}
        >
          <Upload size={15} /> Import plan
        </button>
        <input
          hidden
          ref={file}
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            try {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 262144) throw Error("File too large");
              const plan = PlanSchema.parse(JSON.parse(await f.text()));
              add({ ...plan, id: crypto.randomUUID() });
              setError("");
            } catch {
              setError(
                "Choose a valid exported plan JSON file (up to 256 KB).",
              );
            }
          }}
        />
      </div>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {ready && plans.length ? (
        <div className="saved-grid">
          {plans.map((p) => (
            <article className="panel" key={p.id}>
              <span className="eyebrow">{p.input.eventType}</span>
              <h3>
                <Link href={`/plan/${p.id}`}>{p.summary.headline}</Link>
              </h3>
              <p>
                <CalendarDays size={14} />{" "}
                {p.timeline.eventDate ||
                  `${p.input.planningWeeks} weeks to plan`}{" "}
                · {p.input.guestCount} guests
              </p>
              <div className="row">
                <Link className="text-link" href={`/plan/${p.id}`}>
                  Open plan <ArrowRight size={14} />
                </Link>
                <button
                  aria-label="Duplicate plan"
                  className="icon-button"
                  onClick={() => duplicate(p.id)}
                >
                  <Copy size={16} />
                </button>
                <button
                  aria-label="Delete plan"
                  className="icon-button"
                  onClick={() => {
                    if (confirm("Delete this saved celebration?")) remove(p.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-plans">
          <CalendarDays size={28} />
          <div>
            <h3>Your next great memory starts here.</h3>
            <p>Your saved celebrations will live right here, on this device.</p>
          </div>
          <Link href="/plan/new" className="text-link">
            Create your first plan <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}
