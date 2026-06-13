#!/usr/bin/env node
// Unattended feed refresh for launchd: rebuild public/wc2026-data.json from the
// live sources, and ONLY commit+push when the feed actually changed (so idle
// runs are no-ops, not history noise). The storefront fetches the pushed raw
// file — so the live theme is NEVER touched on a refresh.
//
// ── Adaptive cadence ──────────────────────────────────────────────────────
// launchd fires this every 5 min (static StartInterval). The real cost lever is
// how often we hit openfootball, so the *script* decides whether to act:
//   • ACTIVE  (a match is within −15min .. +160min of kickoff) → rebuild every
//             tick (≈5 min) for fresh in-play / just-finished results.
//   • IDLE_DAY  (no active match)                → rebuild at most every 30 min.
//   • IDLE_NIGHT (01:00–08:00 Israel, no match within 60 min) → every 60 min.
// State = epoch of the last actual build in logs/last-build.txt (gitignored).
// Data source is openfootball only (free, unlimited GitHub raw). The paid
// API-Football overlay is dormant (LIVE_API!='on') — the free plan blocks the
// 2026 season, so it would only burn quota on failed calls.
//
// Every network call already has timeout+retry+cache-fallback (lib/sources.mjs),
// so a stalled endpoint degrades instead of hanging the job.
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FEED = join(ROOT, 'public', 'wc2026-data.json');
const STATE = join(ROOT, 'logs', 'last-build.txt');
const MIN = 60000;

// Load .env (KEY=VALUE lines) into process.env without a dependency.
const ENV = join(ROOT, '.env');
if (existsSync(ENV)) {
  for (const line of readFileSync(ENV, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// Portable binaries: node = the interpreter running this script (works under
// launchd's PATH and on Ubuntu CI alike); git resolved from PATH.
const NODE = process.execPath;
const GIT = 'git';
const CI = !!process.env.CI; // GitHub Actions sets CI=true
const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
const ts = () => new Date().toISOString();

// Compare feeds ignoring the always-changing `updated` stamp, so an idle run
// (schedule/scores unchanged) is a true no-op instead of a timestamp-only commit.
const meaningful = (json) => { try { const o = JSON.parse(json); delete o.updated; return JSON.stringify(o); } catch { return json; } };

// ── adaptive gate helpers ──
const israelHour = () => {
  try { return +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }).format(new Date()); }
  catch { return (new Date().getUTCHours() + 3) % 24; }
};
const matchTimestamps = () => {
  try { return (JSON.parse(readFileSync(FEED, 'utf8')).matches || []).map((m) => m.ts).filter(Boolean); }
  catch { return []; } // first run / no feed yet → treat as ACTIVE so we build
};
const decide = (now) => {
  const tss = matchTimestamps();
  if (!tss.length) return { state: 'ACTIVE', gap: 0 };
  const PRE = 15 * MIN, POST = 160 * MIN;
  if (tss.some((t) => now >= t - PRE && now <= t + POST)) return { state: 'ACTIVE', gap: 0 };
  const matchWithinHour = tss.some((t) => t > now && t - now <= 60 * MIN);
  const h = israelHour();
  const night = h >= 1 && h < 8 && !matchWithinHour;
  return { state: night ? 'IDLE_NIGHT' : 'IDLE_DAY', gap: (night ? 60 : 30) * MIN };
};
const lastBuild = () => { try { return +readFileSync(STATE, 'utf8').trim() || 0; } catch { return 0; } };

const now = Date.now();
// In the cloud (GitHub Actions) Actions-minutes are free and there is no battery
// to spare, so we always build every tick and rely on the meaningful-change gate
// below to avoid timestamp-only commits. Locally (launchd) we self-throttle.
const { state, gap } = CI ? { state: 'CI', gap: 0 } : decide(now);
if (state !== 'ACTIVE' && state !== 'CI' && now - lastBuild() < gap) {
  const wait = Math.ceil((gap - (now - lastBuild())) / MIN);
  console.log(`${ts()} ${state} — throttled (next build in ~${wait}m), skip`);
  process.exit(0);
}

try {
  let prev = null;
  try { prev = run(GIT, ['show', 'HEAD:public/wc2026-data.json']); } catch { /* first run */ }
  run(NODE, ['build.mjs', '--pretty']);   // writes feed + SSR partials
  try { writeFileSync(STATE, String(now)); } catch { /* state is best-effort */ }
  const next = readFileSync(FEED, 'utf8');
  if (prev != null && meaningful(prev) === meaningful(next)) {
    console.log(`${ts()} ${state} — no meaningful change, skip push`);
    process.exit(0);
  }
  // Stage the whole public/ (feed + regenerated SSR snippets). The storefront
  // fetches the JSON feed live; the SSR snippets are deployed to the theme
  // separately (controlled push) — committing them here keeps the repo current.
  run(GIT, ['add', `${ROOT}/public`]);
  run(GIT, ['commit', '-m', `feed: refresh ${ts()}`]);
  run(GIT, ['push', 'origin', 'main:main']);     // explicit refspec, never HEAD
  console.log(`${ts()} ${state} — pushed feed update`);
} catch (e) {
  console.error(`${ts()} refresh FAILED: ${e.message}`);
  process.exit(1);
}
