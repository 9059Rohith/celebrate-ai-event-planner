# Security and privacy

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

Upstash REST is optional; shared atomic sliding windows and token counters operate only when configured. Memory fallback cannot coordinate independent serverless processes. The only outbound server services are OpenAI and configured Upstash; user URLs are never fetched. Styles permit unsafe-inline for dynamic layout/chart styles; scripts require a nonce. Production dependency audit is clean; development-tool advisories are tracked separately and not represented as a clean full dependency audit.

The deployment is not a substitute for independent penetration testing or a guarantee against every unknown vulnerability. Model-generated estimates should be checked with local vendors. No model can guarantee allergy safety; confirm preparation with the caterer.
