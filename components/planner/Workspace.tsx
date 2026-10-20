"use client";
import "@/app/workspace.css";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Share2,
  Printer,
  Copy,
  Trash2,
  Check,
  Sparkles,
  Undo2,
  Redo2,
} from "lucide-react";
import { PlanSchema, type Plan } from "@/lib/schemas";
import { usePlanStore } from "@/lib/store";
import { download } from "@/lib/client/network";
import { OverviewTab } from "./OverviewTab";
import { PrintPlan } from "./PrintPlan";
import { Feedback } from "./Feedback";
import { SectionBoundary } from "./SectionBoundary";
const loading = () => (
  <section className="panel" aria-busy="true">
    Opening the little details…
  </section>
);
const BudgetTab = dynamic(
  () => import("./BudgetTab").then((m) => m.BudgetTab),
  { loading },
);
const TimelineTab = dynamic(
  () => import("./TimelineTab").then((m) => m.TimelineTab),
  { loading },
);
const VendorsTab = dynamic(
  () => import("./VendorsTab").then((m) => m.VendorsTab),
  { loading },
);
const IdeasTab = dynamic(() => import("./IdeasTab").then((m) => m.IdeasTab), {
  loading,
});
const ChatTab = dynamic(() => import("./ChatTab").then((m) => m.ChatTab), {
  loading,
});
const RegenerateSection = dynamic(
  () => import("./RegenerateSection").then((m) => m.RegenerateSection),
  { loading },
);
const tabs = ["Overview", "Budget", "Timeline", "Vendors", "Ideas", "Chat"];
export { download } from "@/lib/client/network";
export function Workspace(props: {
  plan: Plan;
  readOnly?: boolean;
  busy?: boolean;
  generationError?: string;
  onRetry?: () => void;
}) {
  return (
    <Suspense fallback={loading()}>
      <WorkspaceInner {...props} />
    </Suspense>
  );
}
function WorkspaceInner({
  plan: p,
  readOnly = false,
  busy = false,
  generationError = "",
  onRetry,
}: {
  plan: Plan;
  readOnly?: boolean;
  busy?: boolean;
  generationError?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const tab =
    tabs.find((t) => t.toLowerCase() === params.get("tab")) || "Overview";
  const [notice, setNotice] = useState("");
  const [dismissFallback, setDismissFallback] = useState(false);
  const add = usePlanStore((s) => s.addPlan);
  const remove = usePlanStore((s) => s.deletePlan);
  const duplicate = usePlanStore((s) => s.duplicatePlan);
  const pushHistory = usePlanStore((s) => s.pushHistory);
  const update = usePlanStore((s) => s.updatePlan);
  const setCurrent = usePlanStore((s) => s.setCurrentPlan);
  const undo = usePlanStore((s) => s.undo);
  const redo = usePlanStore((s) => s.redo);
  const historyState = usePlanStore((s) => s.history);
  useEffect(() => {
    if (!readOnly) setCurrent(p.id);
  }, [p.id, readOnly, setCurrent]);
  const onTab = (name: string) => {
    const url = new URL(location.href);
    url.searchParams.set("tab", name.toLowerCase());
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  };
  const change = (updates: Partial<Plan>) => {
    if (readOnly) return;
    try {
      const latest =
        usePlanStore.getState().plans.find((x) => x.id === p.id) || p;
      const next = PlanSchema.parse({ ...latest, ...updates });
      pushHistory(latest);
      update(p.id, next);
    } catch {
      setNotice(
        "The change could not be validated. Your current plan was kept.",
      );
    }
  };
  async function share() {
    const { getShareUrl } = await import("@/lib/share");
    const url = getShareUrl(p);
    if (!url) {
      setNotice(
        "This plan is too large for a shared link. Export JSON instead.",
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice(
        "Read-only share link copied. Anyone with the link can view this copy.",
      );
    } catch {
      setNotice(url);
    }
  }
  const sectionProps = { plan: p, readOnly, onChange: change };
  return (
    <>
      <div className="workspace page-shell no-print">
        {readOnly && (
          <div className="notice row between">
            <span>This is a shared copy. Import to edit.</span>
            <button
              className="button small"
              onClick={() => {
                const copy = { ...p, id: crypto.randomUUID() };
                add(copy);
                router.push(`/plan/${copy.id}`);
              }}
            >
              Import to my plans
            </button>
          </div>
        )}
        <div className="workspace-top">
          <Link className="text-link" href="/#my-plans">
            ← My celebrations
          </Link>
          <span className="saved">
            <Check size={14} /> {readOnly ? "Shared copy" : "Saved locally"}
          </span>
        </div>
        <div className="row between plan-heading">
          <div>
            <span className="eyebrow">
              {p.input.eventType} · {p.input.location.city}
            </span>
            <h1>{p.summary.headline}</h1>
            <p>
              {p.timeline.eventDate ||
                `${p.input.planningWeeks} weeks of possibilities`}{" "}
              <span className="dot">·</span> {p.input.guestCount} guests{" "}
              <span className="dot">·</span> {p.input.vibe.join(", ")}
            </p>
          </div>
          <div className="toolbar">
            <button
              aria-label="Export JSON"
              title="Export JSON"
              onClick={() =>
                download(
                  JSON.stringify(p, null, 2),
                  "celebration.json",
                  "application/json",
                )
              }
            >
              <Download size={17} />
            </button>
            <button
              aria-label="Share plan"
              title="Copy share link"
              onClick={() => void share()}
            >
              <Share2 size={17} />
            </button>
            <button
              aria-label="Print complete plan"
              title="Print all sections / PDF"
              onClick={() => window.print()}
            >
              <Printer size={17} />
            </button>
            {!readOnly && (
              <>
                <button
                  aria-label="Duplicate plan"
                  onClick={() => {
                    const copy = duplicate(p.id);
                    if (copy) router.push(`/plan/${copy.id}`);
                  }}
                >
                  <Copy size={17} />
                </button>
                <button
                  aria-label="Delete plan"
                  onClick={() => {
                    if (confirm("Delete this celebration from this device?")) {
                      remove(p.id);
                      router.push("/");
                    }
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </>
            )}
          </div>
        </div>
        {busy ? (
          <div className="notice" role="status">
            <Sparkles className="spin" size={16} /> Your plan is ready. Adding
            personalized AI details…
          </div>
        ) : (
          p.meta.source === "fallback" &&
          !dismissFallback && (
            <div className="notice row between">
              <span>
                ✦ AI unavailable — using smart templates. Your complete plan is
                ready to edit.
              </span>
              <div className="row">
                {onRetry && !readOnly && (
                  <button className="text-link" onClick={onRetry}>
                    Retry with AI
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label="Dismiss template notice"
                  onClick={() => setDismissFallback(true)}
                >
                  ×
                </button>
              </div>
            </div>
          )
        )}
        {generationError && (
          <div className="notice" role="alert">
            {generationError}{" "}
            {onRetry && (
              <button className="text-link" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        )}
        {notice && (
          <div className="notice row between" role="status">
            <span>{notice}</span>
            <button
              className="icon-button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}
        <div className="row between">
          <nav className="plan-tabs" aria-label="Plan sections">
            {tabs.map((t) => (
              <button
                key={t}
                aria-current={tab === t ? "page" : undefined}
                className={tab === t ? "active" : ""}
                onClick={() => onTab(t)}
              >
                {t === "Chat" && <Sparkles size={15} />}{" "}
                {t === "Chat" ? "Ask the planner" : t}
              </button>
            ))}
          </nav>
          {!readOnly && (
            <div className="row history-tools">
              <button
                className="icon-button"
                disabled={!historyState.past.length}
                aria-label="Undo last plan change"
                onClick={undo}
              >
                <Undo2 size={16} />
              </button>
              <button
                className="icon-button"
                disabled={!historyState.future.length}
                aria-label="Redo last plan change"
                onClick={redo}
              >
                <Redo2 size={16} />
              </button>
            </div>
          )}
        </div>
        <SectionBoundary key={tab} name={tab}>
          {tab === "Overview" && (
            <OverviewTab {...sectionProps} onTab={onTab} />
          )}{" "}
          {tab === "Budget" && (
            <BudgetTab {...sectionProps} onNotice={setNotice} />
          )}{" "}
          {tab === "Timeline" && <TimelineTab {...sectionProps} />}{" "}
          {tab === "Vendors" && <VendorsTab {...sectionProps} />}{" "}
          {tab === "Ideas" && (
            <IdeasTab {...sectionProps} onNotice={setNotice} />
          )}{" "}
          {tab === "Chat" && <ChatTab {...sectionProps} onNotice={setNotice} />}
        </SectionBoundary>
        {!readOnly && ["Timeline", "Vendors", "Ideas"].includes(tab) && (
          <RegenerateSection
            plan={p}
            section={tab.toLowerCase() as "timeline" | "vendors" | "ideas"}
            onChange={change}
            onNotice={setNotice}
          />
        )}
        {!readOnly && <Feedback planId={p.id} section={tab.toLowerCase()} />}
        <div className="plan-footnote">
          Your plan is a starting point for something wonderful. Estimates
          aren’t quotes — always confirm with your vendors.
        </div>
      </div>
      <PrintPlan plan={p} />
    </>
  );
}
