// Canonical World Cup 2026 team lexicon — the single source of truth for
// English (openfootball) → Hebrew + flag colors + FIFA code + match aliases.
//
// Hebrew names are taken VERBATIM from the vetted FLAGS dict in the live theme
// (sections/wc2026-collection-hero.liquid) for the 27 returning teams, so that
// the "לחולצות X" deep-link value matches the collection's team-filter chips.
// The 21 new teams were added via the gal-hebrew lexicon (2026-06-13); three
// (Ivory Coast / Cape Verde / DR Congo) are pending Gal's final confirmation.
//
// `aliases` lists the alternate names live APIs (API-Football) use, so live
// scores can be matched back to the openfootball fixture key regardless of
// the provider's spelling. Keys are the EXACT strings openfootball emits.

export const TEAMS = {
  // ── Group A ──
  'Mexico':               { code: 'MEX', he: 'מקסיקו',            flag: ['#006847', '#CE1126'], aliases: ['México'] },
  'South Africa':         { code: 'RSA', he: 'דרום אפריקה',       flag: ['#007749', '#E03C31'], aliases: [] },
  'South Korea':          { code: 'KOR', he: 'דרום קוריאה',       flag: ['#CD2E3A', '#0047A0'], aliases: ['Korea Republic', 'Korea'] },
  'Czech Republic':       { code: 'CZE', he: 'צ׳כיה',             flag: ['#D7141A', '#11457E'], aliases: ['Czechia'] },
  // ── Group B ──
  'Canada':               { code: 'CAN', he: 'קנדה',              flag: ['#D80621', '#a00318'], aliases: [] },
  'Bosnia & Herzegovina': { code: 'BIH', he: 'בוסניה והרצגובינה', flag: ['#002395', '#FECB00'], aliases: ['Bosnia and Herzegovina', 'Bosnia'] },
  'Qatar':                { code: 'QAT', he: 'קטאר',              flag: ['#8A1538', '#6e102c'], aliases: [] },
  'Switzerland':          { code: 'SUI', he: 'שווייץ',            flag: ['#D52B1E', '#b71c12'], aliases: [] },
  // ── Group C ──
  'Brazil':               { code: 'BRA', he: 'ברזיל',             flag: ['#009C3B', '#FFDF00'], aliases: [] },
  'Morocco':              { code: 'MAR', he: 'מרוקו',             flag: ['#C1272D', '#006233'], aliases: [] },
  'Haiti':                { code: 'HAI', he: 'האיטי',             flag: ['#00209F', '#D21034'], aliases: [] },
  'Scotland':             { code: 'SCO', he: 'סקוטלנד',           flag: ['#005EB8', '#003a73'], aliases: [] },
  // ── Group D ──
  'USA':                  { code: 'USA', he: 'ארצות הברית',       flag: ['#B22234', '#3C3B6E'], aliases: ['United States', 'United States of America'] },
  'Paraguay':             { code: 'PAR', he: 'פרגוואי',           flag: ['#D52B1E', '#0038A8'], aliases: [] },
  'Australia':            { code: 'AUS', he: 'אוסטרליה',          flag: ['#012169', '#E4002B'], aliases: [] },
  'Turkey':               { code: 'TUR', he: 'טורקיה',            flag: ['#E30A17', '#b00712'], aliases: ['Türkiye', 'Turkiye'] },
  // ── Group E ──
  'Germany':              { code: 'GER', he: 'גרמניה',            flag: ['#DD0000', '#FFCE00'], aliases: [] },
  'Curaçao':              { code: 'CUW', he: 'קורסאו',            flag: ['#002B7F', '#F9E814'], aliases: ['Curacao'] },
  'Ivory Coast':          { code: 'CIV', he: 'חוף השנהב',         flag: ['#FF8200', '#009E60'], aliases: ["Côte d'Ivoire", 'Cote d\'Ivoire'] },
  'Ecuador':              { code: 'ECU', he: 'אקוודור',           flag: ['#FFD100', '#034EA2'], aliases: [] },
  // ── Group F ──
  'Netherlands':          { code: 'NED', he: 'הולנד',             flag: ['#AE1C28', '#21468B'], aliases: ['Holland'] },
  'Japan':                { code: 'JPN', he: 'יפן',               flag: ['#BC002D', '#8a0021'], aliases: [] },
  'Sweden':               { code: 'SWE', he: 'שבדיה',             flag: ['#006AA7', '#FECC02'], aliases: [] },
  'Tunisia':              { code: 'TUN', he: 'תוניסיה',           flag: ['#E70013', '#b3000f'], aliases: [] },
  // ── Group G ──
  'Belgium':              { code: 'BEL', he: 'בלגיה',             flag: ['#FDDA24', '#EF3340'], aliases: [] },
  'Egypt':                { code: 'EGY', he: 'מצרים',             flag: ['#CE1126', '#1a1a1a'], aliases: [] },
  'Iran':                 { code: 'IRN', he: 'איראן',             flag: ['#239F40', '#DA0000'], aliases: ['IR Iran'] },
  'New Zealand':          { code: 'NZL', he: 'ניו זילנד',         flag: ['#00247D', '#CC142B'], aliases: [] },
  // ── Group H ──
  'Spain':                { code: 'ESP', he: 'ספרד',              flag: ['#AA151B', '#F1BF00'], aliases: [] },
  'Cape Verde':           { code: 'CPV', he: 'כף ורדה',           flag: ['#003893', '#CF2027'], aliases: ['Cabo Verde'] },
  'Saudi Arabia':         { code: 'KSA', he: 'ערב הסעודית',       flag: ['#165B33', '#0d3d22'], aliases: [] },
  'Uruguay':              { code: 'URU', he: 'אורוגוואי',         flag: ['#5B92E5', '#FCD116'], aliases: [] },
  // ── Group I ──
  'France':               { code: 'FRA', he: 'צרפת',              flag: ['#0055A4', '#EF4135'], aliases: [] },
  'Senegal':              { code: 'SEN', he: 'סנגל',              flag: ['#00853F', '#FDEF42'], aliases: [] },
  'Iraq':                 { code: 'IRQ', he: 'עיראק',             flag: ['#CE1126', '#007A3D'], aliases: [] },
  'Norway':               { code: 'NOR', he: 'נורווגיה',          flag: ['#BA0C2F', '#00205B'], aliases: [] },
  // ── Group J ──
  'Argentina':            { code: 'ARG', he: 'ארגנטינה',          flag: ['#74ACDF', '#F6B40E'], aliases: [] },
  'Algeria':              { code: 'ALG', he: 'אלג׳יריה',          flag: ['#006233', '#D21034'], aliases: [] },
  'Austria':              { code: 'AUT', he: 'אוסטריה',           flag: ['#ED2939', '#a31523'], aliases: [] },
  'Jordan':               { code: 'JOR', he: 'ירדן',              flag: ['#007A3D', '#CE1126'], aliases: [] },
  // ── Group K ──
  'Portugal':             { code: 'POR', he: 'פורטוגל',           flag: ['#046A38', '#DA291C'], aliases: [] },
  'DR Congo':             { code: 'COD', he: 'קונגו',             flag: ['#007FFF', '#F7D618'], aliases: ['Congo DR', 'DR Congo', 'Democratic Republic of the Congo', 'Congo Democratic Republic'] },
  'Uzbekistan':           { code: 'UZB', he: 'אוזבקיסטן',         flag: ['#0099B5', '#1EB53A'], aliases: [] },
  'Colombia':             { code: 'COL', he: 'קולומביה',          flag: ['#FCD116', '#003893'], aliases: [] },
  // ── Group L ──
  'England':              { code: 'ENG', he: 'אנגליה',            flag: ['#C8102E', '#8d0b20'], aliases: [] },
  'Croatia':              { code: 'CRO', he: 'קרואטיה',           flag: ['#C8102E', '#171796'], aliases: [] },
  'Ghana':                { code: 'GHA', he: 'גאנה',              flag: ['#CE1126', '#FCD116'], aliases: [] },
  'Panama':               { code: 'PAN', he: 'פנמה',              flag: ['#005293', '#DA121A'], aliases: [] },
};

// FIFA code → circle-flags slug (ISO 3166-1 alpha-2, lowercase; England/Scotland
// use the GB sub-region flags). Powers the round flag SVGs in the UI.
export const ISO = {
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz', CAN: 'ca', BIH: 'ba', QAT: 'qa', SUI: 'ch',
  BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct', USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
  GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec', NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz', ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy',
  FRA: 'fr', SEN: 'sn', IRQ: 'iq', NOR: 'no', ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
  POR: 'pt', COD: 'cd', UZB: 'uz', COL: 'co', ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa',
};
export function isoOf(code) { return ISO[code] || null; }

// Flag image source — lipis/flag-icons (ACCURATE per-country colors; circle-flags uses a
// simplified shared palette that renders e.g. Argentina's celeste as #338af3). 1x1 square
// SVGs crop cleanly to a circle (object-fit:cover + border-radius:50%). Canonical base used
// by lib/ssr.mjs, scripts/build-team-pages.mjs, and assets/wc-hub.js (keep them in sync).
export const FLAG_BASE = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/1x1/';
export function flagUrl(iso) { return iso ? FLAG_BASE + iso + '.svg' : null; }

// FIFA code → English slug for per-team collection handles (wc2026-<slug>).
// Matches the existing product-handle bases (e.g. brazil-world-cup-2026-home-shirt).
export const SLUG = {
  MEX: 'mexico', RSA: 'south-africa', KOR: 'south-korea', CZE: 'czechia', CAN: 'canada', BIH: 'bosnia', QAT: 'qatar', SUI: 'switzerland',
  BRA: 'brazil', MAR: 'morocco', HAI: 'haiti', SCO: 'scotland', USA: 'usa', PAR: 'paraguay', AUS: 'australia', TUR: 'turkey',
  GER: 'germany', CUW: 'curacao', CIV: 'ivory-coast', ECU: 'ecuador', NED: 'netherlands', JPN: 'japan', SWE: 'sweden', TUN: 'tunisia',
  BEL: 'belgium', EGY: 'egypt', IRN: 'iran', NZL: 'new-zealand', ESP: 'spain', CPV: 'cape-verde', KSA: 'saudi-arabia', URU: 'uruguay',
  FRA: 'france', SEN: 'senegal', IRQ: 'iraq', NOR: 'norway', ARG: 'argentina', ALG: 'algeria', AUT: 'austria', JOR: 'jordan',
  POR: 'portugal', COD: 'dr-congo', UZB: 'uzbekistan', COL: 'colombia', ENG: 'england', CRO: 'croatia', GHA: 'ghana', PAN: 'panama',
};
export function slugOf(code) { return SLUG[code] || null; }

// Short display names for the few names too long for the compact match card.
// Standard idiomatic Hebrew (verified via gal-hebrew 2026-06-13). Everywhere
// with room (standings, strip, filter) still uses the full `he` name.
export const HE_SHORT = { USA: 'ארה״ב', BIH: 'בוסניה', KSA: 'סעודיה' };
export function shortHe(code, fullHe) { return HE_SHORT[code] || fullHe; }

// Fast reverse lookup: lower-cased name/alias → canonical openfootball key.
const NAME_TO_KEY = (() => {
  const m = new Map();
  for (const [key, t] of Object.entries(TEAMS)) {
    m.set(key.toLowerCase(), key);
    for (const a of t.aliases) m.set(a.toLowerCase(), key);
    m.set(t.code.toLowerCase(), key);
    m.set(t.he, key);
  }
  return m;
})();

const NEUTRAL_FLAG = ['#8a93a6', '#c2c9d6'];

// Resolve any provider's team name to our canonical entry. Returns null for
// knockout placeholders (1A / 2B / 3A/B/C/D/F / W74 / L101) and unknowns.
export function lookupTeam(name) {
  if (!name) return null;
  const key = NAME_TO_KEY.get(String(name).trim().toLowerCase());
  if (!key) return null;
  return { key, iso: ISO[TEAMS[key].code] || null, ...TEAMS[key] };
}

// Knockout placeholder → Hebrew label (e.g. "1A" → "מנצחת בית A").
const GROUP_LETTERS = 'ABCDEFGHIJKL';
export function placeholderLabel(token) {
  const t = String(token || '').trim();
  let m;
  if ((m = t.match(/^1([A-L])$/))) return `מנצחת בית ${m[1]}`;
  if ((m = t.match(/^2([A-L])$/))) return `מקום 2 בית ${m[1]}`;
  if ((m = t.match(/^3(.+)$/)))    return `מקום 3 (${m[1]})`;            // e.g. 3A/B/C/D/F
  if ((m = t.match(/^W(\d+)$/)))   return `מנצחת משחק ${m[1]}`;
  if ((m = t.match(/^L(\d+)$/)))   return `מפסידת משחק ${m[1]}`;
  return t;
}

// Display name for any token: Hebrew team name, else a Hebrew placeholder label.
export function displayHe(name) {
  const t = lookupTeam(name);
  if (t) return t.he;
  return placeholderLabel(name);
}

export function flagOf(name) {
  const t = lookupTeam(name);
  return t ? t.flag : NEUTRAL_FLAG;
}
