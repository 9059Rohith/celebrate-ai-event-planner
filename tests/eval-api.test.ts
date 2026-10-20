import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../lib/security/rateLimit", () => ({
  rateLimit: vi.fn(async () => true),
}));
vi.mock("../evals/harness", () => ({
  runEvaluation: vi.fn(async (options) => ({
    passed: 5,
    totalCases: 5,
    mode: options.mock ? "offline" : "live",
    results: [],
  })),
}));
import { POST } from "../app/api/eval/run/route";
import { runEvaluation } from "../evals/harness";
import { rateLimit } from "../lib/security/rateLimit";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.mocked(rateLimit).mockResolvedValue(true);
});
describe("protected mini evaluation", () => {
  it("disables execution without a server secret", async () => {
    vi.stubEnv("EVAL_SECRET", "");
    expect(
      (
        await POST(
          new Request("http://localhost/api/eval/run", { method: "POST" }),
        )
      ).status,
    ).toBe(503);
    expect(runEvaluation).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests and invalid secrets", async () => {
    vi.stubEnv("EVAL_SECRET", "expected");
    expect(
      (
        await POST(
          new Request("http://localhost/api/eval/run", {
            method: "POST",
            headers: {
              origin: "https://other.example",
              "x-eval-secret": "expected",
            },
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          new Request("http://localhost/api/eval/run", {
            method: "POST",
            headers: { "x-eval-secret": "wrong" },
          }),
        )
      ).status,
    ).toBe(403);
  });
  it("enforces evaluator rate limits", async () => {
    vi.mocked(rateLimit).mockResolvedValue(false);
    const response = await POST(
      new Request("http://localhost/api/eval/run", { method: "POST" }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });
  it("runs five live cases with a key and explicitly falls back without it", async () => {
    vi.stubEnv("EVAL_SECRET", "expected");
    vi.stubEnv("OPENAI_API_KEY", "");
    const request = () =>
      new Request("http://localhost/api/eval/run", {
        method: "POST",
        headers: { "x-eval-secret": "expected" },
      });
    expect((await POST(request())).status).toBe(200);
    expect(runEvaluation).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 5, mock: true }),
    );
    vi.stubEnv("OPENAI_API_KEY", "synthetic-test-value");
    expect((await POST(request())).status).toBe(200);
    expect(runEvaluation).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 5, mock: false }),
    );
  });
});
