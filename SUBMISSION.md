# Challenge 5 submission — Celebrate AI

Celebrate AI helps users organize weddings, birthdays and community events with editable budgets, dependent timelines, vendor checklists, personalized ideas and grounded chat proposals. A complete deterministic plan remains available when the AI provider is unavailable.

## Submission links

- Public GitHub: https://github.com/9059Rohith/celebrate-ai-event-planner
- Live Vercel app: https://celebrate-ai-event-planner.vercel.app/
- Public demo: https://drive.google.com/file/d/1hz0frq_4JTFciHmpEchGQP3gOSxKw8S4/view
- CI workflow: https://github.com/9059Rohith/celebrate-ai-event-planner/actions/workflows/ci.yml

## Current readiness (25 October 2026)

| Item | Verified status |
| --- | --- |
| Public source | Public GitHub repository; approximately 8.33 MB source checkout, below the 10 MB submission limit |
| Demo | Anyone with the link → Viewer; Drive permission metadata confirms anonymous reader access |
| CI activation | Workflow committed on main as .github/workflows/ci.yml, triggered by pushes and pull requests |
| Hosted CI result | First run blocked before any steps: GitHub reports the owner account is locked due to a billing issue. Owner action is required before rerunning |
| Live app | Original Vercel alias is available |
| Production GenAI | Health reports aiConfigured=false; owner must configure OPENAI_API_KEY and redeploy before live generation/judge verification |
| Submission portal | Supplied deep link returned Page Not Found; current Hack2skill login page is open for the owner. No submission attempt has been made |

## Rubric evidence

- All three occasion flows, budget editing, timeline dependencies, vendor tasks, idea filters, chat proposal acceptance, persistence, exports, read-only sharing and offline editing are implemented.
- Recorded local evidence: 113 unit/component/API tests, 20 desktop/mobile browser tests and 46/46 deterministic evaluation cases. TypeScript, ESLint, production build and bundle/secret checks passed in the recorded release.
- Offline case pass rate is **100% (46/46)**. Reproduce with npm run eval -- --suite=all --mock. This executes the deterministic engine and does not represent measured live model quality.
- Library coverage: lines 91.53%, statements 89.51%, branches 83.31%, functions 88.73%; domain lines 98.17%. Coverage scope is lib/**/*.ts.
- Runtime dependency audit recorded zero findings. Source and built browser code secret scans passed. Five development-only lint dependency advisories remain in the unpatched braces chain.
- Initial modern-browser JavaScript: 117,583 gzip bytes against a 122,880-byte budget.
- Automated accessibility checks cover entry routes, saved/shared plans, themes, keyboard flows and narrow/wide layouts. These checks are evidence, not a universal accessibility guarantee.

## Performance evidence

The 22 October final release audit recorded **68/68 fresh-context navigation loads below two seconds**, median 0.822 s, p95 1.490 s, maximum load 1.555 s and maximum heading readiness 1.731 s. There were zero hydration/runtime errors. Conditions: Edge 155, desktop/iPhone 13 emulation, unthrottled network and verified warm CDN assets. See reports/verification-submission-stable-home.json and its raw reports. Earlier failed batches remain available.

Mobile Lighthouse medians were performance 90/85 and LCP 1.147/1.090 s for home/intake; accessibility, best practices and SEO were 100 in all six samples, with CLS zero. One simulated home LCP was 2.016 s. These finite measurements do not guarantee every device/network loads within two seconds. A later deployment requires its own identified verification report.

## Reproduce and review

Use Node 20.19+ and npm ci. Copy .env.example to .env.local; keep provider/evaluation credentials server-only. Run npm run typecheck, npm run lint, npm run test:coverage, npm run eval -- --suite=all --mock, npm run build, npm run audit:bundle and npm run test:e2e.

Publish source before measuring production. Run node scripts/warm-deployment.mjs, then npm run verify:production with a unique PERF_PHASE and the actual DEPLOYMENT_ID. Every timing sample is retained and the asset fingerprint must remain unchanged.

README follows the owner’s ScreenOps section order and includes the architecture diagram and eight real screenshots. See EVALUATION.md, ARCHITECTURE.md, AI_USAGE.md and SECURITY.md for methods and limitations. Live model responses, live judges and A/B preference scores remain unmeasured until actual provider calls succeed. Without Upstash, serverless counters are per process. No competition rank or universal compliance claim is made.
