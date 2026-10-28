# Security and privacy

**28 October 2026 local verification:** after updating Vitest and coverage to 4.1.12, the full `npm audit` reported **zero findings across runtime and development dependencies**. The earlier five development-only findings below are historical, not current. The local suite passed 157 tests across 24 files and strict TypeScript passed. Regression coverage includes bounded LZ decompression, SSE cleanup, stale AI edits, undo revisions, dismissed proposals and feedback storage/hydration. The offline evaluation passed 46/46 with zero model calls. See [the hardening summary](reports/submission-hardening-2026-10-28.json). Lint, production build, bundle/secret checks and all 20 desktop/mobile browser checks passed. The same Vercel URL is deployed and health-checked; live timing and audit-recovery details are in the hardening summary; a clean dependency audit does not certify all application security properties.

| Asset | Threat | Mitigation | Evidence |
| --- | --- | --- | --- |
| API key | Browser/log disclosure | Server-only runtime guard; no raw provider errors; client-source/bundle scanning | domain secret-boundary test; audit:bundle |
| AI output | Injection, unsafe advice, fabricated contacts | Data delimiters, moderation, PII scrub, output filters, deterministic safety rules | backend/MSW/adversarial eval |
| Plan integrity | Prompt-driven mutation | Strict typed tool args, client confirmation, invariant validation, persisted decisions, undo | component/integration tests |
| Budget | Rounding/locked line corruption | Whole-unit bounded distribution; infeasible edits rejected atomically | property/exhaustive domain tests |
| Public endpoints | CSRF and abuse | Same-origin/Sec-Fetch-Site; UTF832KB cap; per-route hashed IP sliding windows; Retry-After | API boundary tests |
| Browser | XSS/clickjacking | Per-request nonce CSP, strict-dynamic, no raw HTML, safe Markdown/HTTPS links, HSTS, frame/permissions restrictions | middleware; live header checks |
| Shared data | Invalid/large payloads | Fragment only;64KB compressed/256KB decompressed limits; full Zod validation; read-only viewer | share/readonly tests |
| Local plans | Corrupt schema/quota/late stream | Validated migration, storage notices, JSON backups, edit/version guards | client/integration/e2e tests |
| AI spending | Unbounded calls | Timeout, abort, single repair, deduplication, bounded retries, daily token reservation | MSW transport/concurrency tests |

The app has no authentication, real vendor directory, scraped contacts, or default analytics. The privacy page explains device storage, OpenAI processing and optional services. AI cache entries contain sanitized enhancement output, expire after one hour, and use hashed keys. Logs contain request IDs, hashes, model/cost metadata, never raw free text or credentials.

Upstash REST is optional; shared atomic sliding windows and token counters operate only when configured. Memory fallback cannot coordinate independent serverless processes. The only outbound server services are OpenAI and configured Upstash; user URLs are never fetched. Styles permit unsafe-inline for dynamic layout/chart styles; scripts require a nonce. The 25 October release audit recorded zero runtime dependency findings; development-tool advisories were tracked separately and this was not a clean full dependency audit. Later dependency changes require a new audit.

The deployment is not a substitute for independent penetration testing or a guarantee against every unknown vulnerability. Model-generated estimates should be checked with local vendors. No model can guarantee allergy safety; confirm preparation with the caterer.

22 October hardening: rejected memory-rate-limit requests cannot grow histories or extend lockouts; memory counters have a 10,000-client bound and expire before admitting replacements. RATE_LIMIT_PER_MIN caps both Redis and memory paths. Each structured provider attempt, including repair, reserves its own input/output token allowance. Regression tests exercise these limits.

Recorded release dependency status, 25 October 2026: Vitest and coverage were upgraded to 4.1.11. The runtime dependency audit reported zero findings. Five high-severity development-only findings were recorded in the unpatched braces/fast-glob/micromatch lint dependency chain (GHSA-vfj7-8cjw-p6xm). No incompatible package substitution was used to hide the finding. These tools are not deployed application request handlers; avoid processing untrusted glob patterns and track the upstream patch. See [the release evidence](reports/code-quality-revision.json); these historical results do not certify the current dependency tree.
