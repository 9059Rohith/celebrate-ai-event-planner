"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { Plan, VendorCategory } from "@/lib/schemas";
import { TextDialog } from "@/components/ui/TextDialog";
export function VendorsTab({
  plan: p,
  readOnly,
  onChange: change,
}: {
  plan: Plan;
  readOnly: boolean;
  onChange: (v: Partial<Plan>) => void;
}) {
  const [search, setSearch] = useState("");
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: p.input.currency,
      maximumFractionDigits: 0,
    }).format(n);
  return (
    <>
      <div className="row between">
        <div>
          <h2>Good people make great celebrations.</h2>
          <p className="muted">
            Vendor guidance, not a business directory. All price ranges are
            estimates.
          </p>
        </div>
        {!readOnly && (
          <TextDialog
            title="Add a vendor category"
            trigger={
              <button className="button secondary small">
                <Plus size={15} /> Add category
              </button>
            }
            onSubmit={(category) => {
              if (
                p.vendors.some(
                  (v) => v.category.toLowerCase() === category.toLowerCase(),
                )
              )
                return;
              const vendor: VendorCategory = {
                id: crypto.randomUUID(),
                category,
                why: "Custom category for your celebration. Confirm requirements with the provider.",
                bookLeadWeeks: 4,
                estPriceRange: { min: 0, max: 0, unit: "request quotes" },
                status: "not-started",
                checklist: [
                  {
                    id: crypto.randomUUID(),
                    text: "Request an itemized written quote and confirm delivery responsibilities.",
                    done: false,
                    critical: true,
                  },
                ],
                questionsToAsk: [
                  "What is included and excluded?",
                  "What is the cancellation policy?",
                ],
                redFlags: ["No written contract or itemized quote."],
                contractMustHaves: [
                  "Scope, dates, payment schedule, cancellation and backup arrangements.",
                ],
              };
              change({ vendors: [...p.vendors, vendor] });
            }}
          />
        )}
      </div>
      <label className="sr-only" htmlFor="vendor-search">
        Filter vendor categories
      </label>
      <input
        id="vendor-search"
        placeholder="Find a category…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="vendor-grid">
        {p.vendors
          .filter((v) =>
            v.category.toLowerCase().includes(search.toLowerCase()),
          )
          .map((v) => (
            <article className="panel vendor-card" key={v.id}>
              <div className="row between">
                <h3>{v.category.replaceAll("-", " ")}</h3>
                <span className="badge">
                  Book {v.bookLeadWeeks} weeks ahead
                </span>
              </div>
              <p>{v.why}</p>
              <p className="estimate">
                Estimate:{" "}
                {v.estPriceRange.max
                  ? `${money(v.estPriceRange.min)} – ${money(v.estPriceRange.max)} / ${v.estPriceRange.unit}`
                  : "Request an itemized quote"}
              </p>
              <label className="sr-only" htmlFor={`vendor-${v.id}`}>
                Booking status for {v.category}
              </label>
              <select
                id={`vendor-${v.id}`}
                disabled={readOnly}
                value={v.status}
                onChange={(e) =>
                  change({
                    vendors: p.vendors.map((x) =>
                      x.id === v.id
                        ? {
                            ...x,
                            status: e.target.value as VendorCategory["status"],
                          }
                        : x,
                    ),
                  })
                }
              >
                {[
                  "not-started",
                  "researching",
                  "contacted",
                  "booked",
                  "confirmed",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <p>
                {v.checklist.filter((c) => c.done).length} /{" "}
                {v.checklist.length} checks complete
              </p>
              <progress
                aria-label={`${v.category} checklist progress`}
                value={v.checklist.filter((c) => c.done).length}
                max={Math.max(1, v.checklist.length)}
              />
              {v.checklist.map((c) => (
                <label key={c.id} className="check-row">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={c.done}
                    onChange={() =>
                      change({
                        vendors: p.vendors.map((x) =>
                          x.id === v.id
                            ? {
                                ...x,
                                checklist: x.checklist.map((y) =>
                                  y.id === c.id ? { ...y, done: !y.done } : y,
                                ),
                              }
                            : x,
                        ),
                      })
                    }
                  />
                  <span>
                    {c.text}
                    {c.critical && <small>Essential</small>}
                  </span>
                </label>
              ))}
              {[
                ["Questions to ask", v.questionsToAsk],
                ["Red flags to watch for", v.redFlags],
                ["Get it in writing", v.contractMustHaves],
              ].map(([heading, items]) => (
                <details key={String(heading)}>
                  <summary>{String(heading)}</summary>
                  {(items as string[]).map((q) => (
                    <p key={q}>• {q}</p>
                  ))}
                </details>
              ))}
              {!readOnly && (
                <TextDialog
                  title={`Add ${v.category} checklist item`}
                  trigger={
                    <button className="text-link">
                      <Plus size={14} /> Add checklist item
                    </button>
                  }
                  onSubmit={(text) =>
                    change({
                      vendors: p.vendors.map((x) =>
                        x.id === v.id
                          ? {
                              ...x,
                              checklist: [
                                ...x.checklist,
                                {
                                  id: crypto.randomUUID(),
                                  text,
                                  done: false,
                                  critical: false,
                                },
                              ],
                            }
                          : x,
                      ),
                    })
                  }
                />
              )}
            </article>
          ))}
      </div>
    </>
  );
}
