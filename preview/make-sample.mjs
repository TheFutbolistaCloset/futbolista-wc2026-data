// Build a pinned SAMPLE feed for the local preview. Pins "now" to a moment with
// a finished match, a LIVE match, and upcoming games — so the preview exercises
// every card state. Live data is synthesized (openfootball has no live feed).
import { readFileSync, writeFileSync } from 'fs';
import { transform } from '../lib/transform.mjs';
import { jerseyUrl, HAS_JERSEY } from '../lib/jersey.mjs';

const CACHE = new URL('../data/openfootball-2026.json', import.meta.url);
const OUT = new URL('./sample-data.json', import.meta.url);

// 22:30 Israel, Sat 13 June 2026 — Qatar v Switzerland (22:00) is in play.
const NOW = Date.parse('2026-06-13T22:30:00+03:00');

const raw = JSON.parse(readFileSync(CACHE, 'utf8'));
const feed = transform(raw, { now: NOW });

// Synthesize a LIVE state on Qatar v Switzerland (QAT v SUI) so the preview
// shows the live card + the hero "live now" chip.
const liveMatch = feed.matches.find((m) => m.t1 === 'QAT' && m.t2 === 'SUI');
if (liveMatch) {
  liveMatch.status = 'live';
  liveMatch.score = [1, 1];
  liveMatch.minute = 58;
}

// Jersey links — same curated HAS_JERSEY list the real build uses (lib/jersey.mjs).
// checkLive:false → Shopify SEARCH url (always 200, always relevant); the real
// build uses checkLive:true and auto-upgrades to /collections/wc2026-<slug> once
// Gal publishes them.
for (const code of HAS_JERSEY) {
  const t = feed.teams[code];
  if (t) t.jersey = { has: true, url: await jerseyUrl(code, t.he, { checkLive: false }), he: t.he };
}

feed._sample = true; // flag so the preview can show a "sample data" notice
writeFileSync(OUT, JSON.stringify(feed, null, 2));

const today = feed.matches.filter((m) => m.is_today).length;
console.log(`✓ preview/sample-data.json  (now=${new Date(NOW).toISOString()})`);
console.log(`  finished=${feed.matches.filter((m) => m.status === 'finished').length} live=${feed.matches.filter((m) => m.status === 'live').length} today=${today}`);
