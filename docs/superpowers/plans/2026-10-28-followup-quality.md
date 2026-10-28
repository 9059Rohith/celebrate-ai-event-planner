# Follow-up quality plan

The owner reports a new score of 96.99 and two additional attempts. The saved results URL currently returns Page Not Found, so the new category breakdown is not independently verified. This work targets reproduced defects rather than claiming an evaluator score.

## Bounded implementation

- [x] Reproduce request-body reader leaks, blocked reads after abort, and cleanup errors hiding HTTP 413; add abort-aware cancellation and unconditional reader release.
- [x] Derive budget warnings from retained allocations after guest/total/contingency edits; share the calculation across UI and chat.
- [x] Use one calendar-day policy for generated tasks and chat task changes near the India midnight boundary.
- [x] Preserve existing plan edits when retrying AI, with an explicit revision-bound preview and atomic undoable acceptance.
- [x] Bind evaluation evidence to its actual run so a new live result cannot display an older static case.
- [x] Independent review, focused regression tests, full local checks, browser flows, source/secret/dependency checks.
- [x] Publish to the existing public repository, deploy the same Vercel project, and report fresh production results without discarding outliers.

No paid runtime model calls, fabricated score/ranking, final competition submission, or unrelated rewrite. Historical raw evidence is losslessly compressed with hashes in `reports/archived-evidence.json` to retain the source-size limit.

## References

Request lifecycle work follows [ReadableStream cancellation](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/cancel) and [reader lock release](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/releaseLock). The installed Next.js package has no bundled `dist/docs` directory; the previous [versioned Next 15 client/server guide](https://nextjs.org/docs/15/app/getting-started/server-and-client-components) remains the framework reference. Production changes retain the existing Next 15 architecture.


Published code: bf0ac16e2c5b2bcc5309b031c0833f85d8aee2ce. Deployment: dpl_3ekprzzDijsHMC9Sm1M7UeQRqnnE. All 277 tests, 24 browser checks and 46 offline cases passed. Production retained 68 visits; 60 loads below two seconds, 0 runtime/hydration errors; strict gate failed. No additional paid runtime calls or portal submission. Hosted CI ran no steps because of the owner-account billing lock.
