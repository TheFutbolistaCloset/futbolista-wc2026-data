#!/usr/bin/env node
// Scan the WC2026 collection → distinct teams + product counts.
// READ-ONLY by default. With --create it creates one SMART collection per team
// (rule: TITLE contains "נבחרת <X>" AND TITLE contains "מונדיאל 2026") and
// publishes it to the Online Store. The --create path is GATED: only run after
// Gal confirms the team list (Collection-Scope rule).
import { spawnSync } from 'child_process';
import { lookupTeam, slugOf } from '../lib/teams.mjs';

const STORE = process.env.SHOPIFY_STORE || '143f82.myshopify.com';
const HANDLE = 'world-cup-2026-football-shirts';
const CREATE = process.argv.includes('--create');

function gql(query, variables, mutate) {
  const args = ['store', 'execute', '--store', STORE, '--json'];
  if (mutate) args.push('--allow-mutations'); // store execute blocks mutations otherwise
  args.push('--query', query);
  if (variables) args.push('--variables', JSON.stringify(variables));
  const r = spawnSync('shopify', args, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('CLI error: ' + (r.stderr || r.stdout || '').slice(0, 300));
  const out = r.stdout;
  try { return JSON.parse(out); }
  catch { const i = out.indexOf('{'), j = out.lastIndexOf('}'); return JSON.parse(out.slice(i, j + 1)); } // strip any noise
}

// team Hebrew name out of a product title ("חולצת משחק בית נבחרת ברזיל מונדיאל 2026" → "ברזיל")
function teamOf(title) {
  const m = title.replace(/\s+/g, ' ').trim().match(/נבחרת\s+(.+)$/);
  if (!m) return '';
  return m[1].replace(/(?:\s+שרוול\s+ארוך)?(?:\s+מונדיאל)?\s+2026\s*$/, '').trim();
}

function fetchTitles() {
  const titles = []; let cursor = null;
  do {
    const q = `query($c:String){ collectionByHandle(handle:"${HANDLE}"){ products(first:100, after:$c){ pageInfo{hasNextPage endCursor} nodes{ title } } } }`;
    const d = gql(q, { c: cursor });
    const block = (d.data?.collectionByHandle || d.collectionByHandle).products;
    block.nodes.forEach((n) => titles.push(n.title));
    cursor = block.pageInfo.hasNextPage ? block.pageInfo.endCursor : null;
  } while (cursor);
  return titles;
}

const titles = fetchTitles();
const byTeam = {};
for (const t of titles) { const he = teamOf(t); if (!he) continue; (byTeam[he] = byTeam[he] || []).push(t); }
const rows = Object.entries(byTeam)
  .map(([he, list]) => { const lt = lookupTeam(he); return { he, count: list.length, code: lt ? lt.code : null, slug: lt ? slugOf(lt.code) : null }; })
  .sort((a, b) => b.count - a.count || a.he.localeCompare(b.he, 'he'));

console.log(`Products: ${titles.length} | distinct teams: ${rows.length}\n`);
rows.forEach((r) => console.log(`  ${String(r.count).padStart(2)} ×  ${r.he.padEnd(18)} → /collections/wc2026-${r.slug || '??'}   [${r.code || 'UNMAPPED'}]`));
const unmapped = rows.filter((r) => !r.slug);
if (unmapped.length) console.log('\n⚠ UNMAPPED teams (fix lexicon before --create):', unmapped.map((r) => r.he).join(', '));

if (!CREATE) { console.log('\n(read-only scan — rerun with --create after Gal confirms the list to create the smart collections)'); process.exit(0); }

// ── GATED: create + publish per-team smart collections ──
let PUB = null;
try {
  const d = gql(`query{ publications(first:20){ nodes{ id name } } }`);
  const nodes = (d.data?.publications || d.publications).nodes;
  const os = nodes.find((n) => /online store/i.test(n.name));
  PUB = os ? os.id : null;
  if (!PUB) console.log('⚠ Online Store publication not found — collections will be created UNPUBLISHED.');
} catch (e) { console.log('⚠ publications query failed (' + e.message.slice(0, 80) + ') — creating UNPUBLISHED; publish manually if needed.'); }

const CREATE_MUT = `mutation($input:CollectionInput!){ collectionCreate(input:$input){ collection{ id handle } userErrors{ field message } } }`;
const PUBLISH_MUT = `mutation($id:ID!,$pid:ID!){ publishablePublish(id:$id, input:{publicationId:$pid}){ userErrors{ field message } } }`;

let made = 0, skipped = 0, failed = 0;
for (const r of rows) {
  if (!r.slug) { skipped++; continue; } // non-qualified / unmapped → no hub button, skip
  const handle = `wc2026-${r.slug}`;
  const input = {
    title: `חולצות ${r.he} · מונדיאל 2026`,
    handle,
    ruleSet: { appliedDisjunctively: false, rules: [
      { column: 'TITLE', relation: 'CONTAINS', condition: `נבחרת ${r.he}` },
      { column: 'TITLE', relation: 'CONTAINS', condition: 'מונדיאל 2026' },
    ] },
    seo: { title: `חולצות נבחרת ${r.he} מונדיאל 2026 | The Futbolista Closet`, description: `כל חולצות נבחרת ${r.he} למונדיאל 2026 — גרסת אוהד וגרסת שחקן, הדפסת שם ומספר חינם, משלוח חינם.` },
  };
  try {
    const res = gql(CREATE_MUT, { input }, true);
    const cc = res.data?.collectionCreate || res.collectionCreate;
    if (cc.userErrors?.length) { console.log(`✗ ${handle}: ${JSON.stringify(cc.userErrors)}`); failed++; continue; }
    const id = cc.collection.id;
    if (PUB) { try { gql(PUBLISH_MUT, { id, pid: PUB }, true); } catch (e) { console.log(`  (publish warn ${handle}: ${e.message.slice(0, 60)})`); } }
    console.log(`✓ ${handle}  (${r.count} shirts)${PUB ? ' +published' : ''}`);
    made++;
  } catch (e) { console.log(`✗ ${handle}: ${e.message.slice(0, 120)}`); failed++; }
}
console.log(`\nDone. created=${made} failed=${failed} skipped(non-qualified)=${skipped}`);
