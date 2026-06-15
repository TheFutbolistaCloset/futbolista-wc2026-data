// Self-verifying jersey link for a team. Prefers the published per-team
// collection (/collections/wc2026-<slug> — branded + Google-indexable); falls
// back to Shopify search (always resolves, always relevant) when the collection
// isn't live yet. So a "חולצות נבחרת X" button NEVER 404s and auto-upgrades to
// the collection the moment it's published.
import { slugOf, TEAMS } from './teams.mjs';
import { fetchWithRetry } from './sources.mjs';

const STORE = process.env.STORE_URL || 'https://thefutbolistacloset.com';

// Every WC2026 team has a published per-team collection PAGE (commerce when shirts exist, else a
// "coming soon + email-notify" page that auto-flips to commerce at runtime via collection.products.size).
// So all 48 get a per-team "חולצות X" button + team-page internal links. The feed's jerseyUrl() still
// HEAD-checks each collection, so any team whose collection isn't published yet degrades gracefully to
// search (never a 404) and auto-upgrades the moment it's published. (Was a hand-curated 30-team list
// until 2026-06-15 — switched to all-48 for zero-touch auto-update when new teams get shirts.)
export const HAS_JERSEY = Object.values(TEAMS).map((t) => t.code);

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
