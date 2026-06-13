// Self-verifying jersey link for a team. Prefers the published per-team
// collection (/collections/wc2026-<slug> — branded + Google-indexable); falls
// back to Shopify search (always resolves, always relevant) when the collection
// isn't live yet. So a "חולצות נבחרת X" button NEVER 404s and auto-upgrades to
// the collection the moment it's published.
import { slugOf } from './teams.mjs';
import { fetchWithRetry } from './sources.mjs';

const STORE = process.env.STORE_URL || 'https://thefutbolistacloset.com';

// Curated list of teams that actually have WC2026 shirts in the live catalog
// (catalog scan, 2026-06-13 — 30 teams; re-derive via scripts/build-team-collections.mjs).
// SHARED source of truth for the sample feed AND the real build, so a card only
// shows a per-team "חולצות X" button when relevant. Teams not listed fall back
// to the ghost "כל חולצות המונדיאל" button (no irrelevant search results).
export const HAS_JERSEY = ['ESP', 'ARG', 'GER', 'MEX', 'BRA', 'JPN', 'AUT', 'URU', 'ALG', 'ENG', 'USA', 'BEL', 'RSA', 'KOR', 'NED', 'CIV', 'EGY', 'MAR', 'NOR', 'SCO', 'KSA', 'POR', 'PAR', 'CZE', 'FRA', 'COL', 'CUW', 'CAN', 'CRO', 'SWE'];

export function collectionUrl(code) {
  const s = slugOf(code);
  return s ? `${STORE}/collections/wc2026-${s}` : null;
}

// Search for the team's WC2026 products — validated to return the right shirts
// (e.g. "נבחרת ברזיל מונדיאל 2026" → 8 results) and to always respond 200.
export function searchUrl(he) {
  return `${STORE}/search?q=${encodeURIComponent('נבחרת ' + he + ' מונדיאל 2026')}&type=product`;
}

// checkLive=false (sample/offline) → search. checkLive=true (real build) → HEAD
// the collection: 200 ⇒ collection, anything else / error ⇒ search.
export async function jerseyUrl(code, he, { checkLive = false } = {}) {
  const col = collectionUrl(code);
  const search = searchUrl(he);
  if (!col || !checkLive) return search;
  try {
    await fetchWithRetry(col, { method: 'HEAD', timeout: 8000, retries: 2 }); // throws on non-2xx
    return col;
  } catch {
    return search;
  }
}
