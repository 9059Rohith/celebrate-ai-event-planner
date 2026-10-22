# Challenge 5 submission

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
