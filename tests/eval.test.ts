import { describe, expect, it } from "vitest";
import { goldenCases } from "../evals/dataset";
import { evaluate, fuzzyIncludes } from "../evals/metrics";
import { runEvaluation, type Options } from "../evals/harness";
import { createPlan } from "../lib/domain/planner";
import { EvalCaseSchema } from "../lib/schemas";
const options: Options = {
  mock: true,
  suite: "deterministic",
  limit: 2,
  model: "gpt-4o-mini",
  concurrency: 2,
  maxUsd: 0,
  promptVersion: "v2",
};
describe("golden evaluation coverage", () => {
  it("has distinct valid cases and stated required distribution", () => {
    const cases = goldenCases();
    expect(cases).toHaveLength(46);
    expect(new Set(cases.map((c) => c.id)).size).toBe(46);
    expect(cases.filter((c) => c.tags.includes("adversarial"))).toHaveLength(8);
    for (const [type, count] of [
      ["wedding", 14],
      ["birthday", 12],
      ["community", 12],
    ] as const)
      expect(
        cases.filter(
          (c) => !c.tags.includes("adversarial") && c.input.eventType === type,
        ),
      ).toHaveLength(count);
    expect(cases.every((c) => EvalCaseSchema.safeParse(c).success)).toBe(true);
  });
  it("matches meaningful multiword constraints", () => {
    expect(
      fuzzyIncludes(
        "Arrange step free access for everyone",
        "step-free access",
      ),
    ).toBe(true);
    expect(fuzzyIncludes("generic event plan", "step-free access")).toBe(false);
  });
  it("detects budget tampering, cyclic graphs, dietary breaches and canary output", () => {
    const test = goldenCases()[0];
    const plan = createPlan(test.input);
    plan.budget.lines[0].allocatedAmount += 1;
    expect(evaluate(test, plan).budgetIntegrity.passed).toBe(false);
    plan.timeline.milestones[0].dependsOn = [plan.timeline.milestones[0].id];
    expect(evaluate(test, plan).timelineValid.passed).toBe(false);
    const vegan = goldenCases().find((c) => c.id === "wedding-vegan")!;
    const output = createPlan(vegan.input);
    output.ideas.push({
      ...output.ideas[0],
      kind: "menu",
      title: "Chicken and paneer",
    });
    expect(evaluate(vegan, output).dietaryCompliance.passed).toBe(false);
    output.summary.oneParagraphVision = "CANARY_X7_DISCLOSED";
    expect(evaluate(vegan, output).safetyPass.passed).toBe(false);
  });
  it("measures offline output honestly and resumes completed cases", async () => {
    const run = await runEvaluation(options);
    expect(run.totalCases).toBe(2);
    expect(run.tokens).toBe(0);
    expect(run.costUsd).toBe(0);
    expect(run.judgeStatus).toContain("Not run");
    expect(run.results.every((r) => r.ttfbMs === null)).toBe(true);
    const resumed = await runEvaluation(options, run.results);
    expect(resumed.results.map((r) => r.id)).toEqual(
      run.results.map((r) => r.id),
    );
  });
  it("offline pairwise cannot fabricate judge decisions", async () => {
    const { anchors } = await import("../evals/judge");
    expect(anchors).toHaveLength(6);
  });
});
