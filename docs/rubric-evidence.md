# Requirements and evidence map

Research and latest local verification date: **28 October 2026**. The [hardening summary](../reports/submission-hardening-2026-10-28.json) records 157/157 tests across 24 files with Vitest and coverage 4.1.12, passing TypeScript, a 46/46 offline evaluation with zero model calls and a full dependency audit with zero findings. Lint, production build, bundle/secret checks and all 20 desktop/mobile browser checks passed. The same Vercel URL is deployed and health-checked; live timing and audit-recovery details are in the hardening summary. The latest production timing is linked in the hardening summary; historical evidence from **25 October** used, published code `f40fd79211370879aaa978dc8a3305a2c310b71c`, deployment `dpl_HUyMGmZFQUVZaQqG8S1LvUFKgCAM`. This document maps evidence; it does not predict a score.

## Official guidance and unresolved wording

The [official PromptWars Virtual page](https://promptwars.in/promptwarsVirtual.html) links registration to this event: [pwvirtual1](https://hack2skill.com/event/pwvirtual1/registration). It calls for code, a live preview and a narrative. Its duplicate submission sections differ: one specifies LinkedIn; another adds a technical blog; the FAQ describes a blog or article. Allowed-tool wording also conflicts: one section permits Antigravity or other AI tools, while another section and the FAQ require Antigravity. The page says selection criteria are confidential. No detailed scoring weights were verified.

Resolve these contradictions against current Challenge 5 portal instructions or organizer clarification before asserting eligibility. Do not infer mandatory Gemini runtime integration, claim unrecorded Antigravity use or guarantee a score. The [Hack2skill community overview](https://hack2skill.com/pw-community/) describes related editions; its rules should not replace this challenge's instructions.

The saved Challenge 5 submission URL returned PageNotFound during a signed-in browser check on 28 October. Current eligibility, submission availability and score remain unverified. The observed 25 October result was 96.64/100, rank 67/51,309; it is historical. The repository's 10 MB/video requirements came from the owner's submission screenshot, not independently readable public portal rules.

## Evidence against the challenge brief and submission materials

The owner-provided brief names weddings, birthdays and community events, with budgets, timelines, vendor checklists and personalized ideas. The much longer master build prompt adds implementation and evaluation requirements; those additions are not established official scoring criteria.

| Requirement or material | Evidence | Limit |
| --- | --- | --- |
| Three event types and four planning sections | [README walkthrough](../README.md), [domain code](../lib/domain), [browser tests](../tests), [release report](../reports/code-quality-revision.json) | Recorded 25 October checks; test counts alone do not establish every behavior |
| GenAI integration and safe fallback | [Live smoke](../reports/live-submission-smoke.json), [AI usage](../AI_USAGE.md), [evaluation methods](../EVALUATION.md) | One live generation; no measured live quality distribution |
| Public code and live preview | [Repository](https://github.com/9059Rohith/celebrate-ai-event-planner), [app](https://celebrate-ai-event-planner.vercel.app/) | A moving deployment alias needs fresh verification after changes |
| Narrative and demo | [Submission links](../SUBMISSION.md) include the selected LinkedIn post and Drive recording | Drive access was verified 25 October; current narrative-content compliance is not established by the presence of a link |
| Size and portal status | Approximately 9.17 MB tracked source; dated first-attempt result in [release report](../reports/code-quality-revision.json) | [Earlier readiness snapshot](../reports/submission-readiness.json) predates submission and is historical |

## Additional master-prompt requirements

| Requested evidence | Recorded status | Remaining evidence |
| --- | --- | --- |
| Reproducible dataset and deterministic checks | [28 October offline run](../reports/mock-hardening-2026-10-28.json): 46/46 passed, zero model calls; [historical dashboard snapshot](../evals/results/latest.json) remains dated separately | Offline checks do not establish live model quality |
| Live judges, two prompt versions and calibration | Tooling exists; [evaluation documentation](../EVALUATION.md) labels live results unmeasured | Actual live prompt comparison, repeated judgments and independently human-labeled anchors; the historical engine comparison is not a prompt experiment |
| Domain ≥90%, library ≥80%, overall ≥75% coverage | 28 October library coverage: statements 92.06%, branches 85.33%, functions 93.00%, lines 94.08%; domain lines 98.17% | Whole-application coverage is not established by `lib/**/*.ts` coverage |
| Mobile Lighthouse ≥90 on both entry routes | Historical 22 October home/intake medians 90/85 | Intake missed the target; new deployment needs its own audit |
| Latency and responsiveness targets | October 25 navigation timing retained all samples; strict gate failed in both browsers | Representative live p95, chat first-token, skeleton and interaction timing evidence; one SSE result cannot establish p95 |
| Passing checks and CI | 28 October: 157 local tests across 24 files and TypeScript passed; 20 fresh browser checks, build, lint and bundle checks also passed | Fresh lint/build/bundle and 20 browser checks passed; deployment and health verified; timing/recovery documented; hosted October 25 CI executed zero steps because of a reported billing lock |
| Security and accessibility | 28 October full dependency audit: zero findings; [threat model](../SECURITY.md), boundary tests and adversarial cases; earlier automated browser checks are historical | All 20 fresh desktop/mobile browser checks passed; no universal accessibility or security certification |

The 28 October regression work addresses late AI updates after edits, undo revisions, dismissed proposals, bounded LZ decompression, SSE cleanup and feedback storage/hydration. It responds to concrete reliability risks without assuming unpublished evaluator weights. Keep historical reports intact, publish one dated release summary, and tie future measurements to their code commit and deployment. Code Quality (88) remains the weakest category in the historical first-attempt result; no revised competition score is established.
