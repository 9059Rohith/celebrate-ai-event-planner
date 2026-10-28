import { afterEach, beforeEach, expect, it, vi } from "vitest";

const originalExitCode = process.exitCode;
const phase = "verification-unit";
const release = { fingerprint: "release-a", assets: ["app.js"] };
const reports = ["full-load", "workspace-load", "shared-hydration"];
let files: Record<string, unknown>;
let inspect: ReturnType<typeof vi.fn>;
let spawn: ReturnType<typeof vi.fn>;
let write: ReturnType<typeof vi.fn>;
let exists: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("PERF_PHASE", phase);
  vi.spyOn(console, "log").mockImplementation(() => {});
  files = {
    "reports/deployment-warmup.json": {
      fingerprint: release.fingerprint,
      verifiedAssets: 1,
    },
  };
  reports.forEach((name, index) => {
    files[`reports/${name}-${phase}.json`] = {
      browserChannel: "test",
      browserVersion: "1",
      results: Array.from({ length: [36, 12, 20][index] }, (_, sample) => ({
        sample,
        status: 200,
        loadMs: 800,
        readyMs: 900,
        errors: [],
      })),
    };
  });
  inspect = vi.fn(async () => release);
  spawn = vi.fn(() => ({ status: 0 }));
  write = vi.fn();
  exists = vi.fn(() => false);
  vi.doMock("node:fs", () => ({
    readFileSync: (path: string) => {
      if (!(path in files)) throw new Error("Missing report");
      return JSON.stringify(files[path]);
    },
    writeFileSync: write,
    existsSync: exists,
  }));
  vi.doMock("node:child_process", () => ({ spawnSync: spawn }));
  vi.doMock("../scripts/lib/release-cache.mjs", () => ({
    productionUrl: "https://example.test",
    inspectRelease: inspect,
  }));
});

afterEach(() => {
  process.exitCode = originalExitCode;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.doUnmock("node:fs");
  vi.doUnmock("node:child_process");
  vi.doUnmock("../scripts/lib/release-cache.mjs");
});

function summary() {
  const call = write.mock.calls.find(([path]) =>
    String(path).endsWith(`verification-${phase}.json`),
  );
  expect(call).toBeDefined();
  return JSON.parse(call![1]);
}

it("retains all samples in a failed summary when final identity inspection fails", async () => {
  inspect
    .mockResolvedValueOnce(release)
    .mockRejectedValueOnce(new Error("ECONNRESET"));
  await expect(
    import("../scripts/verify-production.mjs"),
  ).resolves.toBeDefined();
  expect(summary()).toMatchObject({
    samples: 68,
    passed: false,
    stableRelease: false,
  });
  expect(summary().verificationErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        stage: "final-identity",
        message: "ECONNRESET",
      }),
    ]),
  );
  expect(spawn).toHaveBeenCalledTimes(3);
  expect(inspect).toHaveBeenCalledTimes(2);
  expect(process.exitCode).toBe(1);
});

it("writes a failed summary when an audit report is missing, retaining the other samples", async () => {
  delete files[`reports/full-load-${phase}.json`];
  await expect(
    import("../scripts/verify-production.mjs"),
  ).resolves.toBeDefined();
  expect(summary()).toMatchObject({ samples: 32, passed: false });
  expect(summary().verificationErrors).toHaveLength(1);
});

it("does not claim success for a non-200 sample even if the child command exits zero", async () => {
  const report = files[`reports/full-load-${phase}.json`] as {
    results: { status: number }[];
  };
  report.results[0].status = 503;
  await import("../scripts/verify-production.mjs");
  expect(summary().passed).toBe(false);
  expect(summary().errors).toHaveLength(1);
});

it("writes a preflight failure without running browser checks when the warmed release differs", async () => {
  files["reports/deployment-warmup.json"] = {
    fingerprint: "old",
    verifiedAssets: 1,
  };
  await expect(
    import("../scripts/verify-production.mjs"),
  ).resolves.toBeDefined();
  expect(summary()).toMatchObject({ samples: 0, passed: false });
  expect(spawn).not.toHaveBeenCalled();
});

it("retains slow samples and child failures without retrying", async () => {
  const report = files[`reports/full-load-${phase}.json`] as {
    results: { loadMs: number }[];
  };
  report.results[0].loadMs = 2345;
  spawn.mockReturnValueOnce({ status: 1 });
  await import("../scripts/verify-production.mjs");
  expect(summary()).toMatchObject({
    samples: 68,
    passed: false,
    underTwoSeconds: 67,
    maxLoadMs: 2345,
  });
  expect(summary().outliers).toHaveLength(1);
  expect(spawn).toHaveBeenCalledTimes(3);
});

it("passes only a complete stable release with all required samples and commands", async () => {
  await import("../scripts/verify-production.mjs");
  expect(summary()).toMatchObject({
    samples: 68,
    passed: true,
    stableRelease: true,
  });
});

it("refuses a reused phase without overwriting any earlier evidence", async () => {
  exists.mockReturnValue(true);
  await expect(import("../scripts/verify-production.mjs")).rejects.toThrow(
    /already has evidence/,
  );
  expect(spawn).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

it("retains partial and malformed report failures rather than treating them as an empty successful run", async () => {
  files[`reports/full-load-${phase}.json`] = { results: [] };
  files[`reports/shared-hydration-${phase}.json`] = { results: "invalid" };
  await import("../scripts/verify-production.mjs");
  expect(summary()).toMatchObject({ samples: 12, passed: false });
  expect(summary().verificationErrors).toHaveLength(2);
});

it("requires heading readiness in workspace samples", async () => {
  const report = files[`reports/workspace-load-${phase}.json`] as {
    results: { readyMs?: number }[];
  };
  delete report.results[0].readyMs;
  await import("../scripts/verify-production.mjs");
  expect(summary().passed).toBe(false);
  expect(summary().verificationErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "Workspace sample is missing heading readiness",
      }),
    ]),
  );
});
