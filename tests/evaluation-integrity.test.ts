import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { goldenCases } from "../evals/dataset";
import { evaluate } from "../evals/metrics";
import { runEvaluation, summarize, type Options } from "../evals/harness";
import { pairwise } from "../evals/judge";
import { parseEvaluationRun, parseResume } from "../evals/persistence";
import { createPlan, exampleInput } from "../lib/domain/planner";
import { PlanSchema, type EventInput } from "../lib/schemas";

const options: Options = {
  mock: true,
  suite: "deterministic",
  limit: 2,
  model: "gpt-4o-mini",
  concurrency: 1,
  maxUsd: 0,
  promptVersion: "v2",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("dietary evaluation semantics", () => {
  it.each<[EventInput["dietary"][number], string]>([
    ["halal", "Serve pork ribs"],
    ["halal", "Serve wine with dinner"],
    ["vegan", "Serve scrambled eggs"],
    ["vegan", "Serve ｅｇｇｓ"],
    ["halal", "Serve ｗｉｎｅ"],
    ["vegan", "Serve honey on fruit"],
    ["vegan", "Serve egg-free omelettes made with eggs."],
    ["jain", "Serve carrot and beetroot salad"],
    ["jain", "Serve an egg omelette"],
    ["no-alcohol", "Serve champagne"],
    ["nut-allergy", "Serve pistachio dessert"],
    ["gluten-free", "Serve semolina pasta"],
  ])("rejects %s menu violation: %s", (diet, suggestion) => {
    const test = goldenCases()[0];
    test.input.dietary = [diet];
    const plan = createPlan(test.input);
    plan.ideas = [
      {
        ...plan.ideas[0],
        kind: "menu",
        title: suggestion,
        description: "Dinner selection",
        whyItFits: "Guest menu",
        tags: [],
      },
    ];
    expect(evaluate(test, plan).dietaryCompliance.passed).toBe(false);
  });

  it.each<[EventInput["dietary"][number], string]>([
    ["halal", "Serve certified halal chicken. Avoid pork and wine."],
    ["vegan", "Serve coconut milk and vegan cheese. Avoid dairy."],
    ["vegan", "Serve eggplant and egg-free noodles."],
    ["vegan", "Serve egg-free omelettes."],
    ["jain", "Serve egg free omelette."],
    ["jain", "Serve rice without onion or garlic."],
    ["no-alcohol", "Serve non-alcoholic beer and alcohol-free cocktails."],
    ["gluten-free", "Serve gluten-free bread and rice pasta."],
    ["nut-allergy", "Serve fruit. No peanuts or cashews."],
  ])("accepts explicit %s alternatives and exclusions", (diet, suggestion) => {
    const test = goldenCases()[0];
    test.input.dietary = [diet];
    const plan = createPlan(test.input);
    plan.ideas = [
      {
        ...plan.ideas[0],
        kind: "menu",
        title: "Menu",
        description: suggestion,
        whyItFits: "Guest menu",
        tags: [],
      },
    ];
    expect(evaluate(test, plan).dietaryCompliance.passed).toBe(true);
  });

  it("does not let an exclusion conceal a later prohibited recommendation", () => {
    const test = goldenCases().find((item) => item.id === "wedding-halal")!;
    const plan = createPlan(test.input);
    plan.ideas = [
      {
        ...plan.ideas[0],
        kind: "menu",
        title: "Dinner",
        description: "Avoid pork, but serve wine.",
        whyItFits: "Dinner",
        tags: [],
      },
    ];
    expect(evaluate(test, plan).dietaryCompliance.passed).toBe(false);
  });
});

describe("timeline evaluation dates", () => {
  it.each(["not-a-date", "2027-02-30"])(
    "rejects invalid milestone date %s",
    (date) => {
      const test = goldenCases()[0];
      const plan = createPlan(test.input);
      plan.timeline.milestones[0].dueDate = date;
      expect(PlanSchema.safeParse(plan).success).toBe(false);
      expect(evaluate(test, plan).timelineValid.passed).toBe(false);
    },
  );

  it("rejects invalid event and day-of dates at the plan boundary", () => {
    const plan = createPlan(exampleInput());
    plan.timeline.eventDate = "2027-02-30";
    expect(PlanSchema.safeParse(plan).success).toBe(false);
    plan.timeline.eventDate = "2028-02-29";
    plan.timeline.dayOf[0].date = "2027-02-30";
    expect(PlanSchema.safeParse(plan).success).toBe(false);
    plan.timeline.dayOf[0].date = "2028-02-29";
    expect(PlanSchema.safeParse(plan).success).toBe(true);
  });

  it("rejects preparation scheduled after a future event", () => {
    const test = goldenCases()[0];
    const plan = createPlan(test.input);
    plan.timeline.eventDate = "2027-03-01";
    plan.timeline.milestones[0].dueDate = "2027-03-02";
    expect(
      evaluate(test, plan, new Date("2026-10-28T00:00:00Z")).timelineValid
        .passed,
    ).toBe(false);
  });
});

describe("resume and judging evidence integrity", () => {
  it("rejects checkpoints from a different code revision instead of relabeling their results", async () => {
    vi.stubEnv("EVAL_GIT_SHA", "revision-before");
    const run = await runEvaluation(options);
    vi.stubEnv("EVAL_GIT_SHA", "revision-after");
    expect(() => parseResume(JSON.parse(JSON.stringify(run)), options)).toThrow(
      /resume/i,
    );
  });

  it("resumes valid serialized evidence after changing only the cost cap and concurrency", async () => {
    const run = await runEvaluation(options);
    const resumedOptions = { ...options, maxUsd: 1, concurrency: 3 };
    const parsed = parseResume(JSON.parse(JSON.stringify(run)), resumedOptions);
    const resumed = await runEvaluation(resumedOptions, parsed.results);
    expect(resumed.completed).toBe(true);
    expect(resumed.totalCases).toBe(2);
    expect(resumed.results).toEqual(parsed.results);
  });

  it("keeps historical full runs readable for comparison without accepting them as checkpoints", () => {
    const historical = JSON.parse(
      readFileSync("evals/results/latest.json", "utf8"),
    );
    expect(parseEvaluationRun(historical).totalCases).toBe(46);
    expect(() =>
      parseResume(historical, { ...options, suite: "all", limit: 46 }),
    ).toThrow(/resume/i);
  });

  it("rejects a changed input under a completed case ID", async () => {
    const run = await runEvaluation(options);
    const altered = {
      ...run.results[0],
      input: { ...run.results[0].input, totalBudget: 42 },
    };
    await expect(runEvaluation(options, [altered])).rejects.toThrow(/resume/i);
  });

  it.each(["suite", "dataset", "result"])(
    "rejects incompatible %s evidence through the CLI resume boundary",
    async (corruption) => {
      const run = await runEvaluation(options);
      const directory = mkdtempSync(join(tmpdir(), "celebrate-eval-resume-"));
      const out = join(directory, "run.json");
      const persisted = JSON.parse(JSON.stringify(run));
      if (corruption === "dataset")
        persisted.configuration = {
          ...persisted.configuration,
          datasetHash: "0".repeat(64),
        };
      if (corruption === "result") persisted.results[0].tokensIn = -1;
      writeFileSync(out, JSON.stringify(persisted));
      try {
        const child = spawnSync(
          process.execPath,
          [
            resolve("node_modules/tsx/dist/cli.mjs"),
            "evals/runner.ts",
            "--mock",
            "--resume",
            `--suite=${corruption === "suite" ? "all" : "deterministic"}`,
            "--limit=2",
            "--max-usd=0",
            `--out=${out}`,
          ],
          { cwd: process.cwd(), encoding: "utf8" },
        );
        expect(child.status).toBe(1);
        expect(child.stderr).toMatch(/resume/i);
        expect(JSON.parse(readFileSync(out, "utf8"))).toEqual(persisted);
      } finally {
        unlinkSync(out);
        rmdirSync(directory);
      }
    },
  );

  it("rejects duplicate saved IDs instead of counting a case twice", async () => {
    const run = await runEvaluation(options);
    await expect(
      runEvaluation(options, [run.results[0], run.results[0]]),
    ).rejects.toThrow(/duplicate/i);
  });

  it("requires judge evidence for every output before passing a judge suite", async () => {
    const run = await runEvaluation(options);
    const scores = {
      personalization: 5,
      actionability: 5,
      budgetRealism: 5,
      culturalSensitivity: 5,
      completeness: 5,
      creativity: 5,
      safety: 5,
    };
    const judgment = {
      first: { scores, rationale: "Synthetic test judgment" },
      second: { scores, rationale: "Synthetic test judgment" },
      agreement: 1,
      tokensIn: 0,
      tokensOut: 0,
      estimatedCostUsd: 0,
    };
    const liveOptions = { ...options, mock: false, suite: "judge" } as const;
    const partial = summarize(
      [{ ...run.results[0], judge: judgment }, run.results[1]],
      liveOptions,
      Date.now(),
      true,
    );
    expect(partial.thresholds.judge).toBe(false);
    const complete = summarize(
      run.results.map((result) => ({ ...result, judge: judgment })),
      liveOptions,
      Date.now(),
      true,
    );
    expect(complete.thresholds.judge).toBe(true);
  });
});

describe("blinded pairwise decisions", () => {
  const mockJudge = (winners: string[], requests: unknown[] = []) => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic-evaluation-test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        requests.push(JSON.parse(String(init?.body)));
        const winner = winners.shift();
        if (!winner) throw new Error("Unexpected provider request in test");
        return new Response(
          JSON.stringify({
            id: "test-completion",
            object: "chat.completion",
            created: 1,
            model: "gpt-4o",
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    winner,
                    rationale: "Synthetic test decision",
                  }),
                },
              },
            ],
            usage: {
              prompt_tokens: 20,
              completion_tokens: 10,
              total_tokens: 30,
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      }),
    );
  };

  it("reports no overall winner when position-swapped decisions disagree", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75);
    mockJudge(["A", "A"]);
    const test = goldenCases()[0];
    const plan = createPlan(test.input);
    const result = await pairwise(test, plan, plan, "gpt-4o");
    expect(result.consistent).toBe(false);
    expect(result.winner).toBeNull();
    expect(result.first.decision.winner).toBe("A");
    expect(result.second.decision.winner).toBe("A");
  });

  it.each([0.25, 0.75])(
    "canonicalizes consistent winners for randomized order %s",
    async (random) => {
      vi.spyOn(Math, "random").mockReturnValue(random);
      mockJudge(random < 0.5 ? ["B", "A"] : ["A", "B"]);
      const test = goldenCases()[0];
      const plan = createPlan(test.input);
      const result = await pairwise(test, plan, plan, "gpt-4o");
      expect(result.consistent).toBe(true);
      expect(result.winner).toBe("v1");
    },
  );

  it("includes budget evidence while omitting provider identity", async () => {
    const requests: unknown[] = [];
    mockJudge(["tie", "tie"], requests);
    const test = goldenCases()[0];
    const plan = createPlan(test.input);
    await pairwise(test, plan, plan, "gpt-4o");
    const request = requests[0] as {
      messages: { role: string; content: string }[];
    };
    const content = JSON.parse(
      request.messages.find((message) => message.role === "user")!.content,
    );
    expect(content.A.budget).toEqual(plan.budget);
    expect(content.A).not.toHaveProperty("meta");
  });
});
