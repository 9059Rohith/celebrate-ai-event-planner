# Celebrate AI

**Owner-reported latest submission score: 96.99/100.** The new category breakdown and rank have not been independently verified. The last directly observed result on 28 October was 96.98/100, rank 53 of 51,556 (approximately top 0.103%), with Code Quality 89, Security 99, Efficiency 100, Testing 99, Accessibility 99 and Alignment 100. These are historical results, not predictions for this revision.

A thoughtful GenAI planning companion for life's celebrations.

Celebrate AI helps people organize weddings, birthdays and community events. It turns an event brief into an editable budget, timeline, vendor checklist and personalized ideas. Server-side AI adds grounded suggestions when configured; deterministic engines keep the plan usable when the provider is unavailable.

Repository: https://github.com/9059Rohith/celebrate-ai-event-planner

## Demo Link

Demo video: [Link](https://drive.google.com/file/d/1hz0frq_4JTFciHmpEchGQP3gOSxKw8S4/view)

The recorded walkthrough is publicly viewable with the link (Anyone with the link → Viewer), verified on 25 October 2026.

## Deploy

Live app: [https://celebrate-ai-event-planner.vercel.app/](https://celebrate-ai-event-planner.vercel.app/)

## Privacy-First Architecture

![Celebrate AI planning architecture](docs/celebrate-ai-architecture.svg)

Plans live in browser storage. Only relevant event details and grounded context reach server-side AI routes. Sharing creates a read-only copy in a URL fragment; importing creates an editable local copy.

## Demo

The demo creates a wedding plan from the five-step intake, explores the budget, updates a timeline milestone, checks a vendor task and saves an idea. It then asks the planner to change the guest count, previews the proposal and explicitly accepts it. A read-only share link is opened and imported. Birthday and community plans demonstrate the other occasion flows, followed by evaluation case evidence.

Source badges distinguish templates from AI enhancement. The evaluation shown is the recorded offline engine run, not a live LLM quality score.

## Problem Statement

**[Challenge 5] Celebration & Event Planner**

Create a GenAI-powered planning assistant that helps users organize weddings, birthdays and community events with budgets, timelines, vendor checklists and personalized ideas.

Event planning spreads decisions across budgets, dates, vendors and guest needs. Generic suggestions often miss dietary restrictions, cultural preferences, dependencies or practical spending limits. Users need one editable plan that stays consistent as decisions change.

## Solution Overview

Celebrate AI combines reliable planning engines with optional AI personalization:

```text
Event brief: occasion, guests, budget, date, dietary needs and style
        |
        v
Validated intake -> deterministic engines -> complete local plan
        |                                        ^
        v                                        |
Server-side OpenAI -> structured validation ------+
  Input safety, bounded repair, template fallback
        |
        v
Grounded chat -> proposal -> explicit acceptance -> validation -> undo
        |
        v
Budget / timeline / vendors / ideas / export / read-only sharing
```

Domain code owns money arithmetic and timeline dependencies. AI never silently applies a chat proposal, and provider failure leaves a complete template plan.

## Key Features

- Five-step validated intake for three occasion types, with autosaved drafts.
- Exact budget allocations, contingency, locked categories, charts, feasibility warnings and undo/redo.
- Dependent timelines, critical path, overdue warnings, keyboard ordering, multi-day schedules and calendar export.
- Vendor checklists, booking status, custom tasks, dietary safeguards, questions and contract red flags.
- Personalized ideas with dietary filters, saved cards, style variants and deduplication.
- Grounded chat with typed proposals, explicit acceptance, persisted decisions and undo.
- Progressive SSE creation; saved retries show a revision-bound preview, preserve edits and accept as one undoable change.
- Validated local persistence, JSON import/export, read-only fragment sharing, printing and offline editing.
- Persistent theme/currency, keyboard controls, storage notices and device-local human feedback.
- A 46-case evaluation dataset, adversarial checks and evidence drill-down; tooling for live judges and blinded position-swapped comparisons, whose live quality scores remain unmeasured.

## Tech Stack

- Frontend: Next.js 15.5.28, React 19, TypeScript strict mode
- UI: Tailwind CSS 4, Radix UI, Lucide, Recharts
- Forms and schemas: React Hook Form, Zod
- State and persistence: Zustand, localStorage
- AI: official server-side OpenAI SDK, structured output and SSE
- Domain: deterministic budget, timeline, vendor and idea engines
- Optional shared limits/cache: Upstash Redis REST
- Testing: Vitest 4, Testing Library, MSW, fast-check, Playwright, axe
- Hosting: Vercel Edge page shells and Node.js APIs

## Current Implementation Status

Implemented and verified locally:

- All three occasion flows, editing, persistence, exports and sharing.
- Complete template fallback with visible source/provider status.
- Validated AI generation, bounded repair, moderation and grounded chat tool boundaries.
- Per-attempt token reservations, bounded rate-limit histories and environment ceilings.
- Route hydration replay regression and stable shared-fragment hydration.
- Automated WCAG checks in light/dark themes and narrow/wide layouts.
- Unit/component/API suite: **277/277 passing** across 39 files (28 October 2026).
- Desktop/mobile browser suite: **24/24 passing**.
- Offline deterministic evaluation: **46/46 passing**.
- Whole-application line coverage: **82.17%**; library: **94.78%**; domain: **98.35%**.
- Typecheck, lint, production build, bundle budget and browser-JavaScript secret scan.
- Public source, publicly viewable demo recording, submission notes and architecture/security/evaluation documentation.

Production verification and remaining external limits:

- Production live generation was verified on 25 October with `gpt-4o-mini`: one uncached plan passed schema validation on its first attempt, using 1,158 input and 880 output tokens (estimated model cost $0.000702). See [live verification](reports/live-submission-smoke.json). Live judge and model A/B quality scores remain unmeasured.
- [GitHub Actions is activated](https://github.com/9059Rohith/celebrate-ai-event-planner/actions/workflows/ci.yml) on pushes and pull requests. The [28 October code-release run](https://github.com/9059Rohith/celebrate-ai-event-planner/actions/runs/40722123355) was blocked before checks started by the owner account’s billing lock. Hosted CI verification awaits the owner resolving that lock.
- Without Upstash, rate/cache/token counters are per server process.
- The 28 October full dependency audit reports zero vulnerabilities after updating Vitest and its coverage package to 4.1.12.

The [follow-up quality report](reports/submission-followup-2026-10-28.json) records the latest local checks. AI refinement preserves full user state and rejects stale previews; evaluations bind dataset/model/code identity and reject incomplete judging. Wizard transitions expose selected states and move keyboard focus. Fresh production verification retained 60/68 loads below two seconds and 0 runtime/hydration errors; the strict timing gate failed.

Production verification retained all **68 visits**: **60/68 loads below two seconds**, median **1.329 s**, p95 **2.428 s**, maximum **2.959 s**, maximum heading readiness **3.053 s**, and **0 runtime/hydration errors**. The strict two-second gate **failed**. Edge 156.0.4314.50, fresh desktop/iPhone 13 contexts, unthrottled network and verified CDN warmup; the release fingerprint stayed unchanged. No sample was retried or discarded. [Production audit](reports/verification-followup-2026-10-28.json). The [previous release audit](reports/verification-quality-final-2026-10-28.json) remains historical evidence.

Historical 25 October timing: Edge 66/68 loads under two seconds (p95 1.44 s, max 2.34 s); bundled Chromium 63/68 with a maximum 26.14 s pre-request stall. Both runs had zero runtime/hydration errors. Those strict all-samples performance gates did not pass. [Retained evidence](reports/code-quality-revision.json) includes all outliers. Finite measurements do not guarantee every device/network loads within two seconds. The first-attempt standing is recorded above; no future score or final rank is guaranteed. See [SUBMISSION.md](SUBMISSION.md) for current evidence and limitations.

## Setup Instructions

Prerequisites:

- Node.js 20.19+ and npm
- Chrome/Chromium or Microsoft Edge for browser tests
- OpenAI API key for live AI and live evaluations
- Optional Upstash credentials for shared counters/cache

Install dependencies:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local` for live AI. The template planner works without it. Set a private `EVAL_SECRET` to protect live mini-evaluations; never commit either value.

Start the application:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

For deployment, set server-only variables in Vercel Production. See [.env.example](.env.example) and [environment notes](docs/verification-notes.md).

## Validation

**Offline evaluation complete:** the 28 October `--mock` run passed **46/46 cases (100% case pass rate)**. Reproduce without an API key using `npm run eval -- --suite=all --mock --out=test-results/submission-mock.json`. This runs the real deterministic engine; it does not simulate measured live model quality. [Recorded evidence](reports/mock-followup-2026-10-28.json).

Type checking, lint and coverage:

```powershell
npm run typecheck
npm run lint
npm run test:coverage
```

Offline evaluation and production browser checks:

```powershell
npm run eval -- --suite=all --mock
npm run build
npm run audit:bundle
npm run test:e2e
```

Live evaluation, after configuring a key:

```powershell
npm run eval -- --suite=judge --limit=5 --max-usd=2
```

Latest whole-application coverage: statements **79.91%**, branches **75.88%**, functions **74.62%**, lines **82.17%**. The default `npm run test:coverage` includes app, components, lib, evals, middleware and public runtime JavaScript, with a 80% overall line gate. Library coverage is 92.47% statements, 86.47% branches, 94.01% functions and 94.78% lines; domain lines are 98.35%. The library 80% and domain 90% gates remain enforced across all four metrics.

The offline evaluation passes all 46 schema, budget, timeline, diet, constraint, safety, contact-heuristic and fallback checks. The v1 engine baseline passed 36/46. This compares engine revisions, not isolated LLM prompt quality.

Historical production verification (22 October 2026; an earlier release):

| Check | Result |
| --- | --- |
| Fresh-browser navigation loads | **68/68 below 2 seconds** |
| Median / p95 / maximum load | **0.822 s / 1.490 s / 1.555 s** |
| Maximum workspace heading readiness | **1.731 s** |
| Hydration / runtime errors | **0** |
| Mobile Lighthouse median LCP, home / intake | **1.147 s / 1.090 s** |
| Lighthouse median performance, home / intake | **90 / 85** |
| Accessibility / best practices / SEO | **100 / 100 / 100** on both audited routes |
| Lighthouse CLS | **0 in all six runs** |

Navigation used fresh Edge 155 contexts, desktop and iPhone 13 emulation, an unthrottled network and verified warm CDN assets. Lighthouse used three cache-reset default mobile Slow 4G simulations per route; one home LCP sample was 2.016 seconds. Navigation load and simulated LCP are separate measures. Earlier failures remain recorded; no all-network, all-device guarantee is claimed. See [the final audit](reports/verification-submission-stable-home.json) and [Lighthouse evidence](reports/lighthouse-submission-summary.json).

Release checks:

```powershell
npm run deploy:production
$env:BROWSER_CHANNEL = "msedge"
$env:PERF_PHASE = "submission-final"
npm run verify:production
```

Publish source before deployment. Warmup verifies CDN hits and an unchanged asset fingerprint. Production verification records 68 fresh-browser visits and fails for errors, load or heading readiness at/above two seconds. Publish the final reports to the public source repository after identifying the measured deployment. Previous failures remain in [performance history](docs/performance-history.md).

## Codex / AI Usage

Codex/OpenAI assisted with requirements, architecture, UI, domain engines, server-side integration, debugging, regression tests, evaluations, deployment checks and documentation.

Live provider behavior requires a configured key. Mocked transport tests and deterministic evaluations are labelled separately.

Full AI usage documentation is in [AI_USAGE.md](AI_USAGE.md).

## Submission Materials

- Source code: this public repository
- Live app: [Celebrate AI](https://celebrate-ai-event-planner.vercel.app/)
- Demo: [Drive recording](https://drive.google.com/file/d/1hz0frq_4JTFciHmpEchGQP3gOSxKw8S4/view), public viewing verified
- Submission summary: [SUBMISSION.md](SUBMISSION.md)
- AI usage: [AI_USAGE.md](AI_USAGE.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Evaluation methods/results: [EVALUATION.md](EVALUATION.md)
- Security: [SECURITY.md](SECURITY.md)
- Verification evidence: [reports/](reports/)

## Security Notes

The repository excludes secrets and runtime artifacts:

- `.env.local` and provider/evaluation credentials
- `.vercel/` runtime/authentication files
- `node_modules/`, `.next/` and coverage output
- Browser traces, downloads and temporary runtime files
- Video binaries, stored separately to keep the source under 10 MB

Use [.env.example](.env.example) as the setup template. Requests enforce schemas, body limits, origin checks and rate limits. Scripts use nonce CSP. Model output is validated/sanitized; mutations require acceptance. Share links contain a plan copy, so share only with intended viewers. Estimates are not vendor quotations; currency selection does not perform live FX conversion.

## Screenshots

### 1. Celebration Home

![Celebrate AI home](docs/screenshots/01-home.webp)

The landing page introduces the planner and its three occasion types.

### 2. Event Intake

![Event intake](docs/screenshots/02-intake.webp)

The wizard collects the event brief before creating a plan.

### 3. Plan Overview

![Wedding plan overview](docs/screenshots/03-overview.webp)

The overview combines the vision, next steps and planning progress.

### 4. Budget Planner

![Budget planner](docs/screenshots/04-budget.webp)

Editable allocations keep spending, contingency and guest costs consistent.

### 5. Timeline

![Event timeline](docs/screenshots/05-timeline.webp)

Milestones expose dates, dependencies, priorities and progress.

### 6. Vendor Checklist

![Vendor checklist](docs/screenshots/06-vendors.webp)

Vendor tasks and booking status make follow-through visible.

### 7. Personalized Ideas

![Personalized ideas](docs/screenshots/07-ideas.webp)

Ideas can be filtered, saved and adapted to the celebration.

### 8. Evaluation Evidence

![Evaluation dashboard](docs/screenshots/08-evaluations.webp)

The dashboard distinguishes engine checks from unmeasured live AI quality.

Historical large JSON reports are losslessly archived with SHA-256 hashes in [the evidence archive index](reports/archived-evidence.json). The current offline report also links its complete original gzip archive.
