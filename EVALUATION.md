# Evaluation evidence and reproduction

**28 October local verification:** [the fresh offline run](reports/mock-hardening-2026-10-28.json) passed **46/46 cases with zero model calls**. Vitest and coverage 4.1.12 passed 157 tests across 24 files; strict TypeScript passed. Library coverage is statements 92.06%, branches 85.33%, functions 93.00% and lines 94.08%; domain lines are 98.17%. The full dependency audit reported zero findings. See the [hardening summary](reports/submission-hardening-2026-10-28.json). Lint, production build, bundle/secret checks and all 20 desktop/mobile browser checks passed. The same Vercel URL is deployed and health-checked; live timing and audit-recovery details are in the hardening summary; no new live AI quality result is claimed.

**Recorded offline evaluations:** the 22 October `--mock` run passed **46/46 cases (100% case pass rate)** in [this report](reports/mock-submission-check.json). The 25 October release rerun also passed 46/46, as recorded in [the revision report](reports/code-quality-revision.json). Reproduce without an API key using `npm run eval -- --suite=all --mock --out=test-results/submission-mock.json`. This executes the real deterministic engine. These dated results do not verify later local changes.

This percentage measures the recorded deterministic cases only. Live model quality, live judge scores, overall submission compliance and competition placement are not established by mocked/offline results.

The committed `evals/results/latest.json` is an actual offline deterministic run, performed 22 October 2026 (IST). It contains every input, output and check rationale. It is not a live model benchmark. `GET /api/eval` exposes this public, synthetic snapshot; `/evals` shows metric pass rates, timing, tokens, costs, failure drill-down and device-local human feedback. A protected mini evaluation updates the dashboard with its response.

## Historical engine comparison — 22 October 2026 (IST)

| Check | Pre-fix engine baseline (v1 label) | Hardened engine candidate (v2 label) |
|---|---:|---:|
| Cases passing | 36/46 | 46/46 |
| Schema validity | 100% | 100% |
| Budget integrity | 97.83% | 100% |
| Timeline graph/date validity | 100% | 100% |
| Dietary compliance | 95.65% | 100% |
| Constraints and expected warnings | 84.78% | 100% |
| Injection/PII safety | 93.48% | 100% |
| Contact hallucination heuristic | 97.83% | 100% |
| Fallback schema correctness | 100% | 100% |
| Completion p95, local engine | 1.44 ms | 4.44 ms |
| Model tokens / estimated API cost | 0 / $0 | 0 / $0 |
| Live subjective judge | Not run | Not run |

Saved baseline `v1.json` was run before domain fixes, and candidate `latest.json` after fixes. They also record requested prompt-version labels. **Both offline runs use the deterministic engine**, so the changes establish improvements to fallback behavior, not causal improvements to the LLM prompts. Latencies are local measurements with a small sample and concurrent work in the workspace; no transport or production latency conclusion follows.

Failure analysis found echoed adversarial notes/PII, forbidden ice cream in vegan menus, omitted must-haves, missing conflict warnings and rounded per-guest arithmetic. The domain now sanitizes untrusted notes, filters diets, preserves safe must-haves, warns on conflicting constraints and retains precise per-guest amounts. The saved baseline preserves the actual failures rather than rewriting history. Backend prompts v1/v2 separately add explicit input isolation, grounded identifiers, estimates and constraint checks. The comparison delta is saved in `latest.comparison.json`.

## Dataset and checks

`datasets/golden.jsonl` has 46 schema-validated distinct cases generated from `dataset.ts`: 14 weddings, 12 birthdays, 12 community events, plus 8 adversarial cases. Every row carries tags and expectations. Coverage includes single/multi-day/destination/interfaith weddings, Jain/vegan/halal diets, ages 1/8/18/30/60, surprise/low-budget birthdays, festivals/fundraisers/sports/clean-up/tech events, injection canaries, absurd budgets, conflicting diet/must-have, past dates, 5,000 guests outdoors during monsoon, skipping fire permits, PII and multilingual toxic notes. Four currencies and four cities are represented.

Checks inspect output sections without counting the echoed input as satisfaction. Budget uses integer-cent totals including contingency, original budget equality, percentage bounds and per-guest arithmetic. Timeline checks unique IDs, real dependency edges, DFS cycles, edge ordering, a must-do path, dates, horizon and time syntax. Diet scans menu suggestions conservatively; fuzzy token matching checks must-haves, avoid lists and expected warnings. Safety detects injection canaries, prompt fragments, key patterns and fixture PII. Contact heuristics reject URLs, emails, phone patterns and several real business names. This cannot exhaustively detect every fictional business, semantic diet violation, or culturally inappropriate idea. These limitations require live and human review.

Schema metric is the final public PlanSchema output. Provider metadata now records first-attempt validity, whether repair was attempted, and observed repair validity. The dashboard aggregates these separately and excludes cached/offline outputs. The current offline run has zero provider observations, so both rates are null / Not measured. Fallback validity checks fallback outputs. Skeleton creation and complete generation are timed with performance.now; HTTP TTFB is null because the harness invokes functions directly. No fictitious TTFB is substituted. Thresholds require schema >=98%, exact budgets, dietary/safety/fallback/timeline/constraints/contact checks 100%, live p95 <=12 seconds, judge mean >=4 overall and >=3.5 per rubric when a judge actually runs. Offline judge is skipped, not scored.

## Commands

```sh
npm run eval -- --mock --suite=all
npm run eval -- --mock --suite=adversarial --concurrency=4
npm run eval -- --mock --prompt-version=v1 --out=evals/results/baseline.json
npm run eval -- --mock --prompt-version=v2 --out=evals/results/candidate.json --compare=evals/results/baseline.json
npm run eval -- --suite=all --limit=5 --model=gpt-4o-mini --concurrency=2 --max-usd=2 --out=evals/results/live.json
npm run eval -- --suite=judge --limit=5 --max-usd=2 --out=evals/results/judge.json
npm run eval -- --suite=deterministic --limit=5 --out=evals/results/live.json --resume
npm run eval -- --pairwise --limit=2 --max-usd=2 --out=evals/results/pairwise-live.json
```

Live mode requires server `OPENAI_API_KEY`; absent credentials fail clearly. `--mock` executes the real deterministic engine; it does not invent recorded model responses. Suites: deterministic = checks on generated output, judge/all = checks plus live judging when not mock, adversarial = edge-case subset. All support limit, model, concurrency 1–16, out, max-usd and prompt-version v1/v2. Partial progress checkpoints after each case; `--resume` skips saved case IDs after model/version validation. Use a fresh output file when changing dataset, suite or configuration. Threshold failure or incomplete/capped regular runs exit nonzero. Costs use explicit configurable model price assumptions in `judge.ts`, not an assertion of current provider billing; unknown generator pricing is rejected for live runs. Every call group reserves a conservative upper bound before dispatch ($0.15 generation or $0.60 generation+twice-judge, $0.70 pairwise); a cap may therefore stop well before actual spend reaches it. Provider-side moderation, failed attempts and retries may have usage not reported in plan metadata; monetary estimates are not a provider billing ledger. Review provider usage before scaling. Tiny caps can dispatch zero cases.

## Live judging and pairwise bias controls

`judge.ts` and `rubrics/v2.md` define seven 1–5 rubrics: personalization, actionability, budget realism, cultural sensitivity, completeness, creativity and safety. Temperature is zero, JSON is validated, model/prompt identity is removed, length is explicitly not rewarded. Six **provisional author-labelled rubric anchors** are included. They have not been independently annotated or empirically calibrated. The live judging implementation judges each output twice and reports agreement within one score point. Pairwise first position is randomized and then swapped; disagreements and both rationales are retained. Offline `pairwise.json` explicitly records not-run, with no fabricated winners. Production generation was verified separately on 25 October; live judging and pairwise quality evaluation have not been run, so no live quality scores, human/judge agreement or A/B model preference is claimed.

Mini evaluation requires `EVAL_SECRET` in a transient password field. The field is cleared and never stored. Constant-time secret comparison, same-origin checking and two requests/minute rate limiting protect the route. Five generation cases run with up to three workers; with no AI key it explicitly returns offline output. It performs deterministic checks on live outputs without additional judge cost, and retains each output's source (`hybrid` or fallback). Failed upstream calls can still return fallback and are never described as successfully measured AI quality.

Human thumbs and reasons are read only from `celebrate-feedback` localStorage on this device and exportable as JSON. They are a convenience sample, not a representative human evaluation study. No feedback is transmitted by the dashboard.

Historical validation recorded five engine tests in `tests/eval.test.ts`, including coverage distribution, budget corruption, dependency-cycle mutation, diet/canary detection and resume honesty. `tests/eval-api.test.ts` also covers secret/origin/rate-limit and live/offline routing. The 25 October release report records 135 tests; the 28 October local suite passed 157 tests across 24 files, adding coverage for late AI updates, undo revisions, dismissed proposals, bounded LZ decompression, SSE cleanup and feedback storage/hydration. Run `npm run typecheck`, `npm run lint` and the current tests after dependencies are installed.


## Production smoke verification — 25 October 2026

One uncached production generation using gpt-4o-mini returned a schema-valid hybrid plan on its first structured attempt, with no repair: 1,158 input tokens, 880 output tokens, 10.658 s provider orchestration latency and 11.562 s full SSE response time. Estimated model cost: $0.000702. See reports/live-submission-smoke.json. This demonstrates live integration, not a statistically measured model-quality score; judge and A/B measurements remain separate. The app shell and deterministic plan render before enhancement finishes.

## Requirement boundaries

The detailed judge, calibration, prompt-comparison and performance targets come from the owner's master build specification; they are not verified official scoring weights. A single smoke response cannot establish live p95 latency. The stored offline snapshots and MSW transport fixtures do not replace the requested live prompt comparison or independently human-labeled calibration. See [the evidence map](docs/rubric-evidence.md) for the official guidance, its ambiguities and remaining evidence gaps.
