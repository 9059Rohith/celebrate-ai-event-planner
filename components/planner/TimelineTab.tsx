"use client";
import { useState } from "react";
import type { Plan, Milestone, ScheduleItem } from "@/lib/schemas";
import {
  generateICS,
  groupByPhase,
  validateTimeline,
  getCriticalPath,
} from "@/lib/domain/timelineEngine";

/** Editable accessible timeline with same-phase pointer and keyboard ordering. */
export function TimelineTab({
  plan,
  readOnly,
  onChange,
}: {
  plan: Plan;
  readOnly: boolean;
  onChange: (updates: Partial<Plan>) => void;
}) {
  const [dragged, setDragged] = useState<string | null>(null);
  const timeline = plan.timeline;
  const update = (patch: Partial<Plan["timeline"]>) => {
    if (!readOnly) onChange({ timeline: { ...timeline, ...patch } });
  };
  const edit = (id: string, patch: Partial<Milestone>) =>
    update({
      milestones: timeline.milestones.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    });
  const schedule = (id: string, patch: Partial<ScheduleItem>) =>
    update({
      dayOf: timeline.dayOf.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  const phases = groupByPhase(timeline.milestones);
  function move(id: string, target: string) {
    const phase = phases.find((p) => p.milestones.some((m) => m.id === id));
    if (!phase?.milestones.some((m) => m.id === target)) return;
    const rows = [...timeline.milestones];
    const from = rows.findIndex((m) => m.id === id),
      to = rows.findIndex((m) => m.id === target);
    rows.splice(to, 0, rows.splice(from, 1)[0]);
    update({ milestones: rows });
  }
  function exportCalendar() {
    const url = URL.createObjectURL(
      new Blob(
        [
          generateICS(
            timeline.milestones,
            plan.summary.headline,
            timeline.dayOf,
            timeline.eventDate,
          ),
        ],
        { type: "text/calendar;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "celebration.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const now = new Date(),
    today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const warnings = validateTimeline(timeline),
    critical = new Set(getCriticalPath(timeline.milestones).map((m) => m.id));
  const maxOffset = Math.max(
    1,
    ...timeline.milestones.map((m) => Math.abs(m.dueOffsetDays)),
  );
  return (
    <>
      <div className="row between">
        <div>
          <h2>From today to the big day.</h2>
          <p>
            Drag within a phase, use arrow buttons, or press Alt + ↑ / ↓ on a
            milestone.
          </p>
        </div>
        <button className="button secondary small" onClick={exportCalendar}>
          Export calendar
        </button>
      </div>
      {warnings.length > 0 && (
        <div className="notice" role="status">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
      <details className="panel">
        <summary>GanttLite · dependency critical path</summary>
        <p>
          Each bar shows time remaining before the event; ● marks the longest
          dependency chain.
        </p>
        {timeline.milestones.map((m) => (
          <div key={m.id} style={{ margin: "8px 0" }}>
            <small>
              {critical.has(m.id) ? "● " : ""}
              {m.title}
            </small>
            <div
              style={{
                height: 8,
                borderRadius: 8,
                background: "var(--accent, #b45d42)",
                width: `${Math.max(2, (Math.abs(m.dueOffsetDays) / maxOffset) * 100)}%`,
              }}
            />
          </div>
        ))}
      </details>
      <div className="two-column">
        <section>
          {phases.map((phase) => (
            <div className="panel" key={phase.label}>
              <h3>{phase.label}</h3>
              {phase.milestones.map((m, i) => (
                <div
                  key={m.id}
                  className="task-row"
                  draggable={!readOnly}
                  onDragStart={() => setDragged(m.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragged) move(dragged, m.id);
                    setDragged(null);
                  }}
                  tabIndex={readOnly ? -1 : 0}
                  onKeyDown={(e) => {
                    if (
                      e.altKey &&
                      (e.key === "ArrowUp" || e.key === "ArrowDown")
                    ) {
                      e.preventDefault();
                      const target =
                        phase.milestones[i + (e.key === "ArrowUp" ? -1 : 1)];
                      if (target) move(m.id, target.id);
                    }
                  }}
                >
                  <div className="task-main">
                    <strong>{m.title}</strong>
                    {m.status !== "done" && m.dueDate && m.dueDate < today && (
                      <span className="badge">Overdue</span>
                    )}
                    <small>{m.notes}</small>
                    <label>
                      Status{" "}
                      <select
                        disabled={readOnly}
                        aria-label={`Status for ${m.title}`}
                        value={m.status}
                        onChange={(e) =>
                          edit(m.id, {
                            status: e.target.value as Milestone["status"],
                          })
                        }
                      >
                        {["todo", "doing", "done"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Due date{" "}
                      <input
                        type="date"
                        disabled={readOnly}
                        value={m.dueDate || ""}
                        onChange={(e) => {
                          const dueDate = e.target.value || null;
                          const offset =
                            dueDate && timeline.eventDate
                              ? Math.round(
                                  (Date.parse(dueDate) -
                                    Date.parse(timeline.eventDate)) /
                                    86400000,
                                )
                              : m.dueOffsetDays;
                          edit(m.id, { dueDate, dueOffsetDays: offset });
                        }}
                      />
                    </label>
                    <div className="row">
                      <button
                        className="button secondary small"
                        disabled={readOnly || i === 0}
                        aria-label={`Move ${m.title} up`}
                        onClick={() => move(m.id, phase.milestones[i - 1].id)}
                      >
                        ↑
                      </button>
                      <button
                        className="button secondary small"
                        disabled={readOnly || i === phase.milestones.length - 1}
                        aria-label={`Move ${m.title} down`}
                        onClick={() => move(m.id, phase.milestones[i + 1].id)}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
        <aside className="panel">
          <h3>Multi-day run of show</h3>
          <p>
            Calendar times use the venue’s local clock; confirm its time zone
            with guests.
          </p>
          {timeline.dayOf.map((item) => (
            <fieldset
              key={item.id}
              style={{
                marginBottom: 20,
                border: "1px solid #9995",
                padding: 12,
              }}
              disabled={readOnly}
            >
              <legend>{item.title}</legend>
              <label>
                Day{" "}
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={item.day ?? 1}
                  onChange={(e) =>
                    schedule(item.id, {
                      day: Math.max(1, Math.min(5, Number(e.target.value))),
                    })
                  }
                />
              </label>
              <label>
                Date override{" "}
                <input
                  type="date"
                  value={item.date ?? ""}
                  onChange={(e) =>
                    schedule(item.id, { date: e.target.value || undefined })
                  }
                />
              </label>
              <label>
                Start{" "}
                <input
                  type="time"
                  value={item.startTime}
                  onChange={(e) =>
                    schedule(item.id, { startTime: e.target.value })
                  }
                />
              </label>
              <label>
                Minutes{" "}
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={item.durationMin}
                  onChange={(e) =>
                    schedule(item.id, {
                      durationMin: Math.max(
                        1,
                        Math.min(1440, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </label>
              <label>
                Title{" "}
                <input
                  value={item.title}
                  maxLength={160}
                  onChange={(e) => schedule(item.id, { title: e.target.value })}
                />
              </label>
              <label>
                Owner{" "}
                <input
                  value={item.owner ?? ""}
                  maxLength={80}
                  onChange={(e) => schedule(item.id, { owner: e.target.value })}
                />
              </label>
              <label>
                Notes{" "}
                <textarea
                  value={item.notes}
                  maxLength={500}
                  onChange={(e) => schedule(item.id, { notes: e.target.value })}
                />
              </label>
              <button
                className="button secondary small"
                onClick={() =>
                  update({
                    dayOf: timeline.dayOf.filter((x) => x.id !== item.id),
                  })
                }
              >
                Remove schedule item
              </button>
            </fieldset>
          ))}
          {!readOnly && (
            <button
              className="button small"
              onClick={() =>
                update({
                  dayOf: [
                    ...timeline.dayOf,
                    {
                      id: crypto.randomUUID(),
                      day: 1,
                      startTime: "09:00",
                      durationMin: 30,
                      title: "New activity",
                      notes: "",
                    },
                  ],
                })
              }
            >
              Add activity
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
