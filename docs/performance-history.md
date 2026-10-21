## Performance verification

The latest deployed mobile LCP measurements are in `reports/performance-live.json`: three cache-reset Lighthouse runs per route using the default mobile settings. Reproduce with `node scripts/performance.mjs`. Final medians: home1.086s, wizard0.934s; all six LCP samples below2s, CLS0. Navigation load-event timings are also recorded, including an outlier; LCP does not mean every background request has completed.

Styles are split by surface and delivered using standard Next.js stylesheet links. Experimental inline CSS was removed during hydration hardening. The wizard defers generation engines and workspace code; the landing page uses native navigation and SVG symbols to reduce startup work. No security headers were relaxed.

## Complete page-load verification

Page shells now render on Edge to remove Node startup from their request path while retaining per-response CSP nonces. AI/API routes explicitly retain Node.js in Mumbai. Evaluation snapshots are compact at initial render; individual full case evidence loads when opened. `npm run build` regenerates summaries and evidence files from the source evaluation results.

`node scripts/full-load.mjs` measures six entry routes with a fresh context/cache per visit; `node scripts/workspace-load.mjs` covers saved and populated shared plans. The previous 48 actual navigation-load samples were all under2 seconds (maximum1.921s); workspace heading readiness was at most1.497s. These are unthrottled laboratory observations, not a guarantee across devices/networks or AI completion times. One recoverable React hydration warning in a shared-plan sample is retained in the report; that sample still loaded in0.770s. See `reports/full-load-summary.json`.

## Shared-page hydration follow-up

The shared page uses a stable server snapshot inside its Suspense boundary and reads the URL fragment after hydration through `useSyncExternalStore`. It subscribes to hash changes, preserving read-only behavior when switching shared links. Experimental CSS inlining was removed.

Final verification:97 unit/API/integration tests and16 desktop/mobile browser tests passed. Across68 live fresh-context navigations there were no recorded hydration warnings; all32 shared-page loads were under2 seconds (maximum1.227s; populated shared-page heading readiness maximum1.462s). Two broader navigation samples exceeded2 seconds: home2.065s and evaluations5.855s. The evaluation outlier had0.710s DNS,0.334s connection setup,0.066s HTML request wait and up to4.479s static-resource download. The strict all-app2-second criterion was not achieved in this run. No samples were excluded; see `reports/full-load-summary.json`.

## Home and evaluation performance follow-up

Restored default metadata streaming instead of treating every browser as an HTML-limited bot. Evaluation case bodies render on expansion; all case summaries and evidence remain available. The home collection import starts within160px of the viewport instead of600px.

Latest deployment measurement:65/68 full-page loads under2s, no hydration warnings. Median and p95 values are in `reports/full-load-summary.json`. All six evaluation-page loads were under2s (maximum1.278s); five of six home loads were below2s. The5.373s first home load spent2.975s before HTTP request start, then59ms waiting for its HTML response. Two additional shared stress-test loads took3.459s and2.609s, with HTML response waits47ms and84ms. The strict all-loads target was not achieved; no slower samples were discarded.97 unit/API/integration and16 browser tests passed.

## Latest release audit: target still unmet

Production was redeployed to the same alias (deployment `dpl_BC5jABwaTog4Nev5r3BH6MyVzaNc`). `npm run deploy:production` now follows deployment with explicit server/CDN warmup of six shells and their critical static assets. This does not populate browser caches or prove that network outliers are eliminated.

The final 68 fresh-context Microsoft Edge 155 desktop/mobile-emulation measurements after warmup recorded 67 loads below two seconds, median 0.685s, p95 1.208s, maximum 2.474s; heading readiness peaked at 2.610s. Two visits reported recoverable React #418 hydration errors. All measured home and evaluation loads in this batch were below two seconds. The strict all-pages/error-free gate remains failed. See `reports/postwarm-verification.json` and its raw source reports. Earlier Chromium startup/transport outliers and the pre-warmup Edge 2.043s visit remain recorded separately; browser choice and warmup conditions must accompany any performance claim.

The three audit scripts accept `BROWSER_CHANNEL` (default bundled Chromium) and `PERF_PHASE` (separate report names), record the browser version, and exit nonzero for errors or loads at/above two seconds. Workspace/shared checks also reject heading readiness at/above two seconds. Browser emulation is not an actual iPhone/Safari measurement. No application source changes were made in this release audit; the new warmup is an operational mitigation, not a confirmed fix for the remaining hydration or transport variability.

## Route hydration replay fix

Production debugging captured React trying to hydrate the existing `main#main-content` against a comment inside that same element, after its Flight child resolved during a concurrent replay. This matches [React issue 37584](https://github.com/react/react/issues/37584). `RouteContent` now resolves the Flight child on a component fiber, keeping the parent host hydration cursor intact. It adds no DOM wrapper and does not suppress errors. A regression test using Next's vendored renderer failed with the original tree and now verifies that hydration preserves both original DOM nodes.

Deployment `dpl_5iAVXTKQ8nybyvyvvHSNhzM19oqN` is live on the same production alias. Build, 98 unit/integration tests, 16 local browser tests, and four live desktop/mobile interaction checks passed. The live checks cover evaluation evidence, shared plans with persisted preferences, budget navigation, and fragment changes.

The complete 68-visit fresh-cache Edge audit recorded zero hydration errors, median 0.701s and p95 1.003s. All entry-page and saved-workspace measurements were below two seconds. One populated shared-plan load took 4.830s (heading ready 4.916s): its HTML wait was 74ms, while several static script transfers took approximately 4.5s. Thus 67/68 loads passed and the strict all-loads-under-two-seconds gate still failed. The prior reports are retained; this is not a claim that all transfer outliers have been fixed. See `reports/route-boundary-verification.json` and its three raw reports for conditions, route maxima, and the retained failure.

## Stable release and verified CDN warmup

The production alias was subsequently replaced by a Git-triggered deployment (`dpl_Gy6tVgbSvtqadu2YM1msxWsVKpmu`), distinct from the deployment measured above. Its first browser script requests were CDN misses. Publish source changes **before** the final production deployment. A later Git push can deploy again and invalidate the warmup/measurement association.

`npm run deploy:production` now warms the critical assets, verifies a second request is a CDN `HIT` for every asset, and checks that the production asset fingerprint stayed unchanged. This warms server/CDN state only; it never warms a browser profile. `npm run verify:production` then checks that the current fingerprint matches the verified warmup, runs all three existing fresh-context audits without retries, and checks the fingerprint again afterward. It fails for deployment changes, cache misses during warmup, hydration/runtime errors, missing samples, or any page load/heading readiness at or above two seconds. Reports retain slow visits and failed commands.

To use Edge explicitly, set `BROWSER_CHANNEL=msedge` before verification; the default remains bundled Chromium and every raw report records the browser/version. Set `PERF_PHASE` to name the report batch and `DEPLOYMENT_ID` to record the deployment returned by the release command. The combined result is saved as `reports/verification-<phase>.json`. A measured pass applies to the recorded browser/network/CDN conditions, not arbitrary network delays or every device.

