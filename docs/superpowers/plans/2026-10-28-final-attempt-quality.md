# Final-attempt quality implementation plan

> For agentic workers: apply Superpowers systematic debugging and test-driven development to the confirmed findings below, followed by independent review and fresh verification.

**Goal:** Strengthen the final Celebrate AI submission through demonstrable correctness and maintainability improvements, targeting the observed Code Quality gap without promising an evaluator score.

**Architecture:** Keep the current Next.js/React application, public URLs and local-first storage. Treat compact AI snapshots as suggestion context, not authoritative user state. Centralize section reconciliation and revision checks; make evaluation and release verification fail honestly with reproducible evidence.

**Tech stack:** Next.js15.5.28, React19, TypeScript, Zod, Zustand, Vitest4.1.12, Playwright.

**Spec and authorization:** Existing Challenge5 planning assistant requirements and the owner's explicit request to research, improve, verify, publish and redeploy for a final attempt. Observed portal result on28October:96.98/100, rank53/51,556; CodeQuality89, Security99, Efficiency100, Testing99, Accessibility99, Alignment100; attempt2of3. The owner submits the competition entry.

## Decisions and constraints

- Prefer domain and async-boundary corrections with regression tests over a framework rewrite or cosmetic file splitting.
- Preserve edited notes, completion/booking state, saved ideas, custom tasks and locked allocations when accepting a regenerated section.
- Keep credentials server-only; no additional paid provider evaluations in this revision.
- Retain historical reports and every timing outlier; do not label offline results as live judge scores.
- Keep public source below10MB. Compress historical raw evidence losslessly if new evidence would exceed that limit, updating its references.
- Preserve library80%/domain90%coverage gates. Measure overall application coverage explicitly; never exclude difficult modules to inflate it.
- No final competition submission and no promise of99or100.

## Task1: Authoritative state and revision-bound previews — Astra architecture

Files: BudgetTab, RegenerateSection, usePlannerChat, relevant snapshot/regeneration API, focused domain reconciliation/preview helper, new regression tests.

- [x] Reproduce stale budget responses and previews overwriting new edits/locks, and pending animation-frame writes after navigation.
- [x] Reproduce lossy regeneration clearing vendor completion/custom tasks, saved ideas and timeline edits.
- [x] Implement typed section reconciliation against the full client state with explicit revision/ownership checks. Compact context remains read-only model input.
- [x] Verify matching-revision acceptance and rejection after edit, undo, navigation, deletion or dismissal; preserve valid existing behavior.

## Task2: Evaluation integrity — Astra evaluation

Files: evals metrics/harness/comparison/judge as needed, plan date schema, focused evaluation integrity tests.

- [x] Demonstrate prohibited dietary output and invalid due dates passing old metrics.
- [x] Demonstrate resume accepting changed case inputs and partial judging passing a run.
- [x] Demonstrate position-swapped judgments disagreeing while a single winner is still reported.
- [x] Correct checks, resume identity and judge completeness; report disagreement explicitly. Preserve raw historical evidence and avoid paid calls.

## Task3: Accessibility and measured coverage — Astra assurance

Files: wizard controls, wizard accessibility regression tests, separate all-runtime coverage configuration/script if appropriate.

- [x] Reproduce missing selected-occasion semantics and missing current-step/focus feedback.
- [x] Add observable selection/current-step semantics and keyboard transition focus without breaking validation.
- [x] Measure coverage across runtime app/components/lib/middleware and evaluation tooling, reporting scopes separately where appropriate.
- [x] Add meaningful tests for demonstrated gaps; retain existing strict library/domain gates.

## Task4: Reliable release evidence — parent

Files: scripts/verify-production.mjs, new scripts/lib/production-verification.mjs, tests/production-verification.test.ts.

- [x] Test final fingerprint failure, missing/malformed reports, nonzero child exits, partial sample counts, non200status and retained slow samples.
- [x] Separate orchestration/summary from CLI I/O with injected inspection and audit operations.
- [x] Always produce a failing summary on operational errors; never resample or silently turn a failed check green.
- [x] Preserve prior phase reports by refusing phase-name collisions.

## Task5: Review, release and submission preparation — parent plus independent Astra review

- [x] Independent review of each implementation track; resolve actionable findings.
- [x] Typecheck, lint/format, coverage, offline eval, production build, bundle/secret and dependency audits, desktop/mobile flows.
- [x] Update current portal result and submission narrative with measured facts; retain historical scores and evidence.
- [x] Publish source, deploy existing Vercel project, capture all production navigation/hydration results with unique phase.
- [x] Publish final evidence and preserve the tested deployment; leave the last Submit click to the owner.

## Review focus

1. Concurrent edits and delayed network/frame callbacks must not overwrite newer state or another plan.
2. Accepting a suggestion must preserve operational state absent from compact AI context.
3. Evaluations must reject invalid content, changed resume inputs and incomplete/conflicting judgments.
4. Keyboard and screen-reader users must perceive selected event type and step transitions.
5. Failed verification infrastructure must preserve samples and produce an explicit failed report.

## Research references

The current portal exposes six score categories but no detailed Code Quality deductions. Implementation guidance: [Next15 client/server boundaries](https://nextjs.org/docs/15/app/getting-started/server-and-client-components), [React state structure](https://react.dev/learn/choosing-the-state-structure), [TypeScript narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html). Local Next docs directory is absent in the installed package; the versioned official guide is the fallback. No hidden judging weights or future score are assumed.


Final release: local code `8e6d966`, published code `b807645`, deployment `dpl_2tYnHteVz9NApNqUBuiXtdVJdUcj`. All 245 tests, 22 browser checks, 46 offline cases and configured coverage gates pass. The production audit retained 68 samples, zero runtime/hydration errors, two load outliers and one additional heading-readiness outlier; its strict timing gate failed. No resampling or paid runtime model calls. Hosted CI remains blocked before execution by owner-account billing.
