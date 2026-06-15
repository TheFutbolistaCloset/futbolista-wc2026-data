#!/usr/bin/env node
// Create the MISSING wc2026-<slug> smart collections (idempotent) so all 48 WC teams have a
// per-team page. Each is a SMART collection (auto-captures shirts titled "נבחרת <X> ... מונדיאל 2026")
// with templateSuffix=wc2026-team set at creation. Created UNPUBLISHED (token lacks write_publications)
// → Gal publishes them in Admin. Existing collections are skipped. Read-only by default; pass --create.
import { spawnSync } from 'child_process';
import { TEAMS, slugOf } from '../lib/teams.mjs';

const STORE = process.env.SHOPIFY_STORE || '143f82.myshopify.com';
const CREATE = process.argv.includes('--create');

function gql(query, variables, mutate) {
  const args = ['store', 'execute', '--store', STORE, '--json'];
  if (mutate) args.push('--allow-mutations');
  args.push('--query', query);
  if (variables) args.push('--variables', JSON.stringify(variables));
  const r = spawnSync('shopify', args, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('CLI error: ' + (r.stderr || r.stdout || '').slice(0, 300));
  const out = r.stdout; try { return JSON.parse(out); } catch { const i = out.indexOf('{'), j = out.lastIndexOf('}'); return JSON.parse(out.slice(i, j + 1)); }
}

const CREATE_MUT = `mutation($input:CollectionInput!){ collectionCreate(input:$input){ collection{ id handle templateSuffix } userErrors{ field message } } }`;

const teams = Object.values(TEAMS).map((t) => ({ he: t.he, slug: slugOf(t.code) })).filter((t) => t.slug);
let exists = 0, made = 0, failed = 0;
const toCreate = [];

for (const t of teams) {
  const handle = `wc2026-${t.slug}`;
  const q = gql(`query{ collectionByHandle(handle:"${handle}"){ id } }`);
  const col = q.data?.collectionByHandle || q.collectionByHandle;
  if (col) { exists++; continue; }
  toCreate.push(t);
}

console.log(`Exist: ${exists} | Missing: ${toCreate.length} → ${toCreate.map((t) => 'wc2026-' + t.slug).join(', ') || 'none'}`);
if (!CREATE) { console.log('\n(read-only scan — rerun with --create to create the missing smart collections, UNPUBLISHED)'); process.exit(0); }

for (const t of toCreate) {
  const handle = `wc2026-${t.slug}`;
  const input = {
    title: `חולצות ${t.he} · מונדיאל 2026`,
    handle,
    templateSuffix: 'wc2026-team',
    ruleSet: { appliedDisjunctively: false, rules: [
      { column: 'TITLE', relation: 'CONTAINS', condition: `נבחרת ${t.he}` },
      { column: 'TITLE', relation: 'CONTAINS', condition: 'מונדיאל 2026' },
    ] },
    seo: { title: `חולצות נבחרת ${t.he} מונדיאל 2026 | The Futbolista Closet`, description: `כל חולצות נבחרת ${t.he} למונדיאל 2026 — גרסת אוהד וגרסת שחקן, הדפסת שם ומספר חינם, משלוח חינם.` },
  };
  try {
    const res = gql(CREATE_MUT, { input }, true);
    const cc = res.data?.collectionCreate || res.collectionCreate;
    if (cc.userErrors?.length) { console.log(`✗ ${handle}: ${JSON.stringify(cc.userErrors)}`); failed++; continue; }
    console.log(`✓ ${handle} → suffix='${cc.collection.templateSuffix}' (UNPUBLISHED — publish in Admin)`);
    made++;
  } catch (e) { console.log(`✗ ${handle}: ${e.message.slice(0, 140)}`); failed++; }
}
console.log(`\nDone. created=${made} existed=${exists} failed=${failed}`);
