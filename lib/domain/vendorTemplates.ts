/**
 * Vendor Checklist Templates
 *
 * Curated guidance per category — no fabricated vendor names or prices.
 * All price ranges are estimates and labelled accordingly.
 */

import type { EventInput, VendorCategory, ChecklistItem } from "@/lib/schemas";

interface VendorTemplate {
  category: string;
  why: string;
  bookLeadWeeks: number;
  estPriceRange: { min: number; max: number; unit: string };
  checklist: Array<{ text: string; critical: boolean }>;
  questionsToAsk: string[];
  redFlags: string[];
  contractMustHaves: string[];
}

// ─── Wedding vendor templates ─────────────────────────────────────

const WEDDING_VENDORS: VendorTemplate[] = [
  {
    category: "venue",
    why: "The venue sets the tone for your entire wedding. It affects decor, logistics, guest comfort, and photo aesthetics.",
    bookLeadWeeks: 48,
    estPriceRange: { min: 100000, max: 2500000, unit: "per event" },
    checklist: [
      {
        text: "Visit venue at the same time of day as your event",
        critical: true,
      },
      { text: "Confirm capacity for guest count + vendors", critical: true },
      { text: "Check parking availability and accessibility", critical: false },
      { text: "Ask about noise restrictions and curfew", critical: true },
      {
        text: "Confirm backup plan for outdoor spaces (rain/heat)",
        critical: true,
      },
      {
        text: "Review included amenities (tables, chairs, AV, AC)",
        critical: false,
      },
      { text: "Check generator/power backup availability", critical: true },
      { text: "Verify washroom facilities and cleanliness", critical: false },
      {
        text: "Ask about vendor restrictions (outside caterer, DJ allowed?)",
        critical: true,
      },
      { text: "Confirm decoration and setup time windows", critical: false },
      { text: "Check guest accommodation options nearby", critical: false },
      { text: "Review insurance requirements", critical: false },
    ],
    questionsToAsk: [
      "What is included in the venue rental fee?",
      "Are there any date-specific surcharges (weekends, holidays)?",
      "What is the cancellation policy and refund timeline?",
      "Can we extend the event time if needed, and at what cost?",
      "Do you have an in-house coordinator or a preferred vendor list?",
      "How many other events will be hosted on the same day?",
      "What are the power/electricity arrangements?",
      "Is the venue accessible for elderly guests and those with disabilities?",
    ],
    redFlags: [
      "No written contract or vague terms",
      "Demands more than 50% non-refundable deposit upfront",
      "Refuses to allow an in-person visit before booking",
      "No clear cancellation or force majeure policy",
      "Won't share insurance or safety certifications",
    ],
    contractMustHaves: [
      "Exact date, time, and duration of booking",
      "Complete list of included items and services",
      "Cancellation/rescheduling terms with refund percentages",
      "Force majeure clause",
      "Payment schedule with clear milestones",
      "Overtime rates and conditions",
      "Liability and damage deposit terms",
    ],
  },
  {
    category: "catering",
    why: "Food is often the most talked-about aspect of any wedding. Great catering leaves lasting memories.",
    bookLeadWeeks: 24,
    estPriceRange: { min: 800, max: 3500, unit: "per guest (estimated)" },
    checklist: [
      { text: "Schedule a tasting session with your caterer", critical: true },
      { text: "Finalize menu with dietary accommodations", critical: true },
      {
        text: "Confirm service style (buffet, sit-down, family, live counters)",
        critical: true,
      },
      { text: "Discuss allergen management and labelling", critical: true },
      {
        text: "Plan separate cooking for Jain/vegan/halal if required",
        critical: true,
      },
      { text: "Confirm water and beverage arrangements", critical: false },
      { text: "Review staff count and attire", critical: false },
      {
        text: "Plan for kids' menu if many children attending",
        critical: false,
      },
      { text: "Discuss leftovers donation policy", critical: false },
      { text: "Confirm setup and cleanup timelines", critical: false },
    ],
    questionsToAsk: [
      "Can you accommodate vegetarian, Jain, vegan, halal, and allergy-specific diets simultaneously?",
      "How do you handle cross-contamination in kitchen?",
      "What is your backup plan if a key ingredient is unavailable?",
      "How many staff per guest do you typically provide?",
      "Can we see photos/references from recent similar events?",
      "What happens if the final guest count changes significantly?",
      "Do you provide crockery, cutlery, and serving equipment?",
      "Is a tasting included in the quote?",
    ],
    redFlags: [
      "Refuses to arrange a tasting session",
      "Cannot explain allergen management process",
      "No health/food safety certifications",
      "Significantly lower price than competitors without clear reasoning",
      "Won't provide references from recent events",
    ],
    contractMustHaves: [
      "Complete menu with per-plate or per-guest pricing",
      "Service style, staff count, and equipment list",
      "Allergen and dietary accommodation commitments",
      "Minimum and maximum guest count flexibility",
      "Cancellation and refund terms",
      "Tasting session details",
    ],
  },
  {
    category: "photography",
    why: "Photos and videos are your lasting memories. Quality matters — you can't redo this day.",
    bookLeadWeeks: 36,
    estPriceRange: { min: 50000, max: 500000, unit: "per event (estimated)" },
    checklist: [
      {
        text: "Review photographer's portfolio for similar events",
        critical: true,
      },
      {
        text: "Discuss shooting style (candid, traditional, cinematic)",
        critical: true,
      },
      {
        text: "Confirm deliverables (number of edited photos, video length, album)",
        critical: true,
      },
      { text: "Share must-have shot list", critical: false },
      { text: "Discuss timeline and key moments coverage", critical: true },
      { text: "Confirm backup equipment policy", critical: true },
      {
        text: "Ask about second shooter/assistant availability",
        critical: false,
      },
      { text: "Discuss raw file ownership and delivery", critical: false },
      {
        text: "Confirm delivery timeline for edited photos/video",
        critical: false,
      },
    ],
    questionsToAsk: [
      "How many events have you covered in a similar style/culture?",
      "What equipment do you carry, and what's your backup plan?",
      "How many edited images and video minutes can we expect?",
      "Will you or a designated team member shoot our event personally?",
      "What is your turnaround time for delivery?",
      "Do we get raw/unedited files?",
      "How do you handle low-light situations?",
      "Can you coordinate with our videographer?",
    ],
    redFlags: [
      "Won't show a full event gallery (only highlights)",
      "No backup equipment or second shooter policy",
      "Unclear about who will actually shoot your event",
      "Demands full payment upfront before the event",
      "No timeline for delivering final photos/videos",
    ],
    contractMustHaves: [
      "Named photographer(s) and backup plan",
      "Complete deliverables list with quantities",
      "Delivery timeline",
      "Raw file policy",
      "Usage rights and licensing terms",
      "Cancellation terms",
    ],
  },
  {
    category: "decor",
    why: "Decor transforms a venue into your vision. It ties together the theme, colors, and atmosphere.",
    bookLeadWeeks: 16,
    estPriceRange: { min: 50000, max: 1000000, unit: "total (estimated)" },
    checklist: [
      { text: "Create a mood board with inspiration images", critical: true },
      {
        text: "Discuss color palette and theme with decorator",
        critical: true,
      },
      {
        text: "Walk through the venue together to plan layout",
        critical: true,
      },
      {
        text: "Confirm floral arrangements and alternatives if seasonal",
        critical: false,
      },
      { text: "Plan mandap/stage decoration", critical: true },
      {
        text: "Discuss lighting design (fairy lights, uplighting, LED)",
        critical: false,
      },
      { text: "Plan entrance and photo booth areas", critical: false },
      { text: "Confirm setup and teardown schedule", critical: true },
    ],
    questionsToAsk: [
      "Can you share examples from similar venue/theme combinations?",
      "What are sustainable/eco-friendly decor options?",
      "How do you handle last-minute changes?",
      "What is included versus add-ons in the quoted package?",
      "Do you handle both ceremony and reception decor?",
      "What happens if fresh flowers aren't available for our date?",
      "How early do you need venue access for setup?",
      "Do you provide table settings and centerpieces?",
    ],
    redFlags: [
      "Only shows stock photos, not actual work",
      "No venue visit included before the event",
      "Vague about what's included in the package",
      "No teardown or cleanup commitment",
      "Inflexible about customization",
    ],
    contractMustHaves: [
      "Detailed item list with quantities and specifications",
      "Setup and teardown schedule",
      "Substitution policy for unavailable items",
      "Payment schedule",
      "Cancellation terms",
    ],
  },
  {
    category: "music",
    why: "Music sets the energy. Great music turns a good event into an unforgettable one.",
    bookLeadWeeks: 18,
    estPriceRange: { min: 25000, max: 300000, unit: "per event (estimated)" },
    checklist: [
      { text: "Discuss music preferences and must-play list", critical: true },
      { text: "Confirm equipment (own PA system or venue's)", critical: true },
      {
        text: "Plan different moods for different event phases",
        critical: false,
      },
      { text: "Discuss volume levels and noise restrictions", critical: true },
      {
        text: "Plan for sangeet/mehendi night special performances",
        critical: false,
      },
      { text: "Confirm backup equipment", critical: false },
      { text: "Discuss emcee/host services if needed", critical: false },
    ],
    questionsToAsk: [
      "Can we provide a do-not-play list?",
      "What is your setup time requirement?",
      "Do you provide lighting/effects as part of the package?",
      "How do you read the crowd and adjust the playlist?",
      "Are overtime charges applicable?",
      "Can you handle live instrument + DJ hybrid sets?",
      "What power requirements do you have?",
      "Can we hear a demo or attend one of your events?",
    ],
    redFlags: [
      "No demo or references available",
      "Won't accommodate your playlist preferences",
      "No backup plan for equipment failure",
      "Unclear overtime or additional charges",
      "Shows up without proper equipment",
    ],
    contractMustHaves: [
      "Performance duration and overtime rates",
      "Equipment list and setup requirements",
      "Named performer/DJ confirmation",
      "Power and space requirements",
      "Cancellation terms",
    ],
  },
  {
    category: "attire",
    why: "Wedding attire is a centerpiece — it should reflect your personality and be comfortable for a long day.",
    bookLeadWeeks: 20,
    estPriceRange: { min: 30000, max: 500000, unit: "per person (estimated)" },
    checklist: [
      {
        text: "Begin shopping early for custom/designer pieces",
        critical: true,
      },
      { text: "Schedule fittings at least 3 times", critical: true },
      {
        text: "Plan outfits for all functions (if multi-day)",
        critical: false,
      },
      { text: "Coordinate colors with partner and families", critical: false },
      { text: "Arrange comfortable footwear for long events", critical: false },
      { text: "Plan accessories and jewelry", critical: false },
      { text: "Arrange hair & makeup trial", critical: true },
      {
        text: "Emergency kit (safety pins, stain remover, touch-up kit)",
        critical: false,
      },
    ],
    questionsToAsk: [
      "How long does custom tailoring/design take?",
      "What is the alteration policy?",
      "Can you source specific fabrics or embellishments?",
      "What is included in the fitting process?",
      "Do you handle preservation/cleaning post-event?",
      "What is the cancellation/refund policy for custom orders?",
    ],
    redFlags: [
      "No clear timeline for custom orders",
      "Refuses alterations after purchase",
      "Significantly different quality from samples shown",
      "No refund for major delivery delays",
    ],
    contractMustHaves: [
      "Detailed design specifications and fabric details",
      "Fitting schedule and deadlines",
      "Delivery date commitment",
      "Alteration inclusions",
      "Return/exchange policy",
    ],
  },
];

// ─── Birthday vendor templates ────────────────────────────────────

const BIRTHDAY_VENDORS: VendorTemplate[] = [
  {
    category: "venue",
    why: "The right venue creates the perfect atmosphere for celebration and accommodates all activities.",
    bookLeadWeeks: 8,
    estPriceRange: { min: 10000, max: 200000, unit: "per event (estimated)" },
    checklist: [
      { text: "Confirm venue capacity and layout", critical: true },
      { text: "Check parking and drop-off area", critical: false },
      { text: "Verify kid-safety features if kids' party", critical: true },
      { text: "Confirm noise/music permissions", critical: true },
      { text: "Check AC/ventilation for indoor venues", critical: false },
      {
        text: "Confirm decoration permission and restrictions",
        critical: false,
      },
      { text: "Review included amenities", critical: false },
      { text: "Ask about cleanup responsibility", critical: false },
    ],
    questionsToAsk: [
      "Is there a dedicated party space or shared area?",
      "What time can we start setup?",
      "Are there any restrictions on decor (balloons, confetti)?",
      "Do you have high chairs or kid-friendly furniture?",
      "Is there an outdoor area for games?",
      "What is the cancellation policy?",
    ],
    redFlags: [
      "No clear cancellation terms",
      "Hidden charges for basic amenities",
      "No flexibility on timing",
      "Safety hazards visible during visit",
    ],
    contractMustHaves: [
      "Date, time, and duration",
      "Included amenities list",
      "Setup and cleanup timeline",
      "Cancellation/reschedule terms",
      "Damage deposit and return conditions",
    ],
  },
  {
    category: "catering",
    why: "Food (and the cake!) is the highlight of any birthday celebration.",
    bookLeadWeeks: 2,
    estPriceRange: { min: 300, max: 2000, unit: "per guest (estimated)" },
    checklist: [
      { text: "Order cake with sufficient lead time", critical: true },
      { text: "Plan menu considering all dietary needs", critical: true },
      { text: "Arrange kid-friendly food options", critical: false },
      {
        text: "Plan beverages (consider no-alcohol if kids present)",
        critical: false,
      },
      { text: "Confirm serving style and crockery", critical: false },
      { text: "Arrange cake topper and candles", critical: false },
      { text: "Plan for food allergies and labelling", critical: true },
    ],
    questionsToAsk: [
      "Can you create a custom cake design?",
      "What flavors are available for tasting?",
      "How do you handle food allergies?",
      "Can you provide both kid and adult menu options?",
      "What is the minimum order quantity?",
      "When is the last date for changes?",
    ],
    redFlags: [
      "No allergy management process",
      "Can't provide references",
      "Inflexible on menu modifications",
    ],
    contractMustHaves: [
      "Menu details with dietary accommodations",
      "Delivery/setup time",
      "Payment terms",
      "Cancellation policy",
    ],
  },
  {
    category: "entertainment",
    why: "Great entertainment keeps guests engaged and creates memorable moments.",
    bookLeadWeeks: 3,
    estPriceRange: { min: 5000, max: 100000, unit: "per event (estimated)" },
    checklist: [
      {
        text: "Book entertainer/host appropriate for age group",
        critical: true,
      },
      { text: "Plan games and activities with prizes", critical: false },
      { text: "Arrange props, costumes, or special items", critical: false },
      { text: "Confirm space requirements for activities", critical: true },
      { text: "Plan timeline for performances/activities", critical: false },
      {
        text: "Have backup indoor activities if outdoor planned",
        critical: false,
      },
    ],
    questionsToAsk: [
      "Can you customize the performance for the theme?",
      "What space and equipment do you need?",
      "How do you engage shy or differently-aged kids?",
      "Do you provide your own PA system?",
      "What is your cancellation policy?",
    ],
    redFlags: [
      "No demo or video of past performances",
      "Won't customize for your event",
      "No clear safety protocols for kid interactions",
    ],
    contractMustHaves: [
      "Performance duration",
      "Equipment and space requirements",
      "Performer identity confirmation",
      "Cancellation terms",
    ],
  },
];

// ─── Community event vendor templates ─────────────────────────────

const COMMUNITY_VENDORS: VendorTemplate[] = [
  {
    category: "venue",
    why: "The venue must accommodate your crowd safely and provide the infrastructure for all planned activities.",
    bookLeadWeeks: 10,
    estPriceRange: { min: 20000, max: 500000, unit: "per event (estimated)" },
    checklist: [
      {
        text: "Confirm maximum capacity and fire safety compliance",
        critical: true,
      },
      {
        text: "Check accessibility (ramps, accessible restrooms)",
        critical: true,
      },
      { text: "Verify parking and public transport access", critical: false },
      { text: "Confirm power supply and backup generator", critical: true },
      { text: "Review weather contingency for outdoor venues", critical: true },
      {
        text: "Check noise permissions and timing restrictions",
        critical: true,
      },
      { text: "Verify waste disposal arrangements", critical: false },
      {
        text: "Confirm separate areas for different activities",
        critical: false,
      },
    ],
    questionsToAsk: [
      "What are the fire safety and emergency evacuation procedures?",
      "Is the venue covered under public liability insurance?",
      "What permits are required for events at this venue?",
      "Are there restrictions on food vendors or cooking?",
      "What waste management facilities are provided?",
      "Can we get early access for setup?",
    ],
    redFlags: [
      "No fire safety certificate",
      "No insurance coverage",
      "Unclear about permits required",
      "Inadequate emergency exits for capacity",
    ],
    contractMustHaves: [
      "Capacity and safety certifications",
      "Date, duration, setup/teardown windows",
      "Included services and infrastructure",
      "Insurance and liability terms",
      "Force majeure and cancellation terms",
    ],
  },
  {
    category: "safety",
    why: "Safety planning protects your attendees and your organization from liability.",
    bookLeadWeeks: 8,
    estPriceRange: { min: 15000, max: 150000, unit: "total (estimated)" },
    checklist: [
      {
        text: "Arrange first aid station and trained personnel",
        critical: true,
      },
      { text: "Create emergency evacuation plan", critical: true },
      {
        text: "Identify nearest hospital and emergency services",
        critical: true,
      },
      { text: "Arrange crowd management volunteers/staff", critical: true },
      { text: "Set up fire extinguishers at key points", critical: true },
      { text: "Plan weather emergency protocol", critical: true },
      { text: "Ensure adequate lighting for evening events", critical: false },
      {
        text: "Arrange lost-and-found and child identification system",
        critical: false,
      },
      { text: "Brief all volunteers on emergency procedures", critical: true },
      {
        text: "Arrange security personnel if large crowd expected",
        critical: false,
      },
    ],
    questionsToAsk: [
      "What certifications do your first aid providers hold?",
      "How many security/crowd management staff per 100 attendees?",
      "What is the emergency communication protocol?",
      "Do you provide safety barrier/barricade equipment?",
      "What is your experience with events of similar scale?",
      "Can you help with permit-required safety documentation?",
    ],
    redFlags: [
      "No certified first aid personnel",
      "Cannot provide a written safety plan",
      "Insufficient staff for your event size",
      "No liability insurance",
    ],
    contractMustHaves: [
      "Staff count and qualifications",
      "Equipment list (first aid kit, fire extinguishers, barriers)",
      "Emergency protocol document",
      "Insurance coverage details",
      "Cancellation terms",
    ],
  },
  {
    category: "av-sound",
    why: "Quality audio-visual setup ensures your message reaches everyone and performances sound great.",
    bookLeadWeeks: 4,
    estPriceRange: { min: 20000, max: 300000, unit: "total (estimated)" },
    checklist: [
      { text: "Conduct sound check at venue before event", critical: true },
      { text: "Confirm PA system capacity for venue size", critical: true },
      {
        text: "Test all microphones (handheld, lapel, wireless)",
        critical: true,
      },
      {
        text: "Setup projection/screens if presentations needed",
        critical: false,
      },
      {
        text: "Arrange lighting for stage and audience areas",
        critical: false,
      },
      { text: "Confirm backup equipment on-site", critical: true },
      { text: "Plan cable management for safety", critical: false },
      {
        text: "Test recording setup if event is being recorded",
        critical: false,
      },
    ],
    questionsToAsk: [
      "What wattage is your PA system rated for?",
      "How many microphone channels can you support?",
      "Do you bring backup equipment?",
      "What is the setup time required?",
      "How do you handle feedback/echo in different venues?",
      "Will a dedicated technician be present throughout?",
    ],
    redFlags: [
      "No sound check before the event",
      "No backup equipment",
      "No dedicated technician during event",
      "Equipment quality doesn't match venue size",
    ],
    contractMustHaves: [
      "Equipment list with specifications",
      "Setup/teardown timeline",
      "On-site technician commitment",
      "Backup equipment guarantee",
      "Power requirements",
    ],
  },
];

// ─── Template lookup ──────────────────────────────────────────────

function getVendorTemplates(eventType: string): VendorTemplate[] {
  switch (eventType) {
    case "wedding":
      return WEDDING_VENDORS;
    case "birthday":
      return BIRTHDAY_VENDORS;
    case "community":
      return COMMUNITY_VENDORS;
    default:
      return BIRTHDAY_VENDORS;
  }
}

// ─── Generate vendor categories ───────────────────────────────────

let vcCounter = 0;
function vendorId(category: string): string {
  vcCounter += 1;
  return `vc_${category}_${vcCounter}`;
}

let ciCounter = 0;
function checklistId(): string {
  ciCounter += 1;
  return `ci_${ciCounter}`;
}

export function generateVendorCategories(input: EventInput): VendorCategory[] {
  const templates = getVendorTemplates(input.eventType);

  // Currency multiplier for price ranges (base is INR)
  const currencyDivisors: Record<string, number> = {
    INR: 1,
    USD: 83,
    EUR: 90,
    GBP: 105,
  };
  const divisor = currencyDivisors[input.currency] ?? 1;

  return templates.map((template) => {
    // Adjust price range for currency
    const adjustedMin = Math.round(template.estPriceRange.min / divisor);
    const adjustedMax = Math.round(template.estPriceRange.max / divisor);

    // Build checklist items
    const checklist: ChecklistItem[] = template.checklist.map((item) => ({
      id: checklistId(),
      text: item.text,
      done: false,
      critical: item.critical,
    }));

    // Add dietary-specific checklist items for catering
    if (
      (template.category === "catering" || template.category === "food") &&
      input.dietary.length > 0
    ) {
      if (input.dietary.includes("jain")) {
        checklist.push({
          id: checklistId(),
          text: "Confirm separate cooking for Jain meals (no root vegetables, no onion/garlic)",
          done: false,
          critical: true,
        });
      }
      if (input.dietary.includes("vegan")) {
        checklist.push({
          id: checklistId(),
          text: "Verify all vegan items are free of dairy, eggs, and honey",
          done: false,
          critical: true,
        });
      }
      if (input.dietary.includes("halal")) {
        checklist.push({
          id: checklistId(),
          text: "Confirm halal certification for all meat items",
          done: false,
          critical: true,
        });
      }
      if (input.dietary.includes("gluten-free")) {
        checklist.push({
          id: checklistId(),
          text: "Ensure gluten-free items are prepared separately to avoid cross-contamination",
          done: false,
          critical: true,
        });
      }
      if (input.dietary.includes("nut-allergy")) {
        checklist.push({
          id: checklistId(),
          text: "Implement strict nut-free protocols with clear labelling",
          done: false,
          critical: true,
        });
      }
    }

    return {
      id: vendorId(template.category),
      category: template.category,
      why:
        template.why +
        " Ranges are rough India-market planning estimates, shown in your selected currency using illustrative conversion; they are not local or live quotes. Obtain local written estimates.",
      bookLeadWeeks: template.bookLeadWeeks,
      estPriceRange: {
        min: adjustedMin,
        max: adjustedMax,
        unit: template.estPriceRange.unit,
      },
      checklist: [
        ...checklist,
        ...[
          "Confirm step-free access and accessible facilities",
          "Agree the exact scope and itemized tax-inclusive estimate",
          "Confirm cancellation, postponement and refund terms",
          "Name a day-of contact and emergency backup",
          "Check insurance, permits and safety responsibilities",
          "Confirm setup, teardown and payment deadlines",
        ].map((text) => ({
          id: checklistId(),
          text,
          done: false,
          critical: true,
        })),
      ].slice(0, 15),
      questionsToAsk: [
        ...new Set([
          ...template.questionsToAsk,
          "What is included and excluded in the written quote?",
          "What taxes, travel and overtime costs apply?",
          "Who provides emergency backup?",
          "How do you provide accessible service?",
          "What are the cancellation and postponement terms?",
          "Which permits and insurance do you hold?",
          "Who is our named day-of contact?",
          "How are changes and final approval documented?",
        ]),
      ],
      redFlags: [
        ...new Set([
          ...template.redFlags,
          "No written contract or itemized quote",
          "Pressure to pay the entire amount upfront",
          "Unclear cancellation and refund policy",
          "No backup plan or named contact",
          "Refusal to document safety and accessibility responsibilities",
        ]),
      ],
      contractMustHaves: [...template.contractMustHaves],
      status: "not-started" as const,
    };
  });
}
