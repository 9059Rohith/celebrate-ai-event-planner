# Challenge 5 submission — Celebrate AI

Celebrate AI helps users organize weddings, birthdays and community events with editable budgets, dependent timelines, vendor checklists, personalized ideas and grounded chat proposals. A complete deterministic plan remains available when the AI provider is unavailable.

Production verification for this follow-up is pending. The [previous release audit](reports/verification-quality-final-2026-10-28.json) retained all 68 visits, 66 loads below two seconds and zero runtime/hydration errors; its strict timing gate failed.

**Owner-reported current score:** 96.99/100, with two additional attempts available. The current categories, rank and attempt counter were not independently verified. Last directly observed result: 96.98/100, rank 53/51,556 on 28 October. The owner controls resubmission; no future score is guaranteed.

## Submission links

- Public GitHub: https://github.com/9059Rohith/celebrate-ai-event-planner
- Live Vercel app: https://celebrate-ai-event-planner.vercel.app/
- Public demo: https://drive.google.com/file/d/1hz0frq_4JTFciHmpEchGQP3gOSxKw8S4/view
- Selected LinkedIn post: https://lnkd.in/p/g8c7TeDX (used at the owner’s explicit request)
- CI workflow: https://github.com/9059Rohith/celebrate-ai-event-planner/actions/workflows/ci.yml

## Follow-up verification — 28 October 2026

**Follow-up local verification — 28 October 2026:** **277/277 tests across 39 files**, **24/24 desktop/mobile browser checks**, strict TypeScript, lint/formatting, production build and bundle/secret checks passed. The full dependency audit reports zero findings. Whole-application line coverage is **82.17%**, library line coverage **94.78%**, and domain line coverage **98.35%**. The strengthened offline evaluation passes **46/46 cases with zero model calls**. See [the quality report](reports/submission-followup-2026-10-28.json). Production verification for this follow-up is pending.

This follow-up fixes saved-plan retry data loss, stale evaluation evidence, budget warning consistency, calendar-boundary mismatches and aborted request-body cleanup. Historical reports remain available; no score for this revision has been measured.

## Historical release readiness — 25 October 2026

The release evidence below is from 25 October, summarized in [the revision report](reports/code-quality-revision.json), for published code commit `f40fd79211370879aaa978dc8a3305a2c310b71c` and deployment `dpl_HUyMGmZFQUVZaQqG8S1LvUFKgCAM`. It is not a verification of later local changes. The later successful signed-in inspection on 28 October confirmed the second-attempt result above and superseded an earlier PageNotFound observation.

| Item | Verified status |
| --- | --- |
| Public source | Public GitHub repository; approximately 9.17 MB tracked source, below the 10 MB limit recorded from the owner's submission screenshot |
| Demo | Anyone with the link → Viewer; Drive permission metadata confirmed anonymous reader access on 25 October |
| CI activation | Workflow committed on main as .github/workflows/ci.yml, triggered by pushes and pull requests |
| Hosted CI result | Release run 40193415888 executed zero steps because GitHub reported an owner-account billing lock; hosted verification was not established |
| Live app | Original Vercel alias was available in the recorded release checks |
| Production GenAI | Server-only key configured; one uncached gpt-4o-mini generation returned a schema-valid hybrid plan on its first attempt. 2,038 tokens; estimated model cost $0.000702 |
| Submission portal | Attempt 1 of 3 was observed submitted on 25 October. The later 28 October inspection confirmed attempt 2 of 3 and score 96.98/100 |

## Historical release evidence — 25 October 2026

- All three occasion flows, budget editing, timeline dependencies, vendor tasks, idea filters, chat proposal acceptance, persistence, exports, read-only sharing and offline editing are implemented.
- Recorded local evidence: 135 unit/component/API tests, 20 desktop/mobile browser tests and 46/46 deterministic evaluation cases. TypeScript, ESLint, production build and bundle/secret checks passed in the recorded release.
- Offline case pass rate is **100% (46/46)**. Reproduce with npm run eval -- --suite=all --mock. This executes the deterministic engine and does not represent measured live model quality.
- Library coverage: lines 92.99%, statements 91.16%, branches 83.75%, functions 92.87%; domain lines 98.17%. Coverage scope is lib/**/*.ts.
- Runtime dependency audit recorded zero findings. Source and built browser code secret scans passed. Five development-only lint dependency advisories were recorded at the time; the 28 October full audit above supersedes that dependency finding count.
- Initial modern-browser JavaScript: 117,623 gzip bytes against a 122,880-byte budget.
- Automated accessibility checks cover entry routes, saved/shared plans, themes, keyboard flows and narrow/wide layouts. These checks are evidence, not a universal accessibility guarantee.

## Historical production performance evidence

The historical release audit on 25 October, retained 68 fresh-browser samples per browser. Edge 156 recorded 66/68 navigation loads under two seconds (median 0.999 s, p95 1.443 s, maximum 2.342 s); bundled Chromium 156 recorded 63/68 (median 0.992 s, p95 3.742 s, maximum 26.136 s). Both had zero runtime/hydration errors and stable release fingerprints. **The strict performance gate did not pass in either browser.** See [the release report](reports/code-quality-revision.json), including retained outliers and raw-report links. Conditions were fresh contexts/caches, desktop and iPhone 13 emulation, unthrottled networking and warmed CDN assets.

Historical comparison: the 22 October audit recorded 68/68 fresh-context navigation loads below two seconds, median 0.822 s, p95 1.490 s, maximum load 1.555 s and maximum heading readiness 1.731 s, with zero hydration/runtime errors. It used Edge 155 under the documented conditions. [That report](reports/verification-submission-stable-home.json) describes an earlier release and is not evidence that the 25 October performance gate passed.

Historical 22 October mobile Lighthouse medians were performance 90/85 and LCP 1.147/1.090 s for home/intake; accessibility, best practices and SEO were 100 in all six samples, with CLS zero. The intake performance score missed the master's target of at least 90; one simulated home LCP was 2.016 s. These finite measurements do not guarantee every device/network loads within two seconds. A later deployment requires its own identified verification report.

## Requirements and evidence limits

[The evidence map](docs/rubric-evidence.md) separates the official event guidance from the owner's detailed build specification. The public guidance contains conflicting wording about allowed AI tools and narrative deliverables; no detailed scoring weights were verified. Live judge scores, empirical prompt A/B results, independently human-labeled calibration anchors remain unestablished. The historical [readiness snapshot](reports/submission-readiness.json) predates attempt 1 and must not be read as the current portal state.

## Reproduce and review

Use Node 20.19+ and npm ci. Copy .env.example to .env.local; keep provider/evaluation credentials server-only. Run npm run typecheck, npm run lint, npm run test:coverage, npm run eval -- --suite=all --mock, npm run build, npm run audit:bundle and npm run test:e2e.

Publish source before measuring production. Run node scripts/warm-deployment.mjs, then npm run verify:production with a unique PERF_PHASE and the actual DEPLOYMENT_ID. Every timing sample is retained and the asset fingerprint must remain unchanged.

README follows the owner’s ScreenOps section order and includes the architecture diagram and eight real screenshots. See EVALUATION.md, ARCHITECTURE.md, AI_USAGE.md and SECURITY.md for methods and limitations. One production live response was verified on 25 October in reports/live-submission-smoke.json; live judges and A/B preference scores remain unmeasured. The recorded production configuration used gpt-4o-mini, zero automatic provider retries, a 3-request/minute ceiling and a 50,000-token/day per-process budget. Without Upstash, serverless counters are per process. No future score, final ranking or universal compliance is claimed.
