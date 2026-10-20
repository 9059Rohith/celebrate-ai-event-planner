interface MilestoneTemplate {
  title: string;
  leadWeeks: number;
  category: string;
  priority: "must" | "should" | "nice";
  dependsOn?: string[];
}

const WEDDING_MILESTONES: MilestoneTemplate[] = [
  { title: "Book venue", leadWeeks: 48, category: "venue", priority: "must" },
  {
    title: "Hire wedding planner",
    leadWeeks: 44,
    category: "misc",
    priority: "should",
  },
  {
    title: "Book photographer & videographer",
    leadWeeks: 36,
    category: "photography",
    priority: "must",
  },
  {
    title: "Book caterer / tasting session",
    leadWeeks: 24,
    category: "catering",
    priority: "must",
    dependsOn: ["book-venue"],
  },
  {
    title: "Select & order wedding attire",
    leadWeeks: 20,
    category: "attire",
    priority: "must",
  },
  {
    title: "Book music / DJ / band",
    leadWeeks: 18,
    category: "music",
    priority: "should",
  },
  {
    title: "Finalize decor & florist",
    leadWeeks: 16,
    category: "decor",
    priority: "must",
  },
  {
    title: "Book priest / officiant",
    leadWeeks: 14,
    category: "rituals",
    priority: "must",
  },
  {
    title: "Arrange guest accommodation",
    leadWeeks: 12,
    category: "accommodation",
    priority: "should",
  },
  {
    title: "Book transport & logistics",
    leadWeeks: 10,
    category: "transport",
    priority: "should",
  },
  {
    title: "Send out invitations",
    leadWeeks: 8,
    category: "invitations",
    priority: "must",
  },
  {
    title: "Dress fittings & alterations",
    leadWeeks: 6,
    category: "attire",
    priority: "must",
  },
  {
    title: "RSVP deadline",
    leadWeeks: 3,
    category: "invitations",
    priority: "must",
  },
  {
    title: "Final vendor confirmations",
    leadWeeks: 1,
    category: "misc",
    priority: "must",
  },
  {
    title: "Final headcount to caterer",
    leadWeeks: 1,
    category: "catering",
    priority: "must",
  },
  {
    title: "Rehearsal / walkthrough",
    leadWeeks: 0.14,
    category: "misc",
    priority: "should",
  }, // ~1 day
  {
    title: "Order return gifts / favors",
    leadWeeks: 4,
    category: "gifts",
    priority: "nice",
  },
  {
    title: "Mehendi artist booking",
    leadWeeks: 12,
    category: "rituals",
    priority: "should",
  },
  {
    title: "Sangeet choreography / planning",
    leadWeeks: 6,
    category: "entertainment",
    priority: "nice",
  },
];

const BIRTHDAY_MILESTONES: MilestoneTemplate[] = [
  { title: "Book venue", leadWeeks: 8, category: "venue", priority: "must" },
  {
    title: "Set theme & plan decor",
    leadWeeks: 6,
    category: "decor",
    priority: "should",
  },
  {
    title: "Send invitations",
    leadWeeks: 4,
    category: "invitations",
    priority: "must",
  },
  {
    title: "Plan activities & entertainment",
    leadWeeks: 4,
    category: "entertainment",
    priority: "should",
  },
  {
    title: "Book entertainer / host",
    leadWeeks: 3,
    category: "entertainment",
    priority: "should",
  },
  {
    title: "Order cake & plan menu",
    leadWeeks: 2,
    category: "catering",
    priority: "must",
  },
  {
    title: "Confirm guest list & RSVPs",
    leadWeeks: 1.5,
    category: "invitations",
    priority: "must",
  },
  {
    title: "Buy return gifts",
    leadWeeks: 1.5,
    category: "gifts",
    priority: "nice",
  },
  {
    title: "Prep decorations",
    leadWeeks: 1,
    category: "decor",
    priority: "should",
  },
  {
    title: "Final confirmations",
    leadWeeks: 0.14,
    category: "misc",
    priority: "must",
  },
  {
    title: "Book photographer",
    leadWeeks: 3,
    category: "photography",
    priority: "nice",
  },
];

const COMMUNITY_MILESTONES: MilestoneTemplate[] = [
  {
    title: "Apply for permits & municipal NOC",
    leadWeeks: 12,
    category: "permits",
    priority: "must",
  },
  {
    title: "Book venue / secure location",
    leadWeeks: 10,
    category: "venue",
    priority: "must",
  },
  {
    title: "Arrange insurance & liability",
    leadWeeks: 8,
    category: "safety",
    priority: "must",
  },
  {
    title: "Begin volunteer recruitment",
    leadWeeks: 6,
    category: "staffing",
    priority: "should",
  },
  {
    title: "Launch promotion & marketing",
    leadWeeks: 5,
    category: "marketing",
    priority: "should",
  },
  {
    title: "Book AV, sound & lighting",
    leadWeeks: 4,
    category: "av-sound",
    priority: "should",
  },
  {
    title: "Finalize food vendors / catering",
    leadWeeks: 4,
    category: "food",
    priority: "must",
  },
  {
    title: "Confirm performers / speakers",
    leadWeeks: 3,
    category: "programming",
    priority: "should",
  },
  {
    title: "Safety & first-aid plan",
    leadWeeks: 2,
    category: "safety",
    priority: "must",
  },
  {
    title: "Volunteer briefing & assignment",
    leadWeeks: 1,
    category: "staffing",
    priority: "must",
  },
  {
    title: "Setup & run-through",
    leadWeeks: 0.14,
    category: "misc",
    priority: "must",
  },
  {
    title: "Print signage & materials",
    leadWeeks: 2,
    category: "marketing",
    priority: "should",
  },
  {
    title: "Finalize waste management plan",
    leadWeeks: 1.5,
    category: "supplies",
    priority: "should",
  },
];

export function getMilestoneTemplates(eventType: string): MilestoneTemplate[] {
  switch (eventType) {
    case "wedding":
      return WEDDING_MILESTONES;
    case "birthday":
      return BIRTHDAY_MILESTONES;
    case "community":
      return COMMUNITY_MILESTONES;
    default:
      return BIRTHDAY_MILESTONES;
  }
}
