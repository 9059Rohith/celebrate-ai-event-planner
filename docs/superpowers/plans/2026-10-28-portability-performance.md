# Portable-plan integrity and saved-page performance

The owner requests further substantive quality improvements after reporting 96.99. No new score, current category breakdown or rank has been independently verified. The owner will provide portal updates and controls resubmission.

- [x] Trace saved-route bundle dependencies: the current rendered HTML loads 182,982 gzip bytes of modern JavaScript, including fallback templates through a mixed client/server snapshot helper.
- [x] Separate pure browser snapshot serialization from server-side reconstruction without changing the wire payload; independently review the type-only boundary.
- [x] Reproduce the overview's UTC/India midnight countdown mismatch; use the common planning date and clear today/past/singular labels.
- [x] Reject ambiguous row identifiers and inconsistent imported monetary data through one lightweight parser shared by JSON import, fragment decoding and stored-plan validation; preserve valid overdue plans.
- [x] Confirm saved/shared route budgets from actual built HTML, run full local checks and browser import/retry workflows.
- [x] Push verified code, deploy the same Vercel project and retain all fresh production timing/hydration samples.

Framework guidance: the installed Next 15.5.28 package has no `dist/docs` directory. The official [Next 15 client/server boundary guide](https://nextjs.org/docs/15/app/getting-started/server-and-client-components) and [nonce CSP guide](https://nextjs.org/docs/15/app/guides/content-security-policy) were consulted. This change preserves nonce-protected dynamic rendering; it does not weaken CSP to cache HTML.

No paid runtime provider calls, fabricated score claims, discarded timing outliers or competition submission. Historical raw reports remain recoverable through their gzip archive index.


Published source 5a53b1122facc6196a77bafb4427930c9cb3f8d5; deployment dpl_J5a7LdcWbbxVBDvUjuLigziN31Ab. Local checks: 298 tests, 26 browser checks, 46 offline cases, 82.96% application lines. Production: 62/68 loads below two seconds, 0 runtime/hydration errors, strict gate failed. Hosted CI blocked before execution by account billing. No paid runtime calls or resubmission.
