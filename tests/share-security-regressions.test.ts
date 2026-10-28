import { afterEach, expect, it, vi } from "vitest";
import LZString from "lz-string";
import { decodePlan, encodePlan } from "@/lib/share";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { decompressBounded } from "@/lib/share/boundedDecompress";
import fc from "fast-check";

afterEach(() => vi.restoreAllMocks());

it("rejects expansion before assembling output beyond the shared-plan limit", () => {
  const encoded = LZString.compressToEncodedURIComponent("x".repeat(262145));
  const originalJoin = Array.prototype.join;
  let oversizedAssembly = false;
  vi.spyOn(Array.prototype, "join").mockImplementation(function (
    this: string[],
    separator?: string,
  ) {
    if (
      separator === "" &&
      this.every((part) => typeof part === "string") &&
      this.reduce((size, part) => size + part.length, 0) > 262144
    ) {
      oversizedAssembly = true;
    }
    return originalJoin.call(this, separator);
  });
  expect(decodePlan(encoded)).toBeNull();
  expect(oversizedAssembly).toBe(false);
});

it("preserves existing shared plans with Unicode and edited content", () => {
  const plan = createPlan(exampleInput());
  plan.summary.headline = "Celebration · परिवार 🎉";
  plan.timeline.milestones[0].notes = "Keep ramps clear — प्रवेश";
  expect(decodePlan(encodePlan(plan)!)).toEqual(
    JSON.parse(JSON.stringify(plan)),
  );
});

it("matches LZ-string for arbitrary UTF-16 content at the exact output boundary", () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 0, max: 65535 }), { maxLength: 500 }),
      (units) => {
        const value = String.fromCharCode(...units);
        const encoded = LZString.compressToEncodedURIComponent(value);
        expect(decompressBounded(encoded, value.length)).toBe(value);
        if (value.length)
          expect(decompressBounded(encoded, value.length - 1)).toBeNull();
      },
    ),
    { numRuns: 100 },
  );
});

it("handles dictionary growth and rejects truncated or invalid input", () => {
  const value = Array.from({ length: 8000 }, (_, i) =>
    String.fromCharCode((i * 7919) % 65536),
  ).join("");
  const encoded = LZString.compressToEncodedURIComponent(value);
  expect(decompressBounded(encoded, value.length)).toBe(value);
  expect(decompressBounded(encoded.slice(0, -2), value.length)).toBeNull();
  expect(decompressBounded("!invalid", 100)).toBeNull();
  expect(decompressBounded("", 100)).toBeNull();
});
