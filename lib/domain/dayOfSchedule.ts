import type { EventInput, ScheduleItem } from "@/lib/schemas";
let counter = 0;
const scheduleItemId = () => `schedule_${++counter}`;
export function generateDayOfSchedule(input: EventInput): ScheduleItem[] {
  switch (input.eventType) {
    case "wedding":
      return generateWeddingDayOf(input);
    case "birthday":
      return generateBirthdayDayOf(input);
    case "community":
      return generateCommunityDayOf();
    default:
      return generateBirthdayDayOf(input);
  }
}

function generateWeddingDayOf(input: EventInput): ScheduleItem[] {
  const items: ScheduleItem[] = [];

  const addItem = (
    startTime: string,
    duration: number,
    title: string,
    notes = "",
  ) => {
    items.push({
      id: scheduleItemId(),
      startTime,
      durationMin: duration,
      title,
      notes,
    });
  };

  if (input.eventSpecific.type === "wedding") {
    const fns = input.eventSpecific.functions;

    // Main ceremony day schedule
    addItem(
      "06:00",
      60,
      "Vendor arrival & setup",
      "Caterers, decorators, AV team arrive",
    );
    addItem(
      "07:00",
      120,
      "Bride/Groom hair & makeup",
      "Start early for elaborate looks",
    );

    if (fns.includes("haldi")) {
      addItem(
        "09:00",
        60,
        "Haldi ceremony",
        "Turmeric ritual — arrange outdoor/covered area",
      );
    }

    addItem(
      "10:00",
      60,
      "Final venue check & decor walkthrough",
      "Confirm all elements in place",
    );
    addItem("11:00", 30, "Guest arrival & welcome drinks", "");

    if (fns.includes("ceremony")) {
      addItem(
        "11:30",
        90,
        "Wedding ceremony",
        "Rituals, vows, phere — as per traditions",
      );
    }

    addItem(
      "13:00",
      90,
      "Lunch / meal service",
      "Staggered service if large guest count",
    );
    addItem("14:30", 60, "Post-lunch activities / photo session", "");
    addItem("15:30", 30, "Cake cutting & toasts", "");
    addItem("16:00", 120, "Entertainment & dancing", "");

    if (fns.includes("reception")) {
      addItem("18:00", 60, "Reception entrance & welcome", "");
      addItem("19:00", 90, "Reception dinner", "");
      addItem("20:30", 60, "Speeches & toasts", "");
      addItem("21:30", 90, "DJ / music & dancing", "");
    }

    addItem("23:00", 30, "Send-off / vidaai", "");
    addItem(
      "23:30",
      60,
      "Venue teardown & cleanup",
      "Coordinate with vendor for timeline",
    );
  }

  return items;
}

function generateBirthdayDayOf(input: EventInput): ScheduleItem[] {
  const items: ScheduleItem[] = [];

  const isKidsParty =
    input.eventSpecific.type === "birthday" &&
    input.eventSpecific.honoreeAge < 13;

  const addItem = (
    startTime: string,
    duration: number,
    title: string,
    notes = "",
  ) => {
    items.push({
      id: scheduleItemId(),
      startTime,
      durationMin: duration,
      title,
      notes,
    });
  };

  if (isKidsParty) {
    addItem("09:00", 60, "Venue setup & decoration", "");
    addItem("10:00", 30, "Guest arrival & welcome", "");
    addItem("10:30", 45, "Games & activities", "");
    addItem("11:15", 30, "Cake cutting & birthday song", "");
    addItem("11:45", 45, "Lunch / snack time", "");
    addItem("12:30", 30, "More games / entertainment show", "");
    addItem("13:00", 15, "Return gifts & goodbyes", "");
    addItem("13:15", 30, "Cleanup", "");
  } else {
    addItem("16:00", 60, "Venue setup & decoration", "");
    addItem("17:00", 30, "Guest arrival", "");
    addItem("17:30", 30, "Welcome drinks & mingling", "");
    addItem("18:00", 30, "Cake cutting & toasts", "");
    addItem("18:30", 60, "Dinner / buffet", "");
    addItem("19:30", 90, "Entertainment / DJ / activities", "");
    addItem("21:00", 30, "Thank you speech & favors", "");
    addItem("21:30", 30, "Cleanup & vendor depart", "");
  }

  return items;
}

function generateCommunityDayOf(): ScheduleItem[] {
  const items: ScheduleItem[] = [];

  const addItem = (
    startTime: string,
    duration: number,
    title: string,
    owner = "",
    notes = "",
  ) => {
    items.push({
      id: scheduleItemId(),
      startTime,
      durationMin: duration,
      title,
      owner,
      notes,
    });
  };

  addItem("06:00", 120, "Setup: staging, stalls, signage", "Setup Team", "");
  addItem(
    "07:30",
    30,
    "Safety briefing for volunteers",
    "Safety Lead",
    "Cover emergency exits, first aid locations",
  );
  addItem("08:00", 30, "Sound check & AV test", "AV Team", "");
  addItem("08:30", 30, "Final walkthrough", "Event Lead", "");
  addItem("09:00", 30, "Gates open / guest registration", "Volunteer Team", "");
  addItem("09:30", 30, "Inauguration / opening remarks", "Host", "");
  addItem("10:00", 120, "Main program block 1", "", "");
  addItem("12:00", 60, "Lunch break / food service", "Catering", "");
  addItem("13:00", 120, "Main program block 2", "", "");
  addItem("15:00", 30, "Tea/refreshment break", "Catering", "");
  addItem("15:30", 90, "Closing program / performances", "", "");
  addItem("17:00", 30, "Vote of thanks & closing", "Host", "");
  addItem("17:30", 90, "Teardown & cleanup", "Setup Team", "");
  addItem("19:00", 30, "Final venue handover", "Event Lead", "");

  return items;
}
