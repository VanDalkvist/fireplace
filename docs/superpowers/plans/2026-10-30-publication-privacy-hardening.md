# Publication Privacy Hardening — Implementation Plan

**Goal:** stop speech and provider response bodies entering diagnostics; document the actual demo/local data flow and distribution limits before publication.
**Approval:** user approved the four audit priorities in the current BB conversation on 2026-10-30. This is their bounded implementation, not a new feature design.
**Baseline:** main at `29660ab`; pre-existing uncommitted demo shuffle changes in `src/hooks/useSalonSession.ts` are excluded from this work and must remain byte-identical.

## Requirements / acceptance
- Diagnostic records contain only allowlisted technical events/fields. Neither recognized speech, arbitrary error bodies/messages/stacks, nor free-form client submissions may reach console, fetch, sendBeacon or server stdout.
- Successful recognition still delivers the exact recognized text to the application callback; only diagnostics change.
- Error responses still report a useful status without echoing remote body contents.
- Static demo and visual/audio behavior remain unchanged. No new speech capture or external service.
- README names Vanya Afanasov as author, links his requested landing page, explains `?demo=1`, local setup, network providers and localStorage/export truthfully.
- Root MIT license covers original code only; bundled third-party assets retain their own terms. Unverified redistribution rights remain an explicit publication blocker, never silently relicensed.
- GitHub cached-object risk was explicitly waived by the user later in the same conversation: do not contact Support or block publication on server caches. MIT attribution means retaining the author's copyright notice and license, not a mandatory UI backlink. Third-party deletion/history rewrite needs its own exact-scope confirmation; do not assume redistribution permission.

## Architecture Context Map
- Stage: mvp; frontend React/Canvas plus local Vite development middleware.
- Gates: AP-017/AP-024 data minimization, AP-026 runtime DTO boundary, AP-012/AP-022 errors, AP-023 bounded async, AP-019 <=250 lines per changed/new file, AP-028/AP-029 deterministic tests and strict TS.
- Infrastructure owns log transport; a small pure shared technical-log DTO validator is used by both browser and Vite endpoint. Server never trusts the client sanitizer.
- Database/migration/distributed-auth rules are not applicable. Existing unrelated deviations are not expanded into a refactor.

## Slice 1 — Privacy-safe logging (author worker)
- [ ] RED: add synthetic sentinel tests for console, fetch and sendBeacon; ASR success callback; HTTP and network error diagnostics; direct malicious `/api/client-log` submissions.
- [ ] Confirm expected failures before production edits; save red evidence outside the repo.
- [ ] Add typed technical event/field allowlist with runtime validation; migrate existing logger call sites. Drop free-form message/details/error objects rather than attempt unreliable phrase regex redaction.
- [ ] Remove response-body content from ASR thrown/logged errors; avoid logging original network exceptions. Keep status/size/provider enums where safe.
- [ ] Extract validated bounded client-log server handler from Vite config; reject malformed/oversized input without reflecting its content.
- [ ] GREEN: run focused tests and typecheck, then report owned files and evidence. No commit/push by author.

## Slice 1b — Adjacent privacy sinks (parent, disjoint ownership)
- [ ] RED: sentinel-in-error tests for `src/infrastructure/ollama-client.ts`, `openrouter-distiller-adapter.ts` and malformed `salon-persistence.ts` data.
- [ ] Replace direct logging of arbitrary exception objects with fixed structured technical events; preserve return/error behavior and session storage contents.
- [ ] GREEN: focused tests show no private marker in browser console. Do not change storage retention or delete user data.

## Slice 2 — Distribution documentation (parent)
- [ ] Verify source facts in code and current notices. Rewrite README; add original-code MIT LICENSE and explicit third-party distribution inventory.
- [ ] Do not remove vendor/upstream or assume permission. Record missing licensing confirmation and draft the precise approval question for later user-controlled contact.
- [x] Prepared GitHub support draft without transmitting private analysis; user subsequently waived the cache-cleanup requirement. Do not send it.
- [x] Rechecked orphan object availability without logging contents; owner accepted that residual risk.

## Slice 3 — Independent acceptance and delivery
- [ ] Architecture reviewer reads the mandatory review skills and checks only the approved touched scope; returns evidence-ranked findings and Architecture verification.
- [ ] Separate builder runs full tests, typecheck and build with bounded commands and saved reports. Black-box smoke covers valid, empty and malicious logger requests.
- [ ] Fix any scoped P0/P1/P2 findings, reverify, append outcome to existing review ledger and memory.
- [ ] Mechanical committer stages only owned files after review/build and preserves the pre-existing demo WIP. Verify private visibility then commit and push; do not move the existing release tag.
- [ ] Final response separates implemented fixes from remaining licensing blockers; GitHub cache cleanup is no longer a blocker because the owner explicitly waived it.
