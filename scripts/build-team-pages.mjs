#!/usr/bin/env node
/*
 * build-team-pages.mjs — generator for the WC2026 PER-TEAM landing pages.
 *
 * Source of truth: lib/teams.mjs (he names, flag colors, iso, slug) + lib/jersey.mjs
 * (HAS_JERSEY — the 30 teams with a live collection) + data/openfootball-2026.json
 * (group-stage fixtures, run through lib/transform.mjs for Israel-time + Hebrew).
 *
 * Two phases:
 *   (A) ALWAYS — write the generated Liquid snippets into the theme:
 *         snippets/wc2026-team-hero-body.liquid     (per-team: css vars + emblem + H1 + lead + CTA)
 *         snippets/wc2026-team-info-body.liquid      (per-team: group + 3-fixture table + editorial)
 *         snippets/wc2026-team-faq-body.liquid       (per-team: visible <details>, mirrors FAQPage)
 *         snippets/wc2026-team-jsonld.liquid         (per-team: SportsTeam + Breadcrumb + FAQPage + ItemList)
 *         snippets/wc2026-team-more-body.liquid      (per-team: same-group siblings + hub + all-WC links)
 *         snippets/wc2026-team-grid.liquid           (hub: all 48 teams by group → team page / search)
 *         snippets/wc2026-chip-links.liquid          (collection hero: he→slug map for chip deep-links)
 *       No parse_json (not a core theme filter) — everything is generated case/when, fully SSR.
 *   (B) GATED behind --apply — set templateSuffix='wc2026-team' on the 30 HAS_JERSEY collections
 *       via Admin GraphQL, so /collections/wc2026-<slug> renders templates/collection.wc2026-team.json.
 *       The theme files are deployed via `shopify theme push` (NOT by this script).
 *
 * Usage:
 *   WC_THEME_DIR=/path/to/theme node scripts/build-team-pages.mjs            # write snippets only
 *   WC_THEME_DIR=/path/to/theme node scripts/build-team-pages.mjs --apply    # + wire collection suffixes
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawnSync } from 'child_process';
import { TEAMS, ISO, slugOf, lookupTeam, flagUrl } from '../lib/teams.mjs';
import { HAS_JERSEY, searchUrl } from '../lib/jersey.mjs';
import { transform } from '../lib/transform.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const THEME_DIR = process.env.WC_THEME_DIR || join(process.env.HOME || '', 'futbolista-dev');
const SNIPPETS = join(THEME_DIR, 'snippets');
const STORE = process.env.SHOPIFY_STORE || '143f82.myshopify.com';
const APPLY = process.argv.includes('--apply');
// Flags: accurate lipis/flag-icons via flagUrl() (lib/teams.mjs).

if (!existsSync(SNIPPETS)) { console.error(`✗ snippets dir not found: ${SNIPPETS}\n  set WC_THEME_DIR to the theme repo.`); process.exit(1); }

/* ── WCAG contrast: pick a team accent that reads AA (≥4.5:1) with white text ── */
const hexRgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const rgbHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const relLum = (rgb) => { const a = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
const contrast = (a, b) => { const l1 = relLum(a), l2 = relLum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
const BRAND_BLUE = '#334fb4'; // store button color — AAA 7.2:1 on white (per wc2026-collection-hero)
function accentFor(hex) {
  let rgb = hexRgb(hex);
  const white = [255, 255, 255];
  for (let i = 0; i < 8; i++) {
    if (contrast(rgb, white) >= 4.5) return rgbHex(rgb);
    rgb = rgb.map((v) => v * 0.86); // darken toward AA
  }
  return BRAND_BLUE; // light flag (yellow/sky/white) that can't reach AA → safe brand fallback
}

/* ── Navy-hero CTA: a BRIGHT flag color that pops on dark navy (else gold). Returns fill + ink.
   The Spotlight hero sits on navy, so the AA-on-white accent above reads too dark there. ── */
const GOLD = '#ffd700';
function brightFor(hexA, hexB) {
  const a = hexRgb(hexA), b = hexRgb(hexB);
  const bright = relLum(a) >= relLum(b) ? a : b;
  const fill = relLum(bright) > 0.32 ? rgbHex(bright) : GOLD; // too-dark flags → gold
  const ink = relLum(hexRgb(fill)) > 0.45 ? '#0b1322' : '#fff';
  return { fill, ink };
}

/* ── Hebrew helpers ── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); // HTML-safe (attrs/text)
function joinHe(arr) { if (arr.length <= 1) return arr.join(''); return arr.slice(0, -1).join(', ') + ' ו' + arr[arr.length - 1]; }

/* ── Build the per-team model from the canonical data ── */
const raw = JSON.parse(readFileSync(join(REPO, 'data', 'openfootball-2026.json'), 'utf-8'));
const feed = transform(raw, { now: Date.parse('2026-06-01T00:00:00Z') }); // fixed "now" → deterministic (we only use static schedule fields)

// code → group letter, taken from group-stage fixtures (teamsBlock().group is null pre-standings)
const groupByCode = {};
for (const m of feed.matches) {
  if (m.stage !== 'group' || !m.group) continue;
  groupByCode[m.t1] = m.group; groupByCode[m.t2] = m.group;
}
// code → its 3 group-stage fixtures (sorted by kickoff), with the opponent's display fields
function fixturesFor(code) {
  return feed.matches
    .filter((m) => m.stage === 'group' && (m.t1 === code || m.t2 === code))
    .sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity))
    .map((m) => {
      const home = m.t1 === code;
      return {
        opp_he: home ? m.t2_he : m.t1_he,
        opp_iso: home ? m.t2_iso : m.t1_iso,
        opp_flag: home ? m.t2_flag : m.t1_flag,
        date_il: m.date_il, dow_he: m.dow_he, time_il: m.time_il, venue_he: m.venue_he,
      };
    });
}
// code → { code, key, he, iso, flag, group, slug, hasJersey }
function info(code) {
  const t = feed.teams[code];
  return { code, key: t.key, he: t.he, iso: t.iso, flag: t.flag, group: groupByCode[code] || '', slug: slugOf(code), hasJersey: HAS_JERSEY.includes(code) };
}

const jerseySet = new Set(HAS_JERSEY);
const searchQ = (he) => encodeURIComponent('נבחרת ' + he + ' מונדיאל 2026');
// Liquid route objects (theme standard) — collection page if the team has one, else search.
const teamUrl = (code, he) => (jerseySet.has(code)
  ? `{{ routes.collections_url }}/wc2026-${slugOf(code)}`
  : `{{ routes.search_url }}?q=${searchQ(he)}&type=product`);

/* ── Hebrew copy (gal-hebrew-vetted templates; team/venue names come pre-vetted from teams.mjs/venues.mjs) ── */
const copy = {
  h1: (he) => `חולצות נבחרת ${he} למונדיאל 2026`,
  eyebrow: (g) => `בית ${g} · מונדיאל 2026`,
  heroLead: (he) => `כל חולצות נבחרת ${he} למונדיאל 2026 במקום אחד — גרסת אוהד וגרסת שחקן, עם עיצוב אישי בחינם ומשלוח חינם. בוא לייצג את ${he} בקיץ הגדול.`,
  cta: (he) => `לכל החולצות של ${he} ›`,
  infoH2: (he) => `נבחרת ${he} במונדיאל 2026`,
  infoPara: (he, g, oppList) => `נבחרת ${he} שובצה לבית ${g} במונדיאל 2026, לצד ${oppList}. שלב הבתים יקבע אם ${he} תמשיך הלאה לנוקאאוט. כאן ריכזנו את כל החולצות של הנבחרת — גרסת אוהד וגרסת שחקן, עם עיצוב אישי בחינם (הדפסת שם ומספר) ומשלוח חינם, בדיוק בזמן למונדיאל.`,
  fixturesHead: (he) => `משחקי הבית של ${he} (שעון ישראל)`,
  faq: (he, g, oppList, fixturesList) => [
    [`באיזה בית משחקת נבחרת ${he} במונדיאל 2026?`, `נבחרת ${he} שובצה לבית ${g}, לצד ${oppList}.`],
    [`מתי המשחקים של נבחרת ${he} בשלב הבתים?`, `שלושת משחקי הבית של ${he} (שעון ישראל): ${fixturesList}.`],
    [`אילו חולצות של נבחרת ${he} אפשר לקנות בחנות?`, `בחנות תמצאו את החולצות של נבחרת ${he} למונדיאל 2026 — גרסת אוהד וגרסת שחקן, עם עיצוב אישי בחינם (הדפסת שם ומספר).`],
    [`האם המחיר כולל עיצוב אישי ומשלוח?`, `כן — כל חולצות נבחרת ${he} מגיעות עם עיצוב אישי (שם ומספר) בחינם, ומשלוח חינם בכל הזמנה.`],
  ],
  // ── "coming soon" variants (teams without a jersey collection yet) ──
  heroLeadSoon: (he) => `החולצות של נבחרת ${he} למונדיאל 2026 בדרך לאתר. השאירו מייל ונעדכן אתכם ברגע שהן יעלו — גרסת אוהד וגרסת שחקן, עם עיצוב אישי בחינם.`,
  ctaSoon: () => `עדכנו אותי כשהן יגיעו ›`,
  infoParaSoon: (he, g, oppList) => `נבחרת ${he} שובצה לבית ${g} במונדיאל 2026, לצד ${oppList}. החולצות של הנבחרת עוד לא עלו לאתר — השאירו מייל בעמוד ונעדכן אתכם ברגע שהן יגיעו. בינתיים אפשר לעבור לכל חולצות המונדיאל.`,
  faqSoon: (he, g, oppList, fixturesList) => [
    [`באיזה בית משחקת נבחרת ${he} במונדיאל 2026?`, `נבחרת ${he} שובצה לבית ${g}, לצד ${oppList}.`],
    [`מתי המשחקים של נבחרת ${he} בשלב הבתים?`, `שלושת משחקי הבית של ${he} (שעון ישראל): ${fixturesList}.`],
    [`מתי יגיעו החולצות של נבחרת ${he} למונדיאל?`, `החולצות של ${he} עדיין לא עלו לאתר. השאירו מייל בעמוד ונעדכן אתכם ברגע שהן יגיעו — גרסת אוהד וגרסת שחקן, עם עיצוב אישי בחינם.`],
    [`החולצות יגיעו עם עיצוב אישי ומשלוח חינם?`, `כן — כל חולצות הנבחרת יגיעו עם עיצוב אישי (שם ומספר) בחינם ומשלוח חינם, בדיוק כמו שאר חולצות המונדיאל.`],
  ],
};

const flagChip = (iso, he, cls = 'wc-flag', flag, size = 26) =>
  `<span class="${cls}"${flag ? ` style="background:linear-gradient(135deg,${flag[0]},${flag[1]})"` : ''}><img src="${flagUrl(iso)}" alt="${esc(he)}" width="${size}" height="${size}" loading="lazy" decoding="async"></span>`;

const GEN_HEADER = (name, extra = '') => `{%- comment -%}\n  ${name} — AUTO-GENERATED by futbolista-wc2026-data/scripts/build-team-pages.mjs.\n  Do NOT edit by hand; edit the generator and re-run.${extra ? '\n  ' + extra : ''}\n{%- endcomment -%}\n`;

/* ════════════════════════ SNIPPET BUILDERS ════════════════════════ */
// ALL 48 teams. Teams with a jersey collection get the normal commerce page; the rest get a
// "coming soon / notify me" state. hasJersey is baked here; re-run when HAS_JERSEY changes.
const teams = Object.values(TEAMS).map((t) => info(t.code)).filter((t) => t.slug && t.he);

// 1 · hero body — sets --team-* on the section root, then emblem + eyebrow + H1 + lead + CTA
function buildHeroBody() {
  let out = GEN_HEADER('wc2026-team-hero-body', 'Params: slug, sid (section.id). Sets --team-1/2/accent + --team-bright(/-ink) on #wc26t-{sid}.');
  out += '{%- case slug -%}\n';
  for (const t of teams) {
    const accent = accentFor(t.flag[0]);
    const bright = brightFor(t.flag[0], t.flag[1]);
    out += `{%- when '${t.slug}' -%}\n`;
    out += `<style>#wc26t-{{ sid }}{--team-1:${t.flag[0]};--team-2:${t.flag[1]};--team-accent:${accent};--team-bright:${bright.fill};--team-bright-ink:${bright.ink};}</style>\n`;
    out += `<div class="wc26t__head">\n`;
    out += `  <span class="wc26t__emblem"><img src="${flagUrl(t.iso)}" alt="${esc(t.he)}" width="120" height="120" loading="eager" fetchpriority="high" decoding="async"></span>\n`;
    out += `  <span class="wc26t__eyebrow">${esc(copy.eyebrow(t.group))}</span>\n`;
    out += `  <h1 class="wc26t__title">${esc(copy.h1(t.he))}</h1>\n`;
    if (t.hasJersey) {
      out += `  <p class="wc26t__lead">${esc(copy.heroLead(t.he))}</p>\n`;
      out += `  <button type="button" class="wc26t__cta" data-wc26t-scroll>${esc(copy.cta(t.he))}</button>\n`;
    } else {
      out += `  <p class="wc26t__lead">${esc(copy.heroLeadSoon(t.he))}</p>\n`;
      out += `  <button type="button" class="wc26t__cta" data-wc26t-notify>${esc(copy.ctaSoon())}</button>\n`;
    }
    out += `</div>\n`;
  }
  out += '{%- else -%}\n';
  out += `<div class="wc26t__head"><h1 class="wc26t__title">חולצות מונדיאל 2026</h1></div>\n`;
  out += '{%- endcase -%}\n';
  return out;
}

// 2 · info body — H2 + editorial paragraph + group-stage fixtures table
function buildInfoBody() {
  let out = GEN_HEADER('wc2026-team-info-body', 'Param: slug. Server-rendered group + fixtures + editorial (crawlable).');
  out += '{%- case slug -%}\n';
  for (const t of teams) {
    const fx = fixturesFor(t.code);
    const oppList = joinHe(fx.map((f) => f.opp_he));
    out += `{%- when '${t.slug}' -%}\n`;
    out += `<h2 class="wc26ti__h2">${esc(copy.infoH2(t.he))}</h2>\n`;
    out += `<p class="wc26ti__lead">${esc(t.hasJersey ? copy.infoPara(t.he, t.group, oppList) : copy.infoParaSoon(t.he, t.group, oppList))}</p>\n`;
    out += `<h3 class="wc26ti__fxhead">${esc(copy.fixturesHead(t.he))}</h3>\n`;
    out += `<div class="wc26ti__tblwrap"><table class="wc26ti__tbl"><thead><tr><th>תאריך</th><th>יריבה</th><th>אצטדיון</th></tr></thead><tbody>`;
    for (const f of fx) {
      out += `<tr><td class="wc26ti__date">${esc(f.dow_he)}, ${esc(f.date_il)} · ${esc(f.time_il)}</td>`;
      out += `<td class="wc26ti__opp"><span class="wc26ti__oppcell">${flagChip(f.opp_iso, f.opp_he, 'wc26ti__flag', f.opp_flag, 24)}<span>${esc(f.opp_he)}</span></span></td>`;
      out += `<td class="wc26ti__venue">${esc(f.venue_he)}</td></tr>`;
    }
    out += `</tbody></table></div>\n`;
  }
  out += '{%- else -%}\n{%- endcase -%}\n';
  return out;
}

// 3 · faq body — visible <details> (text is byte-identical to the FAQPage schema in the jsonld snippet)
function buildFaqBody() {
  let out = GEN_HEADER('wc2026-team-faq-body', 'Param: slug. Visible FAQ; text mirrors FAQPage schema exactly.');
  out += '{%- case slug -%}\n';
  for (const t of teams) {
    const fx = fixturesFor(t.code);
    const oppList = joinHe(fx.map((f) => f.opp_he));
    const fixturesList = fx.map((f) => `מול ${f.opp_he} ב-${f.date_il} בשעה ${f.time_il}`).join('; ');
    const qa = (t.hasJersey ? copy.faq : copy.faqSoon)(t.he, t.group, oppList, fixturesList);
    out += `{%- when '${t.slug}' -%}\n`;
    out += `<h2 class="wc26tf__h2">שאלות נפוצות · נבחרת ${esc(t.he)}</h2>\n`;
    for (const [q, a] of qa) out += `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>\n`;
  }
  out += '{%- else -%}\n{%- endcase -%}\n';
  return out;
}

// 4 · JSON-LD — SportsTeam + BreadcrumbList + FAQPage (baked) + ItemList (collection.products)
function buildJsonLd() {
  let out = GEN_HEADER('wc2026-team-jsonld', 'Params: slug, collection. Emits SportsTeam + Breadcrumb + FAQPage + ItemList.');
  out += '{%- case slug -%}\n';
  for (const t of teams) {
    const fx = fixturesFor(t.code);
    const oppList = joinHe(fx.map((f) => f.opp_he));
    const fixturesList = fx.map((f) => `מול ${f.opp_he} ב-${f.date_il} בשעה ${f.time_il}`).join('; ');
    const qa = (t.hasJersey ? copy.faq : copy.faqSoon)(t.he, t.group, oppList, fixturesList);
    const faqEntities = qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }));
    out += `{%- when '${t.slug}' -%}{%- assign t_he = ${JSON.stringify(t.he)} -%}\n`;
    out += `<script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@type': 'SportsTeam', name: t.he, sport: 'Soccer' })}\n</script>\n`;
    out += `<script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqEntities })}\n</script>\n`;
  }
  out += '{%- else -%}{%- assign t_he = collection.title -%}\n{%- endcase -%}\n';
  // Breadcrumb + ItemList use Liquid (collection/shop) — same for every team, t_he from the case above.
  out += `<script type="application/ld+json">
{ "@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
  {"@type":"ListItem","position":1,"name":"דף הבית","item":"{{ shop.url }}{{ routes.root_url }}"},
  {"@type":"ListItem","position":2,"name":"מונדיאל 2026","item":"{{ shop.url }}{{ routes.root_url }}collections/world-cup-2026-football-shirts"},
  {"@type":"ListItem","position":3,"name":{{ t_he | prepend: 'חולצות נבחרת ' | append: ' למונדיאל 2026' | json }},"item":"{{ shop.url }}{{ collection.url }}"}
]}
</script>
{%- if collection.products.size > 0 -%}
<script type="application/ld+json">
{ "@context":"https://schema.org","@type":"ItemList","name":{{ t_he | prepend: 'חולצות נבחרת ' | append: ' למונדיאל 2026' | json }},"numberOfItems":{{ collection.products.size }},"itemListElement":[
{%- for product in collection.products limit: 50 -%}
{"@type":"ListItem","position":{{ forloop.index }},"item":{"@type":"Product","name":{{ product.title | json }},"url":{{ product.url | prepend: shop.url | json }}{%- if product.featured_image -%},"image":{{ product.featured_image | image_url: width: 800 | prepend: 'https:' | json }}{%- endif -%},"brand":{"@type":"Brand","name":"The Futbolista Closet"},"offers":{"@type":"Offer","priceCurrency":{{ cart.currency.iso_code | default: 'ILS' | json }},"price":{{ product.price | divided_by: 100.0 | json }},"availability":{%- if product.available -%}"https://schema.org/InStock"{%- else -%}"https://schema.org/OutOfStock"{%- endif -%},"url":{{ product.url | prepend: shop.url | json }}}}}{%- unless forloop.last -%},{%- endunless -%}
{%- endfor -%}
]}
</script>
{%- endif -%}
`;
  return out;
}

// 5 · more body — same-group siblings + back-to-hub + all-WC
function buildMoreBody() {
  let out = GEN_HEADER('wc2026-team-more-body', 'Param: slug. Same-group sibling links + hub + all-WC (internal linking).');
  out += '{%- case slug -%}\n';
  for (const t of teams) {
    const siblings = HAS_JERSEY.concat(Object.values(TEAMS).map((x) => x.code)) // ensure all 48 considered
      .filter((c, i, arr) => arr.indexOf(c) === i)
      .map((c) => ({ code: c, ...feed.teams[c], group: groupByCode[c] }))
      .filter((s) => s.group === t.group && s.code !== t.code);
    out += `{%- when '${t.slug}' -%}\n`;
    out += `<h2 class="wc26tm__h2">עוד נבחרות מבית ${esc(t.group)}</h2>\n`;
    out += `<div class="wc26tm__teams">\n`;
    for (const s of siblings) {
      out += `  <a class="wc26tm__team" href="${teamUrl(s.code, s.he)}">${flagChip(s.iso, s.he, 'wc26tm__flag', s.flag, 26)}<span>${esc(s.he)}</span></a>\n`;
    }
    out += `</div>\n`;
  }
  out += '{%- else -%}\n{%- endcase -%}\n';
  out += `<div class="wc26tm__links">
  <a class="wc26tm__link" href="{{ routes.collections_url }}/world-cup-2026-football-shirts">כל חולצות המונדיאל ›</a>
  <a class="wc26tm__link" href="{{ routes.root_url }}pages/world-cup-2026-hub">לוח המשחקים והטבלאות ›</a>
</div>\n`;
  return out;
}

// 6 · hub grid — all 48 teams by group; HAS_JERSEY → team page, else → search
function buildGrid() {
  const GROUPS = 'ABCDEFGHIJKL'.split('');
  const byGroup = {}; GROUPS.forEach((g) => (byGroup[g] = []));
  for (const code of Object.keys(feed.teams)) {
    const g = groupByCode[code]; if (!g || !byGroup[g]) continue;
    const tt = feed.teams[code];
    byGroup[g].push({ code, he: tt.he, iso: tt.iso, flag: tt.flag });
  }
  let out = GEN_HEADER('wc2026-team-grid', 'Standalone. Rendered from sections/wc2026-hub.liquid (inside #wc2026-hub).');
  out += `<style>
  #wc2026-hub .wc26-tg { max-width: var(--wc-container, 1120px); margin: 8px auto 0; padding: 16px; }
  #wc2026-hub .wc26-tg__title { font-size: 24px; font-weight: 800; color: var(--wc-ink, #0f1830); margin: 0 0 4px; }
  #wc2026-hub .wc26-tg__sub { font-size: 15px; font-weight: 500; color: var(--wc-ink-2, #4a5573); margin: 0 0 18px; }
  #wc2026-hub .wc26-tg__grp { margin-bottom: 18px; }
  #wc2026-hub .wc26-tg__glabel { display: inline-block; font-size: 13px; font-weight: 800; color: var(--wc-blue, #334fb4); letter-spacing: .02em; margin: 0 0 8px; }
  #wc2026-hub .wc26-tg__teams { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  @media (min-width: 750px) { #wc2026-hub .wc26-tg__teams { grid-template-columns: repeat(4, 1fr); } }
  #wc2026-hub .wc26-tg__team { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid var(--wc-line, #e4e9f2); border-radius: 12px; background: var(--wc-surface, #fff); text-decoration: none; color: var(--wc-ink, #0f1830); font-size: 14px; font-weight: 700; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
  #wc2026-hub .wc26-tg__team:hover { border-color: var(--wc-blue, #334fb4); box-shadow: 0 6px 16px rgba(51,79,180,.12); }
  #wc2026-hub .wc26-tg__flag { width: 26px; height: 26px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: inline-flex; }
  #wc2026-hub .wc26-tg__flag img { width: 100%; height: 100%; object-fit: cover; }
  @media (prefers-reduced-motion: reduce) { #wc2026-hub .wc26-tg__team { transition: none; } }
</style>
<section class="wc26-tg" aria-label="נבחרות מונדיאל 2026">
  <h2 class="wc26-tg__title">כל הנבחרות במונדיאל 2026</h2>
  <p class="wc26-tg__sub">בחרו נבחרת כדי לראות את החולצות שלה</p>
`;
  for (const g of GROUPS) {
    if (!byGroup[g].length) continue;
    out += `  <div class="wc26-tg__grp"><span class="wc26-tg__glabel">בית ${g}</span><div class="wc26-tg__teams">\n`;
    for (const s of byGroup[g]) {
      out += `    <a class="wc26-tg__team" href="${teamUrl(s.code, s.he)}">${flagChip(s.iso, s.he, 'wc26-tg__flag', null, 26)}<span>${esc(s.he)}</span></a>\n`;
    }
    out += `  </div></div>\n`;
  }
  out += `</section>\n`;
  return out;
}

// 7 · chip links — he→slug map for the main collection hero chip deep-links (HAS_JERSEY only)
function buildChipLinks() {
  const map = {};
  for (const t of teams) map[t.he] = t.slug;
  let out = GEN_HEADER('wc2026-chip-links', 'Rendered from sections/wc2026-collection-hero.liquid. Sets window.WC26_TEAM_SLUGS.');
  out += `<script>window.WC26_TEAM_SLUGS = ${JSON.stringify(map)}; window.WC26_COLLECTIONS_URL = "{{ routes.collections_url }}";</script>\n`;
  return out;
}

/* ════════════════════════ WRITE ════════════════════════ */
const files = [
  ['wc2026-team-hero-body.liquid', buildHeroBody()],
  ['wc2026-team-info-body.liquid', buildInfoBody()],
  ['wc2026-team-faq-body.liquid', buildFaqBody()],
  ['wc2026-team-jsonld.liquid', buildJsonLd()],
  ['wc2026-team-more-body.liquid', buildMoreBody()],
  ['wc2026-team-grid.liquid', buildGrid()],
  ['wc2026-chip-links.liquid', buildChipLinks()],
];
for (const [name, content] of files) {
  writeFileSync(join(SNIPPETS, name), content, 'utf-8');
  console.log(`✓ wrote snippets/${name}  (${content.length} bytes)`);
}

console.log(`\nTeams: ${teams.length} (${teams.filter((t) => t.hasJersey).length} with jerseys, ${teams.filter((t) => !t.hasJersey).length} coming-soon)`);
console.log('Contrast-safe accents:');
for (const t of teams) {
  const a = accentFor(t.flag[0]);
  const fb = a === BRAND_BLUE && t.flag[0].toLowerCase() !== BRAND_BLUE ? '  ← brand-blue fallback (light flag)' : '';
  console.log(`  ${t.slug.padEnd(14)} ${t.he.padEnd(16)} bית ${t.group}  flag ${t.flag[0]} → accent ${a}${fb}`);
}

/* ════════════════════════ PHASE B — suffix wiring (GATED) ════════════════════════ */
if (!APPLY) {
  console.log(`\n(snippets written. Re-run with --apply to set templateSuffix='wc2026-team' on the ${teams.length} collections.)`);
  console.log('Collections that would be wired:');
  teams.forEach((t) => console.log(`  wc2026-${t.slug}`));
  process.exit(0);
}

function gql(query, variables, mutate) {
  const args = ['store', 'execute', '--store', STORE, '--json'];
  if (mutate) args.push('--allow-mutations');
  args.push('--query', query);
  if (variables) args.push('--variables', JSON.stringify(variables));
  const r = spawnSync('shopify', args, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('CLI error: ' + (r.stderr || r.stdout || '').slice(0, 300));
  const out = r.stdout;
  try { return JSON.parse(out); } catch { const i = out.indexOf('{'), j = out.lastIndexOf('}'); return JSON.parse(out.slice(i, j + 1)); }
}
const UPDATE = `mutation($id:ID!,$suffix:String){ collectionUpdate(input:{id:$id, templateSuffix:$suffix}){ collection{ id handle templateSuffix } userErrors{ field message } } }`;
let ok = 0, miss = 0, fail = 0;
for (const t of teams) {
  const handle = `wc2026-${t.slug}`;
  try {
    const q = gql(`query{ collectionByHandle(handle:"${handle}"){ id templateSuffix } }`);
    const col = (q.data?.collectionByHandle || q.collectionByHandle);
    if (!col) { console.log(`✗ ${handle}: collection not found (not created yet?)`); miss++; continue; }
    const res = gql(UPDATE, { id: col.id, suffix: 'wc2026-team' }, true);
    const cu = res.data?.collectionUpdate || res.collectionUpdate;
    if (cu.userErrors?.length) { console.log(`✗ ${handle}: ${JSON.stringify(cu.userErrors)}`); fail++; continue; }
    console.log(`✓ ${handle} → templateSuffix='${cu.collection.templateSuffix}'`);
    ok++;
  } catch (e) { console.log(`✗ ${handle}: ${e.message.slice(0, 120)}`); fail++; }
}
console.log(`\nDone. wired=${ok} not-found=${miss} failed=${fail}`);
