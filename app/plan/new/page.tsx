"use client";
import "@/app/wizard.css";
import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";
import { exampleInput } from "@/lib/domain/examples";
import {
  EventInputSchema,
  type EventInput,
  type EventType,
} from "@/lib/schemas";
import { usePlanStore, useUIStore } from "@/lib/store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { writeLocal, safeStorage } from "@/lib/client/storage";
const Workspace = dynamic(() =>
  import("@/components/planner/Workspace").then((m) => m.Workspace),
);
import { WizardBasics } from "@/components/wizard/WizardBasics";
import { WizardPeople } from "@/components/wizard/WizardPeople";
import { WizardStyle } from "@/components/wizard/WizardStyle";
import { WizardDetails } from "@/components/wizard/WizardDetails";
import { WizardReview } from "@/components/wizard/WizardReview";
const steps = [
  "The occasion",
  "People & budget",
  "Your style",
  "The details",
  "Ready, set, celebrate",
];
export default function NewPlan() {
  return (
    <Suspense
      fallback={<div className="page-shell">Getting your planner ready…</div>}
    >
      <WizardRoute />
    </Suspense>
  );
}
function WizardRoute() {
  const params = useSearchParams();
  const id = params.get("offlinePlan");
  const plan = usePlanStore((s) => s.plans.find((p) => p.id === id));
  if (id && plan) return <Workspace plan={plan} />;
  return <Wizard />;
}
function Wizard() {
  const params = useSearchParams();
  const router = useRouter();
  const [input, setInput] = useState<EventInput>(() =>
    exampleInput(
      (["wedding", "birthday", "community"].includes(params.get("type") || "")
        ? params.get("type")
        : "wedding") as EventType,
    ),
  );
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const add = usePlanStore((s) => s.addPlan);
  const form = useForm<z.input<typeof EventInputSchema>, unknown, EventInput>({
    resolver: zodResolver(EventInputSchema),
    values: input,
  });
  useEffect(() => {
    if (!params.get("type")) {
      try {
        const saved = EventInputSchema.safeParse(
          JSON.parse(localStorage.getItem("celebrate-draft") || "null"),
        );
        queueMicrotask(() =>
          setInput(
            saved.success
              ? saved.data
              : { ...exampleInput(), currency: useUIStore.getState().currency },
          ),
        );
      } catch {}
    }
  }, [params]);
  const patch = (value: Partial<EventInput>) => {
    setInput((old) => {
      const next = { ...old, ...value };
      writeLocal("celebrate-draft", JSON.stringify(next));
      return next;
    });
  };
  const next = () => {
    const result = EventInputSchema.safeParse(input);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    if (!input.date && !input.planningWeeks) {
      setError("Choose an event date or a planning horizon.");
      return;
    }
    setError("");
    setStep((s) => Math.min(4, s + 1));
  };
  async function generate() {
    const valid = EventInputSchema.safeParse(input);
    if (!valid.success) {
      setError(valid.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { createPlan } = await import("@/lib/domain/planner");
    const initial = createPlan(valid.data);
    add(initial);
    writeLocal(`celebrate-enhance-${initial.id}`, JSON.stringify(valid.data));
    safeStorage.removeItem("celebrate-draft");
    if (!navigator.onLine) {
      history.pushState(null, "", `/plan/new?offlinePlan=${initial.id}`);
      return;
    }
    router.push(`/plan/${initial.id}?generating=1`);
  }
  return (
    <div className="wizard-page">
      <div className="section-heading">
        <div className="eyebrow">LET’S MAKE IT A DAY TO REMEMBER</div>
        <h1>Your celebration starts here.</h1>
        <p>A few details. A plan that feels like you.</p>
      </div>
      <div className="wizard-layout">
        <aside className="wizard-steps">
          {steps.map((name, i) => (
            <button
              key={name}
              disabled={i > step}
              onClick={() => setStep(i)}
              className={i === step ? "active" : ""}
            >
              <span>
                {i < step ? (
                  <Check size={16} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              {name}
            </button>
          ))}
          <div className="wizard-aside-note">
            ✧<p>There’s no perfect way to celebrate. Just your way.</p>
          </div>
        </aside>
        <section className="wizard-panel">
          <div className="row between">
            <span className="eyebrow">STEP {step + 1} OF 5</span>
            <span className="muted">Saved as you go</span>
          </div>
          <div className="progress">
            <span style={{ width: `${(step + 1) * 20}%` }} />
          </div>
          <h2>{steps[step]}</h2>
          <form
            onSubmit={form.handleSubmit(
              () => {
                if (step < 4) next();
                else void generate();
              },
              (errors) => {
                const text = JSON.stringify(errors, (_key, value) =>
                  _key === "ref" ? undefined : value,
                );
                setError(
                  text.match(/"message":"([^"]+)"/)?.[1] ||
                    "Check your details before continuing.",
                );
              },
            )}
          >
            {step === 0 && (
              <WizardBasics input={input} patch={patch} setStep={setStep} />
            )}
            {step === 1 && (
              <WizardPeople input={input} patch={patch} setStep={setStep} />
            )}
            {step === 2 && (
              <WizardStyle input={input} patch={patch} setStep={setStep} />
            )}
            {step === 3 && (
              <WizardDetails input={input} patch={patch} setStep={setStep} />
            )}
            {step === 4 && (
              <WizardReview input={input} patch={patch} setStep={setStep} />
            )}
            {error && (
              <p id="wizard-error" role="alert" className="notice">
                {error}
              </p>
            )}
            <div className="wizard-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => (step ? setStep(step - 1) : router.push("/"))}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button className="button" disabled={busy} type="submit">
                {step === 4 ? (
                  <>
                    <Sparkles size={17} />
                    {busy ? "Preparing your plan…" : "Create my celebration"}
                  </>
                ) : (
                  <>
                    Continue <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
