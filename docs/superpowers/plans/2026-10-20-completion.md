# Remaining Celebrate AI requirements

Goal: finish all implementable requirements in the supplied master build prompt and redeploy the existing Vercel project.
Architecture: retain the current Next.js 16 installation (bundled documentation is binding); deterministic domain engines own arithmetic; server streams validated AI enhancement and proposed tools; client confirms every mutation. Independent file ownership allows concurrent work.
Spec: C:/Users/BhaviChasvi/.codex/attachments/f37417a0-73a4-4fad-b127-a9c1d2b466ad/Pasted text.txt

Global constraints: anonymous use; secrets server-only; INR default plus USD/EUR/GBP; no fabricated vendor contacts; exact budget math; Zod boundaries; meaningful automated checks; same Vercel alias. No approvals or clarifying questions requested: proceed under the user's explicit completion/deployment authorization.

Review focus: stale streamed output must preserve edits; locks must survive mutations; imported data is untrusted; unavailable provider must remain usable; offline navigation must never cache API or private shared URLs.

- [ ] Backend: strict validated API boundaries, per-route hashed rate limits/Redis, structured LLM repair/caching/budget accounting/abort, prompts v1/v2, streaming chat tools and ideas/regeneration. Own lib/llm, lib/security, app/api except eval. Public tools interface ToolProposalSchema + executeToolProposal(plan,proposal).
- [ ] Evaluations: representative golden dataset/adversarial cases, deterministic and live calibrated judges, concurrency/resume/cost limits/CLI options, real v1/v2 comparison, rich dashboard and mini-eval. Own evals, app/evals, app/api/eval, evaluation components and documentation.
- [ ] Domain/timeline: property regressions first, exact locks/bounds/contingency, date/dependency/ICS correctness, dietary constraints, complete vendor checklists; timeline editor drag and keyboard ordering, multi-day schedule, Gantt. Own lib/domain, timeline component, domain tests.
- [ ] Product UI: modular tabs, tool acceptance/undo, idea actions, budget charts and optimization, feedback, imports/persistence migrations, five-step form completion, theme/currency, all-section print, offline shell, privacy, nonce CSP and metadata. Own components except timeline/evals and pages except evals/API.
- [ ] Integration: run typecheck, zero-error lint, unit/component/API/MSW/e2e, bundle/secret audit, Lighthouse; fix actual failures. Record real measurements and external blockers. Deploy with existing .vercel/project.json and verify same alias and live flows.

Verification: targeted tests per task, then npm run typecheck, npm run lint, npm run test, npm run eval -- --mock, npm run build, npm run audit:bundle, npm run test:e2e, Lighthouse on live landing/wizard. Never fabricate scores. OpenAI/Redis credentials are external prerequisites, not a reason to omit the implementation.
