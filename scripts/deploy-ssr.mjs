#!/usr/bin/env node
// Daily: regenerate the server-rendered SEO snippets and, IF they changed, push
// them to the LIVE theme so Google's crawlable layer stays current. Users already
// get live results via the JS overlay (the 10-min feed job); this keeps the
// server-rendered HTML fresh too. Scope = 3 content-only snippets, change-gated
// (sha256) → minimal blast radius. Auth: SHOPIFY_CLI_THEME_TOKEN + SHOPIFY_FLAG_STORE
// from .env (a Theme Access token — Admin → Apps → Theme access → generate).
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { createHash } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const THEME_DIR = process.env.WC_THEME_DIR || '/Users/galvaknin/wc-hub-port';
const LIVE = '186430161182';
const SNIPPETS = ['wc2026-schedule-ssr.liquid', 'wc2026-standings-ssr.liquid', 'wc2026-jsonld.liquid'];
const HASHFILE = join(ROOT, '.ssr-deploy-hash');

// load .env
const ENV = join(ROOT, '.env');
if (existsSync(ENV)) {
  for (const l of readFileSync(ENV, 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const ts = () => new Date().toISOString();
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: opts.cwd || ROOT, encoding: 'utf8', env: process.env, timeout: opts.timeout || 120000, stdio: opts.stdio || 'pipe' });

function pushWithRetry(onlyFlags, attempts = 3) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      run('shopify', ['theme', 'push', '--theme', LIVE, '--allow-live', '--path', THEME_DIR, ...onlyFlags], { timeout: 180000, stdio: 'inherit' });
      return;
    } catch (e) {
      last = e;
      if (i < attempts) execFileSync('sleep', [String(i * 5)]); // 5s, 10s backoff
    }
  }
  throw last;
}

try {
  if (!process.env.SHOPIFY_CLI_THEME_TOKEN || !process.env.SHOPIFY_FLAG_STORE) {
    console.error(`${ts()} missing SHOPIFY_CLI_THEME_TOKEN / SHOPIFY_FLAG_STORE in .env — skip`);
    process.exit(1);
  }
  if (!existsSync(join(THEME_DIR, 'snippets'))) {
    console.error(`${ts()} theme checkout not found at ${THEME_DIR} (set WC_THEME_DIR)`);
    process.exit(1);
  }
  run('/usr/local/bin/node', ['build.mjs', '--pretty']); // regenerate public/wc2026-*-ssr.liquid

  const h = createHash('sha256');
  for (const s of SNIPPETS) h.update(readFileSync(join(ROOT, 'public', s)));
  const hash = h.digest('hex');
  const prev = existsSync(HASHFILE) ? readFileSync(HASHFILE, 'utf8').trim() : '';
  if (hash === prev) {
    console.log(`${ts()} SSR unchanged — skip live push`);
    process.exit(0);
  }

  for (const s of SNIPPETS) copyFileSync(join(ROOT, 'public', s), join(THEME_DIR, 'snippets', s));
  pushWithRetry(SNIPPETS.flatMap((s) => ['--only', `snippets/${s}`]));
  writeFileSync(HASHFILE, hash);
  console.log(`${ts()} pushed fresh SSR to live (${hash.slice(0, 8)})`);
} catch (e) {
  console.error(`${ts()} deploy-ssr FAILED: ${e.message}`);
  process.exit(1);
}
