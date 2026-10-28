/**
 * Timeline Engine
 *
 * Generates milestone schedules and day-of timelines from event inputs.
 * Pure functions, no framework imports.
 */
import type {
  EventInput,
  Milestone,
  ScheduleItem,
  Timeline,
} from "@/lib/schemas";
import { generateDayOfSchedule } from "./dayOfSchedule";
import { getMilestoneTemplates } from "./timelineTemplates";
import {
  addDays,
  formatDate,
  parseDate,
  planningDate,
  milestoneDueDate,
} from "./calendar";
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
let msCounter = 0;
function milestoneId(title: string): string {
  msCounter += 1;
  return `ms_${slugify(title)}_${msCounter}`;
}
let siCounter = 0;
function scheduleItemId(): string {
  siCounter += 1;
  return `si_${siCounter}`;
}
function validDate(value: string): boolean {
  const parsed = parseDate(value);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(parsed.getTime()) &&
    formatDate(parsed) === value
  );
}
export function generateTimeline(input: EventInput): Timeline {
  const todayStr = planningDate();
  const today = parseDate(todayStr);
  const templates = getMilestoneTemplates(input.eventType);
  let eventDate: Date | null = null;
  if (input.date) {
    if (!validDate(input.date)) throw new Error("Invalid event date");
    eventDate = parseDate(input.date);
  } else if (input.planningWeeks) {
    eventDate = addDays(today, input.planningWeeks * 7);
  }
  let filteredTemplates = [...templates];
  if (input.eventSpecific.type === "wedding") {
    const fns = input.eventSpecific.functions;
    if (!fns.includes("mehendi")) {
      filteredTemplates = filteredTemplates.filter(
        (t) => !t.title.toLowerCase().includes("mehendi"),
      );
    }
    if (!fns.includes("sangeet")) {
      filteredTemplates = filteredTemplates.filter(
        (t) => !t.title.toLowerCase().includes("sangeet"),
      );
    }
  }
  const availableWeeks = eventDate
    ? Math.max(
        0,
        (eventDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000),
      )
    : (input.planningWeeks ?? 16);
  const maxLead = Math.max(...filteredTemplates.map((t) => t.leadWeeks));
  const compressionRatio =
    availableWeeks < maxLead ? availableWeeks / maxLead : 1;
  const milestones: Milestone[] = filteredTemplates.map((template) => {
    const compressedWeeks = template.leadWeeks * compressionRatio;
    const offsetDays = -Math.round(compressedWeeks * 7);
    let dueDate: string | null = null;
    if (eventDate) {
      dueDate = milestoneDueDate(formatDate(eventDate), offsetDays, todayStr);
    }
    const id = milestoneId(template.title);
    return {
      id,
      title: template.title,
      dueOffsetDays: offsetDays,
      dueDate,
      category: template.category,
      priority:
        compressionRatio < 0.5 && template.priority === "nice"
          ? ("should" as const)
          : template.priority,
      status: "todo" as const,
      dependsOn: [],
      notes:
        input.date && input.date < todayStr
          ? "Past event date — action needed ASAP; confirm a new event date."
          : "",
    };
  });
  const ordered = [...milestones].sort(
    (a, b) => a.dueOffsetDays - b.dueOffsetDays,
  );
  ordered.forEach((m, i) => {
    if (i > 0) m.dependsOn = [ordered[i - 1].id];
  });
  milestones.sort((a, b) => a.dueOffsetDays - b.dueOffsetDays);
  if (compressionRatio < 0.8) {
    const criticalMs = milestones.filter(
      (m) => m.priority === "must" && m.dueDate === todayStr,
    );
    for (const m of criticalMs) {
      m.notes = "⚠️ Tight timeline — action needed ASAP!";
    }
  }
  const dayOf = generateDayOfSchedule(input).map((item) => ({
    ...item,
    day: 1,
  }));
  if (input.eventSpecific.type === "wedding") {
    const functions = input.eventSpecific.functions;
    const days = input.eventSpecific.days;
    if (days > 1) {
      dayOf.length = 0;
      for (let day = 1; day <= days; day++) {
        const scheduled = functions.filter(
          (_, i) =>
            Math.min(
              days,
              Math.floor((i * days) / Math.max(functions.length, 1)) + 1,
            ) === day,
        );
        const names = scheduled.length
          ? scheduled
          : ["Preparation and family time"];
        dayOf.push({
          id: scheduleItemId(),
          day,
          startTime: "08:00",
          durationMin: 60,
          title: "Vendor setup and accessibility check",
          notes: "Confirm safe access, food handling and the weather backup.",
        });
        names.forEach((name, i) =>
          dayOf.push({
            id: scheduleItemId(),
            day,
            startTime: `${String(10 + i * 3).padStart(2, "0")}:00`,
            durationMin: 120,
            title: name,
            notes:
              "Confirm timings and chosen traditions, including any muhurat, with your family and officiant.",
          }),
        );
        dayOf.push({
          id: scheduleItemId(),
          day,
          startTime: "21:00",
          durationMin: 60,
          title: "Cleanup and next-day handover",
          notes: "",
        });
      }
    }
  }
  return {
    eventDate: eventDate ? formatDate(eventDate) : null,
    milestones,
    dayOf,
  };
}
export function validateTimeline(timeline: Timeline): string[] {
  const errors: string[] = [];
  if (timeline.eventDate && !validDate(timeline.eventDate))
    errors.push("Invalid event date");
  for (const m of timeline.milestones)
    if (m.dueDate && !validDate(m.dueDate))
      errors.push(`Invalid due date: ${m.title}`);
  for (const item of timeline.dayOf) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.startTime))
      errors.push(`Invalid start time: ${item.title}`);
    if (!Number.isInteger(item.durationMin) || item.durationMin <= 0)
      errors.push(`Invalid duration: ${item.title}`);
    if (item.date && !validDate(item.date))
      errors.push(`Invalid schedule date: ${item.title}`);
    if (
      item.day !== undefined &&
      (!Number.isInteger(item.day) || item.day < 1 || item.day > 5)
    )
      errors.push(`Invalid schedule day: ${item.title}`);
  }
  const todayStr = planningDate();
  const pastDue = timeline.milestones.filter(
    (m) => m.dueDate && m.dueDate < todayStr && m.status !== "done",
  );
  if (pastDue.length > 0) {
    errors.push(`${pastDue.length} milestone(s) are past due`);
  }
  const ids = new Set<string>();
  for (const m of timeline.milestones) {
    if (ids.has(m.id)) {
      errors.push(`Duplicate milestone ID: ${m.id}`);
    }
    ids.add(m.id);
  }
  const idSet = new Set(timeline.milestones.map((m) => m.id));
  for (const m of timeline.milestones) {
    for (const dep of m.dependsOn) {
      if (!idSet.has(dep)) {
        errors.push(`Milestone "${m.title}" depends on unknown ID: ${dep}`);
      }
    }
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const m = timeline.milestones.find((x) => x.id === id);
    for (const dep of m?.dependsOn ?? []) if (visit(dep)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  if (timeline.milestones.some((m) => visit(m.id)))
    errors.push("Dependency cycle detected");
  for (const m of timeline.milestones)
    for (const id of m.dependsOn) {
      const dep = timeline.milestones.find((x) => x.id === id);
      if (dep?.dueDate && m.dueDate && dep.dueDate > m.dueDate)
        errors.push(`${m.title}: dependency is due after this milestone`);
    }
  return errors;
}
/** Longest dependency chain; returns an empty chain for a cyclic graph. */
export function getCriticalPath(milestones: Milestone[]): Milestone[] {
  const ids = new Set(milestones.map((m) => m.id));
  if (
    ids.size !== milestones.length ||
    milestones.some((m) => m.dependsOn.some((id) => !ids.has(id)))
  )
    return [];
  const memo = new Map<string, Milestone[]>(),
    active = new Set<string>();
  let cyclic = false;
  const path = (m: Milestone): Milestone[] => {
    if (active.has(m.id)) {
      cyclic = true;
      return [];
    }
    const cached = memo.get(m.id);
    if (cached) return cached;
    active.add(m.id);
    const chains = m.dependsOn
      .map((id) => milestones.find((x) => x.id === id))
      .filter((x): x is Milestone => !!x)
      .map(path);
    const best = chains.sort((a, b) => b.length - a.length)[0] ?? [];
    active.delete(m.id);
    const result = [...best, m];
    memo.set(m.id, result);
    return result;
  };
  const result =
    milestones.map(path).sort((a, b) => b.length - a.length)[0] ?? [];
  return cyclic ? [] : result;
}
export interface MilestonePhase {
  label: string;
  milestones: Milestone[];
}
export function groupByPhase(milestones: Milestone[]): MilestonePhase[] {
  const phases: MilestonePhase[] = [
    { label: "12+ weeks out", milestones: [] },
    { label: "8–12 weeks out", milestones: [] },
    { label: "4–8 weeks out", milestones: [] },
    { label: "1–4 weeks out", milestones: [] },
    { label: "Final week", milestones: [] },
    { label: "Day of", milestones: [] },
    { label: "After event", milestones: [] },
  ];
  for (const m of milestones) {
    const weeksOut = Math.abs(m.dueOffsetDays) / 7;
    if (m.dueOffsetDays > 0) phases[6].milestones.push(m);
    else if (weeksOut > 12) phases[0].milestones.push(m);
    else if (weeksOut > 8) phases[1].milestones.push(m);
    else if (weeksOut > 4) phases[2].milestones.push(m);
    else if (weeksOut > 1) phases[3].milestones.push(m);
    else if (weeksOut > 0.1) phases[4].milestones.push(m);
    else phases[5].milestones.push(m);
  }
  return phases.filter((p) => p.milestones.length > 0);
}
/**
 * Generate RFC 5545 compliant ICS calendar data from milestones.
 * Lines folded at 75 octets, commas/semicolons/newlines escaped.
 */
export function generateICS(
  milestones: Milestone[],
  eventTitle: string,
  dayOf: ScheduleItem[] = [],
  eventDate: string | null = null,
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CelebrateAI//Event Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(eventTitle)} - Planning Milestones`,
  ];
  for (const m of milestones) {
    if (!m.dueDate) continue;
    const dateStr = m.dueDate.replace(/-/g, "");
    const uid = `${escapeICS(m.id)}@celebrate-ai`;
    const now =
      new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(
      `DTEND;VALUE=DATE:${formatDate(addDays(parseDate(m.dueDate), 1)).replace(/-/g, "")}`,
    );
    lines.push(`SUMMARY:${escapeICS(m.title)}`);
    if (m.notes) {
      lines.push(`DESCRIPTION:${escapeICS(m.notes)}`);
    }
    lines.push(`CATEGORIES:${escapeICS(m.category)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-P1D");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:Reminder: ${escapeICS(m.title)}`);
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  }
  for (const item of dayOf) {
    const date =
      item.date ||
      (eventDate
        ? formatDate(addDays(parseDate(eventDate), (item.day ?? 1) - 1))
        : null);
    if (!date) continue;
    const start = parseDate(date);
    const [h, m] = item.startTime.split(":").map(Number);
    start.setUTCHours(h, m);
    const end = new Date(start.getTime() + item.durationMin * 60000);
    const stamp = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").slice(0, 15);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeICS(item.id)}@celebrate-ai`,
      `DTSTAMP:${stamp(new Date())}Z`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeICS(item.title)}`,
      `DESCRIPTION:${escapeICS([item.owner, item.notes].filter(Boolean).join(" — "))}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let output = "",
    bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      output += "\r\n ";
      bytes = 1;
    }
    output += char;
    bytes += size;
  }
  return output;
}
