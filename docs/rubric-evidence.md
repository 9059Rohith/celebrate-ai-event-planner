# Requirements and evidence map

Research and latest local verification date: **28 October 2026**. **298/298 tests across 42 files**, **26/26 desktop/mobile browser checks**, strict TypeScript, lint/formatting, production build and bundle/secret checks passed. The full dependency audit reports zero findings. Whole-application line coverage is **82.96%**, library line coverage **94.83%**, and domain line coverage **98.35%**. The strengthened offline evaluation passes **46/46 cases with zero model calls**. See [the follow-up quality report](../reports/submission-portability-2026-10-28.json). Production verification for this portability revision is pending. This document maps evidence and does not predict a score.

## Official guidance and unresolved wording

The [official PromptWars Virtual page](https://promptwars.in/promptwarsVirtual.html) links registration to this event: [pwvirtual1](https://hack2skill.com/event/pwvirtual1/registration). It calls for code, a live preview and a narrative. Its duplicate submission sections differ: one specifies LinkedIn; another adds a technical blog; the FAQ describes a blog or article. Allowed-tool wording also conflicts: one section permits Antigravity or other AI tools, while another section and the FAQ require Antigravity. The page says selection criteria are confidential. No detailed scoring weights were verified.

Resolve these contradictions against current Challenge 5 portal instructions or organizer clarification before asserting eligibility. Do not infer mandatory Gemini runtime integration, claim unrecorded Antigravity use or guarantee a score. The [Hack2skill community overview](https://hack2skill.com/pw-community/) describes related editions; its rules should not replace this challenge's instructions.

The signed-in Challenge 5 submission page was successfully inspected on 28 October: **96.98/100, rank 53/51,556, attempt 2 of 3**. It displays Code Quality 89, Security 99, Efficiency 100, Testing 99, Accessibility 99 and Problem Statement Alignment 100. Its instructions require a public GitHub repository under 10 MB and an accessible demo video. One attempt remains; the owner controls final submission. The earlier PageNotFound observation was superseded by this successful inspection. No detailed deductions or scoring weights were exposed by the category controls.

## Evidence against the challenge brief and submission materials

The owner-provided brief names weddings, birthdays and community events, with budgets, timelines, vendor checklists and personalized ideas. The much longer master build prompt adds implementation and evaluation requirements; those additions are not established official scoring criteria.

| Requirement or material | Evidence | Limit |
| --- | --- | --- |
| Three event types and four planning sections | [README walkthrough](../README.md), [domain code](../lib/domain), [browser tests](../tests), [release report](../reports/code-quality-revision.json) | Recorded 25 October checks; test counts alone do not establish every behavior |
| GenAI integration and safe fallback | [Live smoke](../reports/live-submission-smoke.json), [AI usage](../AI_USAGE.md), [evaluation methods](../EVALUATION.md) | One live generation; no measured live quality distribution |
| Public code and live preview | [Repository](https://github.com/9059Rohith/celebrate-ai-event-planner), [app](https://celebrate-ai-event-planner.vercel.app/) | A moving deployment alias needs fresh verification after changes |
| Narrative and demo | [Submission links](../SUBMISSION.md) include the selected LinkedIn post and Drive recording | Drive access was verified 25 October; current narrative-content compliance is not established by the presence of a link |
| Size and portal status | Public repository; source size checked before publication; owner reports 96.99 and two additional attempts | New category scores and rank are unverified; owner controls resubmission |

## Additional master-prompt requirements

| Requested evidence | Recorded status | Remaining evidence |
| --- | --- | --- |
| Reproducible dataset and deterministic checks | [28 October offline run](../reports/mock-hardening-2026-10-28.json): 46/46 passed, zero model calls; [historical dashboard snapshot](../evals/results/latest.json) remains dated separately | Offline checks do not establish live model quality |
| Live judges, two prompt versions and calibration | Tooling exists; [evaluation documentation](../EVALUATION.md) labels live results unmeasured | Actual live prompt comparison, repeated judgments and independently human-labeled anchors; the historical engine comparison is not a prompt experiment |
| Domain ≥90%, library ≥80%, overall ≥75% coverage | Overall lines 82.96%, library lines 94.83%, domain lines 98.35%; all configured gates pass | Overall 80% gate is lines only; library/domain gates cover all four metrics |
| Mobile Lighthouse ≥90 on both entry routes | Historical 22 October home/intake medians 90/85 | Intake missed the target; new deployment needs its own audit |
| Latency and responsiveness targets | October 25 navigation timing retained all samples; strict gate failed in both browsers | Representative live p95, chat first-token, skeleton and interaction timing evidence; one SSE result cannot establish p95 |
| Passing checks and CI | 298 tests, 26 desktop/mobile flows, build, lint, typecheck, offline evaluation and bundle checks pass locally | Hosted CI was blocked before execution by owner-account billing; no hosted green result claimed |
| Security and accessibility | 28 October full dependency audit: zero findings; [threat model](../SECURITY.md), boundary tests and adversarial cases; earlier automated browser checks are historical | All 20 fresh desktop/mobile browser checks passed; no universal accessibility or security certification |

The 28 October regression work addresses late AI updates after edits, undo revisions, dismissed proposals, bounded LZ decompression, SSE cleanup and feedback storage/hydration. It responds to concrete reliability risks without assuming unpublished evaluator weights. Keep historical reports intact, publish one dated release summary, and tie future measurements to their code commit and deployment. Code Quality (88) remains the weakest category in the historical first-attempt result; no revised competition score is established.
