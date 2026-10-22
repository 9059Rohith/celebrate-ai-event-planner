# Challenge 5 submission

**Offline evaluation complete:** the fresh `--mock` run passed **46/46 cases (100% case pass rate)**. Reproduce without an API key using `npm run eval -- --suite=all --mock --out=test-results/submission-mock.json`. This runs the real deterministic engine; it does not simulate measured live model quality. [Recorded evidence](reports/mock-submission-check.json).

**Readiness scope:** implementation and offline evaluation evidence are available. Live AI verification, hosted CI activation, and externally accessible demo permissions are separate, unverified prerequisites; mock results do not establish those requirements.

Live app: https://celebrate-ai-event-planner.vercel.app/
Public source: https://github.com/9059Rohith/celebrate-ai-event-planner

The app supports weddings, birthdays and community events through a validated five-step intake, editable budgets, dependent timelines, vendor checklists, personalized idea filters, grounded chat proposals, exports and fragment sharing. Plans persist locally and remain editable offline. Provider failures retain a complete deterministic plan and visibly disclose template mode.

## Rubric evidence

| Criterion | Verified evidence |
| --- | --- |
| Problem alignment | All three occasion flows pass desktop/mobile browser tests; budget, timeline, vendor, idea and sharing controls work |
| Code quality | Strict TypeScript, ESLint and production build pass; domain engines separate from UI/provider transport |
| Testing | 113 unit/component/API tests; 20 browser tests; 46/46 deterministic evaluation cases |
| Coverage | Library lines 91.53%, statements 89.51%, branches 83.31%, functions 88.73%; domain lines 98.17% |
| Accessibility | Automated WCAG A/AA checks on six entry routes in light/dark themes, saved/shared plans at 360/1920px, desktop/mobile; keyboard flows covered |
| Security | Runtime audit zero findings; nonce CSP, input/output validation, moderation path, confirmation before mutations, bounded rate/token limits; source and built-JS secret scans pass |
| Efficiency | Initial modern-browser JS 117,583 gzip bytes against a 122,880-byte budget; final production timings are recorded separately |
| Repository requirement | Public repository verified through GitHub API; source checkout approximately 8 MB, repository storage 1,266 KB before this release |

## Honest completion boundaries

Live model responses, live judges and prompt A/B preference scores need the owner's OpenAI key. Offline results measure the deterministic engine and are not model-quality evidence. First-attempt and repair validity are instrumented but show Not measured until actual provider calls occur. Author-labelled judge anchors are provisional.

The saved GitHub credential lacks workflow scope. A complete Actions definition is published as ci/github-actions.yml; activation requires placing it at .github/workflows/ci.yml with an authorized credential. Local equivalents have passed.

Five development-only high-severity findings remain in the unpatched braces dependency chain used by lint tooling; runtime dependencies have zero findings. Without configured Upstash, serverless rate/cache/token counters are per-process rather than globally coordinated.

Demo recording: https://drive.google.com/file/d/1hz0frq_4JTFciHmpEchGQP3gOSxKw8S4/view . The actual UI recording is uploaded separately from Git (10.2 MB). Its metadata currently shows owner-only access; the owner must enable Anyone with the link before judge access is satisfied. No competition submission attempt or rank claim is made. Neither automated checks nor finite timing samples establish universal 100% security, accessibility or network performance.

## Reproduce

Use Node 20.19+ and npm ci. Copy .env.example to .env.local; optional OPENAI_API_KEY enables server-side generation. Run npm run dev. Verification commands: npm run typecheck, npm run lint, npm run test:coverage, npm run eval -- --suite=all --mock, npm run build, npm run audit:bundle, npm run test:e2e.

Publish source before the final production deployment, then run npm run deploy:production and npm run verify:production. The latter requires a verified warmup and preserves every failed timing sample. See README.md, EVALUATION.md, SECURITY.md and reports/ for actual measurements and their limits.

README presentation follows the owner's ScreenOps reference: demo/deployment links, architecture illustration, walkthrough, problem/solution, features, stack, implementation status, setup, validation, AI usage, submission materials, security notes and eight actual app screenshots. The source checkout totals approximately 8.33 MB including screenshots.

The first final release audit retained 67/68 loads under two seconds, zero hydration/runtime errors, and an 8.160-second first saved-plan visit. Inspection found its distinct route script was omitted from warmup. The release helper now includes the saved-plan shell, with a failing-then-passing regression and saved-workspace request diagnostics. The next audit uses a separate report phase; the failed sample remains recorded.

## Final release evidence (22 October 2026)

The ScreenOps-style README and eight screenshots are public. Production deployment dpl_83GHqesgrXcorSTCd9GJEDeQevZA is associated with source commit 04a917d7b0a20b43042b525394fac76bfef23f1a; the alias stayed unchanged during the audit. All 27 critical scripts/styles passed a second-request CDN HIT check, including the saved-plan route script.

The fresh-context Edge 155 desktop/mobile-emulation batch recorded 67/68 navigation loads below two seconds: median 0.847 seconds, p95 1.380 seconds, maximum 17.782 seconds. All saved/shared loads passed, with maximum workspace load 1.612 seconds and maximum heading readiness 1.949 seconds. All 68 visits had zero hydration/runtime errors. The strict all-pages gate FAILED because one evaluation-page visit waited approximately 17.2 seconds for multiple HTTP/2 script responses after a 244 ms HTML response. This remains unresolved; no sample was excluded or retried. See reports/verification-submission-saved-cache.json and the raw source reports.

Production health still reports aiConfigured=false. GitHub has no active workflow at .github/workflows/ci.yml, and Drive metadata shows owner-only demo permissions. Therefore live GenAI verification, hosted CI and public demo access remain incomplete. The owner's intentions to configure these are not treated as completed setup.

Final measurements are published on the codex/submission-evidence branch so publishing evidence does not replace the production build under test. The branch contains the same application source as production plus reports and documentation.

Loading UI follow-up: a separate Lighthouse filmstrip reproduced the home page replacing the global loading screen, with CLS 0.913. The loading file is now scoped to saved-plan routes. Build, all 113 unit/integration tests, all 20 browser tests, and the bundle/secret audit passed after this change. The next release is measured separately; earlier deployment reports remain historical evidence.


## Final verified release

Deployment dpl_FGzNzWac1tSXgRiUHaTw1GTd2kPb is live on the original production alias and corresponds to source commit ec16026c81cdced36536db008743904789c05961. The final asset fingerprint stayed unchanged before/after the batch, and the alias deployment identity was checked afterward. All 68 fresh-context Edge visits passed: median 0.822 s, p95 1.490 s, maximum load 1.555 s, maximum heading readiness 1.731 s, zero hydration/runtime errors. The strict navigation gate passed. Earlier failed batches remain in reports/.

Three default mobile Lighthouse runs per route recorded median LCP 1.147 s (home) and 1.090 s (intake), median performance 90/85, and accessibility/best practices/SEO 100 in every sample. CLS was zero in all six runs after the loading-boundary fix. One home simulated LCP sample was 2.016 s; the navigation gate does not imply every throttled Lighthouse metric is below two seconds.

The README follows the ScreenOps section order and includes the demo, deployment, architecture, walkthrough, problem/solution, features, stack, status, setup, validation, AI usage, submission links, security notes and eight real screenshots. The public repository remains under 10 MB. Production AI credentials, an active hosted CI workflow and public demo viewing permission still require owner setup. No rank or 100% universal compliance claim is made.
