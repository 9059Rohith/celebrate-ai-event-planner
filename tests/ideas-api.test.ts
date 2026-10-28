import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { compactPlanSnapshot } from "@/lib/llm/snapshot";
import { IdeaSchema } from "@/lib/schemas";
import { POST } from "@/app/api/ideas/route";

const provider = vi.hoisted(() => ({
  enabled: false,
  structured: vi.fn(),
  moderate: vi.fn(),
}));
vi.mock("@/lib/llm/client", () => ({
  getClient: () => (provider.enabled ? {} : undefined),
  callStructured: provider.structured,
  moderate: provider.moderate,
}));

beforeEach(() => {
  provider.enabled = false;
  provider.structured.mockReset();
  provider.moderate.mockResolvedValue(true);
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
});
afterEach(() => vi.unstubAllEnvs());

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/ideas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": crypto.randomUUID(),
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

it.each([
  [{ origin: "https://other.example" }, 403],
  [{ "sec-fetch-site": "cross-site" }, 403],
  [{ "content-length": "32769" }, 413],
] as const)(
  "rejects unsafe request boundaries before generating ideas: %j",
  async (headers, status) => {
    const plan = compactPlanSnapshot(createPlan(exampleInput()));
    const response = await POST(request({ plan, action: "surprise" }, headers));
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  },
);

it("rejects oversized chunked UTF-8 and unknown actions", async () => {
  const large = await POST(request({ text: "ह".repeat(12000) }));
  expect(large.status).toBe(413);
  const plan = compactPlanSnapshot(createPlan(exampleInput()));
  const invalid = await POST(request({ plan, action: "change-everything" }));
  expect(invalid.status).toBe(400);
});

it("returns independent, schema-valid followups without repeating existing ideas", async () => {
  const plan = createPlan(exampleInput());
  const original = structuredClone(plan);
  const response = await POST(
    request({ plan: compactPlanSnapshot(plan), action: "surprise" }),
  );
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.source).toBe("fallback");
  expect(data.ideas.length).toBeGreaterThan(0);
  const titles = data.ideas.map((idea: { title: string }) =>
    idea.title.toLowerCase(),
  );
  expect(new Set(titles).size).toBe(titles.length);
  for (const idea of data.ideas) {
    expect(IdeaSchema.safeParse(idea).success).toBe(true);
    expect(
      plan.ideas.some(
        (existing) => existing.title.toLowerCase() === idea.title.toLowerCase(),
      ),
    ).toBe(false);
  }
  expect(plan).toEqual(original);
});

it("keeps cheaper followups within an edited target estimate even when no seed fits", async () => {
  const plan = createPlan(exampleInput());
  plan.ideas[0].estCost = { min: 0, max: 1 };
  const response = await POST(
    request({
      plan: compactPlanSnapshot(plan),
      action: "cheaper",
      ideaId: plan.ideas[0].id,
    }),
  );
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.ideas.length).toBeGreaterThan(0);
  for (const idea of data.ideas) {
    expect(idea.estCost.max).toBeLessThanOrEqual(1);
    expect(idea.estCost.min).toBeGreaterThanOrEqual(0);
    expect(IdeaSchema.safeParse(idea).success).toBe(true);
  }
});

it("retains safe template ideas when moderation or the provider rejects a request", async () => {
  provider.enabled = true;
  provider.moderate.mockResolvedValue(false);
  const plan = compactPlanSnapshot(createPlan(exampleInput()));
  const rejected = await POST(request({ plan, action: "surprise" }));
  const rejectedData = await rejected.json();
  expect(rejected.status).toBe(200);
  expect(rejectedData.source).toBe("fallback");
  expect(rejectedData.ideas.length).toBeGreaterThan(0);
  provider.moderate.mockResolvedValue(true);
  provider.structured.mockRejectedValue(new Error("Provider unavailable"));
  const unavailable = await POST(request({ plan, action: "surprise" }));
  const unavailableData = await unavailable.json();
  expect(unavailableData.source).toBe("fallback");
  expect(
    unavailableData.ideas.map((idea: { title: string }) => idea.title),
  ).toEqual(rejectedData.ideas.map((idea: { title: string }) => idea.title));
});

it.each([
  "Fresh egg omelette station",
  "Egg-free cake topped with eggs",
  "ｅｇｇ omelette station",
])(
  "rejects vegan-incompatible provider suggestion %s before returning it to the client",
  async (title) => {
    provider.enabled = true;
    provider.structured.mockResolvedValue({
      data: {
        ideas: [
          {
            title,
            description: "Offer a breakfast station for guests.",
            whyItFits: "A breakfast celebration option.",
          },
        ],
      },
    });
    const plan = createPlan({ ...exampleInput(), dietary: ["vegan"] });
    const response = await POST(
      request({ plan: compactPlanSnapshot(plan), action: "surprise" }),
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ideas.length).toBeGreaterThan(0);
    expect(data.source).toBe("fallback");
    expect(
      data.ideas.some(
        (idea: { title: string }) => idea.title === title.normalize("NFKC"),
      ),
    ).toBe(false);
  },
);

it.each([
  "Roasted eggplant station",
  "Egg-free celebration cake",
  "Egg free dessert table",
])("allows the vegan-compatible provider suggestion %s", async (title) => {
  provider.enabled = true;
  provider.structured.mockResolvedValue({
    data: {
      ideas: [
        {
          title,
          description: "Offer a clearly labelled plant-based option.",
          whyItFits: "Respects the selected dietary preference.",
        },
      ],
    },
  });
  const plan = createPlan({ ...exampleInput(), dietary: ["vegan"] });
  const response = await POST(
    request({ plan: compactPlanSnapshot(plan), action: "surprise" }),
  );
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.ideas[0].title).toBe(title);
  expect(data.source).toBe("ai");
});

it("does not label deduplicated provider content as a returned AI suggestion", async () => {
  provider.enabled = true;
  const plan = createPlan(exampleInput());
  const title = plan.ideas[0].title;
  provider.structured.mockResolvedValue({
    data: {
      ideas: [
        {
          title,
          description: "A practical option for guests.",
          whyItFits: "Matches the event preferences.",
        },
      ],
    },
  });
  const response = await POST(
    request({ plan: compactPlanSnapshot(plan), action: "surprise" }),
  );
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.ideas.length).toBeGreaterThan(0);
  expect(
    data.ideas.some((idea: { title: string }) => idea.title === title),
  ).toBe(false);
  expect(data.source).toBe("fallback");
});
