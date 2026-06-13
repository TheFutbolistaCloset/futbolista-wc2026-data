# WC2026 Hub — Retrospective (2026-06-13)

A full replay of what we built, the decisions, what worked, what bit us, and how to do better next time. Companion to `RESUME.md` (where to pick up) and the plan `~/.claude/plans/quiet-floating-river.md`.

## Goal
A live, free, Hebrew/RTL **World Cup 2026 hub** for The Futbolista Closet that's genuinely useful (schedule in Israel time, today's matches, live scores, group tables) and funnels Google/ad traffic → jersey sales. Preview-before-upload; design via `/ui-ux-pro-max`; copy via `/gal-hebrew`.

## What we built (in order)
1. **Data foundation** — standalone Node project `~/futbolista-wc2026-data/`. Pulled the **real** openfootball 2026 dataset (free, no key) → validated it reproduces the brief *exactly* (USA 4:1 Paraguay, Mexico 2:0 S.Africa, Group J = ARG/ALG/AUT/JOR, tonight's slate). Built `lib/teams.mjs` (48-team EN→HE + flag colors + ISO + slugs + short names), `lib/transform.mjs` (Israel-time conversion, Hebrew, standings), `lib/sources.mjs` (fetch w/ timeout+retry), `build.mjs`, sample generator.
2. **Design system** — `/ui-ux-pro-max` → light/Apple body + dark "match-night" hero, px sizing, brand `#334fb4`. Persisted in `design-system.md`.
3. **Shared renderer** — `preview/assets/wc-hub.{css,js}` (framework-free, XSS-safe, RTL) that BOTH the preview and the future theme sections use, so the preview mirrors production exactly. Core-4 modules + favorites + .ics + JSON-LD.
4. **Local preview** — `preview/` served at http://localhost:8753/preview/, verified with agent-browser across 320→1680.
5. **Round 2** — real flags (circle-flags), Hebrew venues, date-grouped schedule, prominent favorites (strip + card stars + pin), and **30 per-team smart collections** created on the live store.
6. **Round 3** — short display names (ארה״ב…), wrap-safe names, and **self-verifying jersey links** (collection-if-published else Shopify search → never 404).

## What worked well
- **Verify-the-brief-with-real-data first.** Pulling openfootball before building killed the "is the data right?" risk early and proved the brief accurate. Don't hardcode brief facts — drive from the source. ✅ ([[verify-brief-facts]])
- **Shared CSS/JS between preview and theme.** One source of truth → the preview is a faithful mirror, no double-maintenance, and design changes (flags, alignment) land once.
- **Preview-first + agent-browser numeric checks.** Caught real bugs (RTL score flip, alignment) before anything touched Shopify. Measuring (flag-edge gaps = 15/15px; overflowX:false at 320) beats eyeballing. ([[visual-verify-ui]], [[verify-whole-component]])
- **Question-driven scoping.** Multiple-choice rounds kept every big fork (data source, freshness, favorites UX, jersey strategy) Gal's call — no wasted rebuilds.
- **openfootball kickoff format** `"HH:MM UTC±N"` → exact Israel time with zero API calls; API-Football only needed for *live* scores.

## What bit us → fix → lesson
1. **RTL score flip** — "4 : 1" rendered visually as "1 : 4" (bidi reorders colon-separated numbers). **Fix:** render scores as an inline-flex `direction:rtl` pair (`.wc-pair`), not a text string. **Lesson:** any number-with-separators in RTL needs explicit direction control; never trust raw `a : b` text.
2. **Right-team alignment** — team floated to center, not the card edge. **Fix:** flags on the OUTER edge per side + `justify-content:flex-start` (team1) / `flex-end` (team2); dropped `flex-direction:row-reverse`. **Lesson:** in RTL flex, reason in start/end, and verify both edges numerically.
3. **Long-name truncation** — "ארצות הברית" → "ארצות ...". **Fix:** short display names (gal-hebrew) for the few long ones + 2-line wrap safety (`-webkit-line-clamp:2`) so nothing is ever cut. **Lesson:** design for the longest real string, not the average.
4. **`shopify store execute` mutations blocked** — all 30 `collectionCreate`s failed first run. **Cause:** mutations disabled by default. **Fix:** `--allow-mutations`. **Lesson:** check the CLI's safety defaults before a batch.
5. **Can't publish collections via API** — token lacks `read_publications`/`write_publications` (and `menus`); `channels` empty. **Fix:** self-verifying jersey links (collection if it 200s, else Shopify search — always works) + manual bulk-publish by Gal. **Lesson:** the shared `store execute` token is read-heavy + can create products/collections but **can't publish or touch menus** — plan for manual publish/link steps. ([[store-execute-scopes]]) **Don't** re-auth with new scopes — it would break the shared tracker/backup/export session.
6. **agent-browser drifted to the live store** mid-verification (a 320 screenshot showed the catalog, eval found 0 cards). **Fix:** always re-`open` the exact preview URL before a viewport sweep and assert `location.pathname` in the eval. **Lesson:** don't trust the browser's current page across viewport changes — pin the URL and verify it.
7. **eval scope collisions** — `const o` persisted between agent-browser `eval` calls. **Lesson:** wrap probes in an IIFE and return a value (don't rely on top-level `const` or only `console.log`).

## Do better next time
- Build the RTL **score/number pair** and **edge-alignment** helpers correctly from the start (now baked into `wc-hub.{css,js}` — reuse them).
- Before any Shopify write batch: confirm `--allow-mutations` and the token's scope for the specific action (create vs publish vs menus).
- For storefront destinations, default to **self-verifying links** (prefer the nice URL, fall back to one that always 200s) so nothing ever 404s for the customer.
- Keep pinning the agent-browser URL + asserting `location.pathname` in every eval.
- Long-string + 320px is the first check, not the last.
