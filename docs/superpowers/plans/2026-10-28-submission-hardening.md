# Submission hardening implementation plan

> For agentic workers: use Superpowers systematic debugging and test-driven development for each confirmed bug, followed by independent review and verification.

**Goal:** Improve the existing Celebration & Event Planner against the observed rubric with reproducible correctness, security, accessibility and documentation fixes.

**Architecture:** Preserve Next.js, local plan storage, existing shared links and server-side AI boundaries. Fix lifecycle ownership at asynchronous boundaries and ensure undo revision checks cannot reuse historical revisions. Keep domain behavior and lazy loading intact.

**Spec:** The user's existing Challenge 5 request, prior authorized quality improvements, and source-confirmed Astra findings on 28 October 2026. This is maintenance of existing features, not a new product design.

**Constraints:** No fabricated scores or rankings; no grader-directed instructions; retain failed timing reports; preserve public URLs; source checkout below 10 MB; keep model usage small; never expose credentials. User submits the competition entry.

## Work and validation

- [x] Chat/store ownership: demonstrate late regeneration after navigation and reused undo versions; fix with cancellation/ownership and monotonic revision checks. Owner: Astra quality reviewer.
- [x] Ideas/refinement lifecycle: demonstrate lost saved ideas, wrong-section previews and late completion; preserve current edits and bind/cancel requests by plan and section. Owner: parent.
- [x] Stream resources: demonstrate pending reads on abort and uncancelled malformed streams; ensure cancellation and cleanup. Owner: parent.
- [x] Shared-link decoding: reject oversized expansion before materializing it, preserving format compatibility and license attribution. Owner: Astra security reviewer.
- [x] Feedback: prove scope reset, selected reason semantics and honest storage-failure status. Owner: Astra security reviewer; component keys its own feedback scope.
- [x] Documentation: distinguish official portal requirements from optional master-spec targets and reconcile stale measurements. Owner: Astra research reviewer.
- [x] Independent review of integrated diffs; run typecheck, formatting/lint, coverage, offline evaluation, build, bundle/secret audit, desktop/mobile browser checks; investigate failures rather than hiding them.
- [x] Publish verified code and dated evidence to existing GitHub repository; deploy to existing Vercel project and verify production. Record hosted-CI and timing limitations separately.

## Review focus

1. Navigating or deleting a plan while AI work is pending must not mutate another plan/history.
2. Edits made while suggestions load must survive completion.
3. Cancelled or malformed streams must release network resources.
4. Highly compressed inputs must be bounded before expansion, with normal historical links still readable.
5. Local save failures and unmeasured evaluation metrics must never be reported as success.

## Research limits

The saved Hack2skill challenge URL returned Page Not Found on 28 October. The latest directly observed competition result remains 96.64/100 and rank67/51,309 on 25 October. No later score, current eligibility or final ranking is assumed.

## Verified outcome

Published code a79430b475c3f687996f5e6456e710bdc9a0a375; deployment dpl_6Tm2JBo3bicbATdftnZ11qzpEN4N. All157 tests,20 browser checks,46 offline cases, typecheck, lint, build and bundle checks passed. Full dependency audit zero. All68 retained production navigation samples below2s, no runtime/hydration errors; final identity-fetch interruption and separate matching-fingerprint recovery retained in reports. Hosted CI still blocked by account billing; no new competition score or submission.
