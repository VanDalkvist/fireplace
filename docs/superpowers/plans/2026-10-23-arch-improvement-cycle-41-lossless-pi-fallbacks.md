# Cycle 41 — Lossless Text, Pluggable Pi/Codex, Explicit Fallbacks

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans, test-driven-development, verification-before-completion.

**Goal:** Show complete phrase content in display blocks up to 640px / five lines; add Pi→Codex Luna as a peer distiller plugin; allow failure recovery only through explicitly configured decorators, never fabricated/default content.

**Approval:** User approved the presented design, then required plugin/port architecture and removal of hidden hardcoded adapter fallbacks. User explicitly requested review in this thread (no independent reviewer threads). Browser work remains exclusively isolated Browser Automation.

**Tech stack:** React 19, strict TypeScript, Canvas, Vite, Vitest; server-only Pi ModelRuntime SDK (installed primary API/version 1.3.0 verified from its docs and local upstream source). No coding-agent sessions/tools/MCP for phrase inference.

## S0–S3 / Architecture Context Map and PRD
- Repo `/Users/vanya/Projects/salon-presence`, clean `main`, baseline `2970ecc` (preserve the prior emotion-family fix).
- Domain: pure text layout, phase prompt parsing, distiller/segmenter ports, registry lookup and phrase orchestration. No concrete HTTP/Pi adapter imports in Domain.
- Infrastructure: Ollama/OpenRouter/Pi HTTP leaves and configurable fallback decorators; local Pi SDK server runtime isolated from browser bundle and credentials remain in Pi's existing auth storage.
- Composition root: builds registry/plugins and explicitly declares fallback chains. Inject bound phrase-processing service into the speech hook from SalonExperience.
- UI: existing pult cycles registered distillers; selected provider is not changed automatically. Errors show unavailable compression and the original transcript, not invented emotion tokens.
- Canvas: no network calls. Lossless wrapping and visual overflow blocks; full source text retained for updates/persistence. Expanded line width respects viewport and multi-line collision height.
- Critical gates: AP-010/AP-020 (ports/composition), AP-012/AP-013 (explicit failures/data), AP-017 (credentials/private text), AP-019 (all touched source/tests <=250 lines), AP-021/AP-026 (thin validated server boundary), AP-022/AP-023 (typed causal errors, bounded async), AP-027/AP-028/AP-029 (config/tests/typing), AP-053/AP-054 (React/error UI).
- Source of truth: project AGENTS, existing adapters/registries/tests, `~/Projects/arch-rules/arch-rules.md`, Pi SDK/models/providers/CLI docs and `~/Projects/pi/packages/coding-agent/src/core/model-runtime.ts`.
- Existing lessons: do not lose long-phrase content, do not restore a fabricated semantic fallback, do not let Canvas own session deletion. Preserve Cycle40 reset/reload behavior.

### Required behavior
1. No layout ellipsis or text eviction. Blocks have at most five visual lines and width min(640px, available viewport width). Overflow forms additional ordered display blocks. Long unbroken/Unicode strings also retain all characters.
2. A separate semantic segmentation prompt may suggest exact text fragments via Ollama. Validate full ordered coverage; no paraphrase/missing/duplicated content accepted. An explicitly composed lossless layout segmenter is the configured fallback, not an implicit catch branch.
3. Pi is a plugin implementing the SAME LlmDistillerPort, registered alongside Ollama and OpenRouter. Default Pi model `openai-codex/gpt-6-luna` (chat availability verified with local ModelRuntime); off/minimum supported reasoning and bounded output. Current active distiller stays unchanged.
4. Registry lookup never substitutes first/active provider when a named provider is missing. Configured wrapper chains are the ONLY automatic provider switching mechanism. Default LLM chains contain just the selected provider (no invented fallback order).
5. Explicit STT fallback decorators (existing GigaAM→Whisper composition) remain. Remove implicit registry/provider fallback and endpoint-format retry hidden inside generic ASR client; expose the existing Whisper legacy HTTP shape as configured transport instead.
6. Invalid/missing model output is a failure, not a fabricated phase/emotion/verbatim result. Valid `phrases: []` is intentional suppression and never re-expanded to the raw transcript by token dispatch. Terminal failure visibly reports compression unavailable and retains the source transcript, without dispatching a fake token.

## S4–S5 / Findings and Triage
- [P1] Canvas truncates content with `...` after three lines.
  - Evidence: `src/canvas/text-wrapper.ts:35-47`, explicit truncation expectation in tests/text-wrapper.test.ts.
  - Impact: irreversible omission in user-visible phrase.
  - Rule: AP-013, AP-054. Fix decision: fix-now.
- [P1] Failed adapter/unknown provider silently changes behavior/content.
  - Evidence: `phrase-distiller.ts` active fallback and createFallback; `distiller-registry.ts` first-provider fallback; `token-subsumption.ts` unmatched→settled; speech-factory `get(kind)||getActive()`; ASR client 404→legacy retry.
  - Impact: unconfigured provider, fabricated metadata, suppressed text reappears as if extraction succeeded.
  - Rule: AP-012, AP-013, AP-020. Fix decision: fix-now.
- [P2] Concrete adapter construction occurs in the domain registry.
  - Evidence: domain/distiller-registry.ts imports infrastructure implementations.
  - Impact: adding Pi leaks a server integration into domain/client boundaries.
  - Rule: AP-010, AP-020. Fix decision: fix-now as part of the plugin slice.
- Exclusions: no prompt-content redesign into a new extractive product, no new STT models/services, no speaker-identity policy redesign, no public deployment/account changes, no general cleanup. Prior in-flight phase-race diagnosis remains out of scope unless needed to prevent new async segmentation applying stale work.

## Slice 1 — Lossless Layout and Visual Overflow
**Files:** canvas/text-wrapper.ts; scoped decomposition of hearth-words into types/layout/render modules as needed for AP-019; infrastructure/salon-persistence.ts; tests/text-wrapper.test.ts and a focused visual-word test file.
- [x] RED tests: `blocks.map(b => b.text).join('')` reconstructs normalized source exactly, every block <=5 lines, no appended ellipsis; Unicode/long word; add/update/restore a long token retains all blocks and source identity.
  ```ts
  const wrapped = wrapCanvasText(longText, 640, measure, 5);
  expect(wrapped.blocks.map(b => b.text).join('')).toBe(longText.trim().replace(/\s+/g, ' '));
  expect(wrapped.blocks.every(b => b.lines.length <= 5)).toBe(true);
  ```
- [x] GREEN: pure wrapping returns complete lines plus ordered source-backed blocks. Canvas expands only display items; logical sourceId/sourceText allow stable updates (do not re-add every animation frame). Reuse source text when viewport changes or restoring old truncated cache. Render/collision uses actual multi-line heights; don't evict words to make space.
- [x] Verify targeted Canvas/persistence/reset tests, strict types and <=250 lines per source/test file.

## Slice 2 — Explicit Plugin Composition and Failure Contracts
**Files:** domain/distiller-types.ts, pure domain/distiller-registry.ts, domain/phrase-distiller.ts, prompts/types/parser/strategies, domain/token-subsumption.ts; new composition/distillers.ts and infrastructure/fallback-distiller-adapter.ts; hooks/useSalonSpeech.ts and relevant tests.
- [x] RED: unknown selected engine throws; exhausted adapter chain rejects rather than returning a verbatim feeling; explicitly configured chain runs in order; successful empty output is not retried; malformed output is retried only by wrapper; empty phrase result dispatches nothing.
  ```ts
  await expect(service('test', {engine:'missing'})).rejects.toThrow();
  expect(dispatchEvents).toEqual([]); // no model output => no fabricated token
  ```
- [x] GREEN: typed DistillationError and runtime output parser; concrete composition removed from Domain. FallbackDistillerAdapter is the sole owner of configured LLM retry, including per-request semantic validation. Zero fallback entries by default; no original-text/emotion synthesizer. Remove obsolete createFallback methods and dead lossy splitter.
- [x] Inject composed service in SalonExperience→speech hook. Catch terminal failure at UI boundary, retain original transcript and display safe error; no unhandled async promise or fake circle token.
- [x] RED/GREEN ASR: strict named registry resolution; endpoint protocol selected by the Whisper plugin config, not generic 404 guessing. Existing explicit FallbackSpeechAdapter remains the fallback authority. Remove hardcoded Google→Whisper auto-selection for meeting audio; unsupported engine reports an actionable error and lets the user select an adapter.

## Slice 3 — Pi/Codex Adapter and Server Boundary
**Files:** infrastructure/pi-distiller-adapter.ts; server/pi-runtime.ts and server/pi-plugin.ts; vite.config.ts; config/distiller-config.ts; composition/distillers.ts; hooks/useSalonUiState.ts; components/salon/TechnicalGearPult.tsx; package.json/package-lock.json; focused adapter/server/config tests.
- [x] Verify primary SDK contract before implementing: ModelRuntime.create/getModel/completeSimple, OAuth resolution by the runtime, `reasoning:'minimal'`, AbortSignal; no AgentSession needed.
- [x] RED adapter test checks POST same-origin `/api/pi/complete`, model override, timeout/error propagation, health. Registry/pult test lists and cycles pi as a peer. Server tests validate method, origin, body limits/types, provider/model allowlist, output/abort and sanitized errors using injected runtime.
- [x] Add exact `@earendil-works/pi-coding-agent@1.3.0` server dependency without lifecycle scripts; no token copies or client-side SDK imports.
- [x] GREEN server mapping:
  ```ts
  const model = runtime.getModel('openai-codex', modelId);
  const result = await runtime.completeSimple(model, {
    systemPrompt: request.systemPrompt,
    messages: [{role:'user', content:request.prompt, timestamp:Date.now()}],
  }, {reasoning:'minimal', maxTokens:request.maxTokens, signal});
  ```
  Runtime is lazy/shared, contexts stateless per request, no tools/resources/session files. Routes are thin DTO/security/limits→runtime→allowlisted response. SDK is never reachable from the browser dependency graph.
- [x] Config includes Pi model/baseUrl/timeout, centralized engine IDs and explicit fallback-chain config; UI toggle iterates registry, not a two-provider conditional. URL/storage selection validated rather than silently remapped.
- [x] Synthetic real Luna request through Browser Automation confirms integration and actual latency; auth/quota errors are reported honestly, no hidden provider replacement.

## Slice 4 — Explicit Semantic Splitter Composition
**Files:** domain/phrase-segmenter.ts (port and exact coverage validator); infrastructure/ollama-phrase-segmenter.ts; infrastructure/lossless-phrase-segmenter.ts; infrastructure/fallback-phrase-segmenter.ts; composition/distillers.ts; config and tests.
- [x] RED: `parts.join(' ')` matches normalized source; hallucinations, omissions, duplicates and reordering are rejected. Local deterministic plugin preserves punctuation and original text. Configured chain only, unknown segmenter fails fast.
- [x] GREEN: separate Ollama prompt returns only exact ordered fragments, never summarizes/rewrites. Segmenter decorator tries the explicitly configured next plugin on error/invalid coverage; default `['ollama','lossless']` is declared in composition config. All-segmenters failure is a typed error. Only long extracted phrases use the segmenter; Canvas independently supports lossless overflow and does no I/O.

## S7 / Critical Plan Review
- User-approved design and fallback correction govern all slices. Full-text retention beats shrinking/ellipsis; no ad hoc catch can synthesize content. Explicit lossless segmenter is formatting, not a pretend LLM response. Intentional empty semantic output is distinct from adapter failure.
- Scope decomposition is necessary because current hearth-words.ts has 247 lines and cannot grow safely; new modules are bounded by visual layout/render responsibilities, not generic utils.
- Public transport DTOs cannot contain callback validators; validator stays in the local decorator invocation, not serialized to Pi/OpenRouter.
- Test imports/config references must migrate with the moved composition root; preserve earlier Cycle40 behavior.

## S9–S12 / Acceptance, Review, Receipts
- [x] Full `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`, touched-source line budgets and dependency direction review.
- [x] Browser Automation ONLY, fresh headless session, mock shared speaker `/reset`, never live user tabs/mic. Verify pult registration/selection, long phrase ending visible/no ellipsis/all text retained, overflow update+reload, three providers, configured failure recovery vs exhausted-chain error, intentional suppression, Cycle40 reset/reload.
- [x] Perform architecture + product review directly in this thread per user instruction; Finding Format, Architecture verification (Passed AP IDs, Residual risk), actual evidence and no invented independent reviewer PASS.
- [x] Update canonical ledger and plan checkboxes. Save durable project facts through GBrain only. Verify private remote, commit/push scoped work and compare remote SHA, clean worktree.


### Execution and Review Receipts
- Layout RED: prior wrapper lacked lossless blocks; overflow add/update tests failed. GREEN includes punctuation, Unicode, unbroken tokens, five-line limits and persistence. Wide-block fire clearance additionally reproduced/fixed.
- Adapter/policy RED: missing wrapper/Pi plugin, malformed output acceptance, unknown registry fallback, unmatched empty extraction, cross-provider model override. GREEN includes explicit chain order, no fallback for successful empty results, no unconfigured switching and actual adapter metadata.
- Browser exposed an existing missing-visual-cache defect: persisted logical tokens were treated as already rendered. Added RED test (empty visible words), then rebuilt known IDs only from actual cached display items. This is required to retain complete text across reload/cache recovery.
- Pi server boundary contracts (origin/method/size/field allowlist, sanitized failures and client-disconnect abort) were added after the initial adapter implementation; explicit process deviation from separate pre-implementation server RED, not claimed otherwise. Runtime client adapter and new wrapper features had observed RED.
- Real isolated browser session `8915386d-08f5-4b5e-91ef-f71b987bb173`: Luna feelings 2155ms, desires 2013ms; same LlmDistillerPort registry lists OpenRouter/Ollama/Pi. Three-way pult cycling confirmed.
- A 482-character source was reconstructed exactly after reload (two five-line blocks at 1920px) and resize to 1280px (5/5/5/1 lines), with no added ellipsis. Full trailing sentence remained visible.
- Injected Pi outage: exactly one Pi request, zero OpenRouter/Ollama calls, no tokens emitted, visible error and original source retained. Explicit Pi→Ollama configured wrapper: exactly the two configured calls, actual successful engine `ollama`. Intentional empty extraction emits nothing.
- Cycle40 regression rerun in browser: all phases, populated circle reset, repeated reset, rapid phase changes, reload preserve phase/provider. Shared speaker reset mocked; no real microphone or user browser touched.
- Review is performed HERE by the lead per the latest explicit user instruction; no independent reviewer PASS is claimed. No open P0/P1/P2 remain in the selected slice.
- Residual risk: model/provider availability and semantic extraction quality remain external; failures are explicit. Finite Canvas space still limits comfortable density for arbitrarily many concurrent utterances (no eviction/truncation introduced). Existing serve/compression audit advisory was not changed by this work and is outside the active Vite/Pi inference path.
