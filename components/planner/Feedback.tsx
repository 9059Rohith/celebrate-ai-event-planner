"use client";
import { useState, useSyncExternalStore } from "react";
import { ThumbsUp, ThumbsDown, Download } from "lucide-react";
import { safeStorage, writeLocal } from "@/lib/client/storage";
import { download } from "@/lib/client/network";
type FeedbackProps = { planId: string; section: string };
const subscribe = (notify: () => void) => {
  window.addEventListener("celebrate-feedback", notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener("celebrate-feedback", notify);
    window.removeEventListener("storage", notify);
  };
};
const getSnapshot = () =>
  String(safeStorage.getItem("celebrate-feedback") || "[]");
const getServerSnapshot = () => "[]";
function readFeedback(raw = getSnapshot()): unknown[] {
  try {
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}
function savedFeedback(raw: string, planId: string, section: string) {
  return readFeedback(raw).findLast(
    (
      entry,
    ): entry is {
      planId: string;
      section: string;
      rating: "up" | "down";
      reason: string;
    } =>
      !!entry &&
      typeof entry === "object" &&
      "planId" in entry &&
      entry.planId === planId &&
      "section" in entry &&
      entry.section === section &&
      "rating" in entry &&
      (entry.rating === "up" || entry.rating === "down") &&
      "reason" in entry &&
      typeof entry.reason === "string",
  );
}
export function Feedback(props: FeedbackProps) {
  return (
    <SectionFeedback
      key={JSON.stringify([props.planId, props.section])}
      {...props}
    />
  );
}
function SectionFeedback({ planId, section }: FeedbackProps) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const initial = savedFeedback(raw, planId, section);
  const [draft, setDraft] = useState<{
    rating: "up" | "down";
    reason: string;
    saved: boolean;
  } | null>(null);
  const rating = draft?.rating || initial?.rating || null;
  const reason = draft?.reason ?? initial?.reason ?? "";
  const saved = draft?.saved ?? !!initial;
  const save = (value: "up" | "down", text = reason) => {
    let items = readFeedback();
    items = items.filter(
      (x) =>
        !(
          x &&
          typeof x === "object" &&
          "planId" in x &&
          x.planId === planId &&
          "section" in x &&
          x.section === section
        ),
    );
    const entry = {
      id: crypto.randomUUID(),
      planId,
      section,
      rating: value,
      reason: text,
      createdAt: new Date().toISOString(),
    };
    const persisted = writeLocal(
      "celebrate-feedback",
      JSON.stringify([...items, entry].slice(-1000)),
    );
    setDraft({ rating: value, reason: text, saved: persisted });
    if (persisted) window.dispatchEvent(new Event("celebrate-feedback"));
  };
  return (
    <section className="feedback no-print" aria-label={`${section} feedback`}>
      <span>Was this section helpful?</span>
      <button
        className={`icon-button ${rating === "up" ? "selected" : ""}`}
        aria-label="Helpful"
        aria-pressed={rating === "up"}
        onClick={() => save("up")}
      >
        <ThumbsUp size={15} />
      </button>
      <button
        className={`icon-button ${rating === "down" ? "selected" : ""}`}
        aria-label="Needs improvement"
        aria-pressed={rating === "down"}
        onClick={() => save("down")}
      >
        <ThumbsDown size={15} />
      </button>
      {rating && (
        <>
          <div className="chips">
            {[
              "Useful detail",
              "Budget fit",
              "Personalization",
              "Missing something",
              "Safety concern",
            ].map((r) => (
              <button
                key={r}
                className={reason === r ? "selected" : ""}
                aria-pressed={reason === r}
                onClick={() => {
                  save(rating, r);
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            className="text-link"
            onClick={() =>
              download(
                JSON.stringify(readFeedback()),
                "celebrate-feedback.json",
                "application/json",
              )
            }
          >
            <Download size={13} /> Export feedback
          </button>
          <span role="status">
            {saved
              ? "Thank you — saved on this device."
              : "Feedback could not be saved on this device. Please try again when storage is available."}
          </span>
        </>
      )}
    </section>
  );
}
