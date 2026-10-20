"use client";
import Link from "next/link";
import { CalendarDays, Upload, ArrowRight } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
const MyPlans = lazy(() => import("./MyPlans"));
export function DeferredPlans() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={host}>
      {visible ? (
        <Suspense fallback={<Placeholder />}>
          <MyPlans />
        </Suspense>
      ) : (
        <Placeholder />
      )}
    </div>
  );
}
function Placeholder() {
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
          onChange={async (event) => {
            try {
              const selected = event.target.files?.[0];
              if (!selected) return;
              if (selected.size > 262144) throw Error("File too large");
              const [{ PlanSchema }, { usePlanStore }] = await Promise.all([
                import("@/lib/schemas"),
                import("@/lib/store"),
              ]);
              const plan = PlanSchema.parse(JSON.parse(await selected.text()));
              usePlanStore
                .getState()
                .addPlan({ ...plan, id: crypto.randomUUID() });
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
    </section>
  );
}
