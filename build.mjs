#!/usr/bin/env node
// Build the WC2026 feed: openfootball (+ optional API-Football live overlay)
// → transform → write public/wc2026-data.json. Does NOT push to Shopify.
// Publishing = `git commit && git push` of public/ (separate step / launchd).
//
// Flags:
//   --offline           use the cached data/openfootball-2026.json (no network)
//   --now <ISO>         pin "now" (for the sample/preview; default = real now)
//   --out <path>        output file (default public/wc2026-data.json)
//   --pretty            pretty-print the JSON
//
// Env: APIFOOTBALL_KEY (optional — live scores; without it the feed is
// schedule+results only, which is correct outside live match windows).

import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getOpenfootball, getLive } from './lib/sources.mjs';
import { transform } from './lib/transform.mjs';
import { jerseyUrl, HAS_JERSEY } from './lib/jersey.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const val = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };

const OFFLINE = flag('--offline');
const NOW = val('--now') ? Date.parse(val('--now')) : Date.now();
const OUT = val('--out', `${ROOT}/public/wc2026-data.json`);
const PRETTY = flag('--pretty');
const CACHE = `${ROOT}/data/openfootball-2026.json`;

async function main() {
  const raw = OFFLINE
    ? JSON.parse((await import('fs')).readFileSync(CACHE, 'utf8'))
    : await getOpenfootball({ cacheFile: CACHE });

  const live = OFFLINE ? [] : await getLive({ apiKey: process.env.APIFOOTBALL_KEY });

  const feed = transform(raw, { now: NOW, live });

  // Wire per-team jersey deep-links for the teams that have shirts. checkLive
  // (online builds) HEADs /collections/wc2026-<slug>: 200 ⇒ the branded
  // collection, else ⇒ the always-200 search URL. Auto-upgrades the moment the
  // collections are published. Offline builds skip the HEAD (search only).
  const checkLive = !OFFLINE;
  for (const code of HAS_JERSEY) {
    const t = feed.teams[code];
    if (!t) continue;
    t.jersey = { has: true, url: await jerseyUrl(code, t.he, { checkLive }), he: t.he };
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(feed, null, PRETTY ? 2 : 0));

  const today = feed.matches.filter((m) => m.is_today).length;
  const live_n = feed.matches.filter((m) => m.status === 'live').length;
  const done = feed.matches.filter((m) => m.status === 'finished').length;
  const jerseys = Object.values(feed.teams).filter((t) => t.jersey?.has).length;
  console.log(`✓ ${OUT}`);
  console.log(`  matches=${feed.matches.length} finished=${done} live=${live_n} today=${today} groups=${Object.keys(feed.groups).length} jerseys=${jerseys}`);
  console.log(`  updated=${feed.updated}  now=${new Date(NOW).toISOString()}`);
}

main().catch((e) => { console.error('BUILD FAILED:', e.message); process.exit(1); });
