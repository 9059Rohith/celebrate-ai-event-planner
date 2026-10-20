"use client";
import { useState } from "react";
import { ThumbsUp, ThumbsDown, Download } from "lucide-react";
import { writeLocal } from "@/lib/client/storage";
import { download } from "@/lib/client/network";
export function Feedback({
  planId,
  section,
}: {
  planId: string;
  section: string;
}) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [reason, setReason] = useState("");
  const save = (value: "up" | "down", text = reason) => {
    setRating(value);
    let items: unknown[] = [];
    try {
      const raw = JSON.parse(
        localStorage.getItem("celebrate-feedback") || "[]",
      );
      if (Array.isArray(raw)) items = raw;
    } catch {}
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
    writeLocal(
      "celebrate-feedback",
      JSON.stringify([...items, entry].slice(-1000)),
    );
    window.dispatchEvent(new Event("celebrate-feedback"));
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
                onClick={() => {
                  setReason(r);
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
                localStorage.getItem("celebrate-feedback") || "[]",
                "celebrate-feedback.json",
                "application/json",
              )
            }
          >
            <Download size={13} /> Export feedback
          </button>
          <span role="status">Thank you — saved on this device.</span>
        </>
      )}
    </section>
  );
}
