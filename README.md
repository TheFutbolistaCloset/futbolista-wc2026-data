# futbolista-wc2026-data

Live **World Cup 2026** data feed powering the hub page on The Futbolista Closet
(`/pages/mundial-2026`). Standalone, kept **outside** the theme repo on purpose:
the live Shopify theme is **never** pushed on a data refresh — the storefront
fetches this feed directly.

## What it does
1. Pulls the fixed schedule / groups / venues / kickoff times + results from
   **openfootball/worldcup.json** (free, no key).
2. Overlays **live in-match scores** from **API-Football** free tier (optional;
   needs `APIFOOTBALL_KEY`).
3. Converts every kickoff to **Israel time** (Asia/Jerusalem, DST-correct),
   maps teams to **Hebrew** + flag colors, computes **group standings**.
4. Writes one `public/wc2026-data.json`. Publishing = commit + push of `public/`
   (this repo is public; `raw.githubusercontent.com` serves it with open CORS).

## Commands
```bash
npm run build          # real now, fetch live (needs APIFOOTBALL_KEY in env)
npm run build:offline  # use cached openfootball, no live (dev)
npm run sample         # pinned sample feed for the local preview
npm run preview        # serve the local preview at http://localhost:8753/preview/
```

## Env
```
APIFOOTBALL_KEY=...   # free api-sports.io key — live scores only (optional)
```

## Layout
- `lib/teams.mjs` — canonical 48-team English→Hebrew + flag colors + aliases.
- `lib/transform.mjs` — openfootball (+ live) → normalized feed (Israel time, standings).
- `lib/sources.mjs` — fetch w/ timeout + retry; openfootball cache fallback.
- `build.mjs` — orchestrator → `public/wc2026-data.json`.
- `preview/` — local HTML preview harness (mirrors the real theme section output).
- `launchd/` — scheduled refresh (smart cadence; live windows ≈ every few min).

## Notes
- Feed never contains secrets. `.env` is gitignored.
- Theme code deploys stay gated/manual (project protocol). This feed updates on
  its own and does not touch the theme.
