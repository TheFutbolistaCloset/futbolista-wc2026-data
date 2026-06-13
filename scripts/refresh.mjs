#!/usr/bin/env node
// Unattended feed refresh for launchd: rebuild public/wc2026-data.json from the
// live sources, and ONLY commit+push when the feed actually changed (so idle
// runs outside match windows are no-ops, not history noise). The storefront
// fetches the pushed raw file — so the live theme is NEVER touched on a refresh.
//
// Loads APIFOOTBALL_KEY from .env (gitignored) for live scores when present;
// without it the feed is schedule+results only (still correct). Every network
// call already has timeout+retry+cache-fallback (lib/sources.mjs), so a stalled
// endpoint degrades instead of hanging the job.
import { execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FEED = join(ROOT, 'public', 'wc2026-data.json');

// Load .env (KEY=VALUE lines) into process.env without a dependency.
const ENV = join(ROOT, '.env');
if (existsSync(ENV)) {
  for (const line of readFileSync(ENV, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
const ts = () => new Date().toISOString();

// Compare feeds ignoring the always-changing `updated` stamp, so an idle run
// (schedule/scores unchanged) is a true no-op instead of a timestamp-only commit.
const meaningful = (json) => { try { const o = JSON.parse(json); delete o.updated; return JSON.stringify(o); } catch { return json; } };

try {
  let prev = null;
  try { prev = run('/usr/bin/git', ['show', 'HEAD:public/wc2026-data.json']); } catch { /* first run */ }
  run('/usr/local/bin/node', ['build.mjs', '--pretty']);   // writes public/wc2026-data.json
  const next = readFileSync(FEED, 'utf8');
  if (prev != null && meaningful(prev) === meaningful(next)) {
    console.log(`${ts()} no meaningful change — skip push`);
    process.exit(0);
  }
  run('/usr/bin/git', ['add', FEED]);
  run('/usr/bin/git', ['commit', '-m', `feed: refresh ${ts()}`]);
  run('/usr/bin/git', ['push', 'origin', 'main:main']);     // explicit refspec, never HEAD
  console.log(`${ts()} pushed feed update`);
} catch (e) {
  console.error(`${ts()} refresh FAILED: ${e.message}`);
  process.exit(1);
}
