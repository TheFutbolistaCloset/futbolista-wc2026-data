#!/usr/bin/env node
// LOCAL preview of the WC2026 team pages — zero store risk (reads only; publishes nothing).
// Assembles real section CSS + real generated body snippets + REAL products (fetched read-only)
// into a clickable local mini-site. Serve /tmp/wc26-preview with any static server.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { HAS_JERSEY } from '../lib/jersey.mjs';
import { slugOf, TEAMS } from '../lib/teams.mjs';
import { productsFor } from '../lib/preview-lib.mjs';

const THEME = process.env.WC_THEME_DIR || '/Users/galvaknin/futbolista-dev-wt';
const OUT = '/tmp/wc26-preview';
mkdirSync(OUT, { recursive: true });

const read = (p) => readFileSync(`${THEME}/${p}`, 'utf-8');
const styleOf = (file) => (read(file).match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1].replace(/\{\{\s*sid\s*\}\}/g, 'S');
const whenBlock = (file, slug) => {
  const m = read(file).match(new RegExp(`\\{%- when '${slug}' -%\\}([\\s\\S]*?)\\{%- (?:when|else) `));
  return (m ? m[1] : '').replace(/\{\{\s*sid\s*\}\}/g, 'S');
};
// rewrite Liquid route links → local files
const localLinks = (s) => s
  .replace(/\{\{\s*routes\.collections_url\s*\}\}\/wc2026-([a-z-]+)/g, '$1.html')
  .replace(/\{\{\s*routes\.collections_url\s*\}\}\/world-cup-2026-football-shirts/g, '#all')
  .replace(/\{\{\s*routes\.root_url\s*\}\}pages\/world-cup-2026-hub/g, 'index.html')
  .replace(/href="\{\{\s*routes\.search_url\s*\}\}[^"]*"/g, 'href="#soon" data-soon="1"');

const heroCss = styleOf('sections/wc2026-team-hero.liquid');
const infoCss = styleOf('sections/wc2026-team-info.liquid');
const faqCss = styleOf('sections/wc2026-team-faq.liquid');
const moreCss = styleOf('sections/wc2026-team-more.liquid');
const versionsCss = styleOf('sections/wc2026-team-versions.liquid');
const bodyOf = (file) => (read(file).match(/<\/style>([\s\S]*?)\{%\s*schema/) || [, ''])[1].replace(/\{\{\s*sid\s*\}\}/g, 'S').replace(/\{\{[^}]*\| default:\s*(\d+)[^}]*\}\}/g, '$1');
const versionsBody = bodyOf('sections/wc2026-team-versions.liquid');
const trustUl = (read('sections/wc2026-team-hero.liquid').match(/<ul class="wc26t__trust"[\s\S]*?<\/ul>/) || [''])[0];
const moreTail = localLinks((read('snippets/wc2026-team-more-body.liquid').match(/\{%-?\s*endcase\s*-?%\}([\s\S]*)$/) || [, ''])[1]);
const gridBody = localLinks(read('snippets/wc2026-team-grid.liquid').replace(/\{%-[\s\S]*?-%\}/g, '').replace(/^[\s\S]*?<style>/, '<style>'));

// ── read-only product fetch (storefront-accurate; drops DRAFT/ARCHIVED) — lib/preview-lib.mjs ──

const teams = Object.values(TEAMS).map((t) => ({ code: t.code, slug: slugOf(t.code), he: t.he })).filter((t) => t.slug);

const sizedImg = (url, w) => (url ? url + (url.includes('?') ? '&' : '?') + 'width=' + w : '');
const shirtCard = (p, i) => `<a class="wc26t__shirt wc26t__shirt--${i}" href="#" title="${(p.title || '').replace(/"/g, '')}"><img src="${sizedImg(p.img, 360)}" width="320" height="320" alt="" loading="eager"></a>`;
const gridCard = (p) => `<a class="pv-card" href="#"><div class="pv-card__img"><img src="${sizedImg(p.img, 400)}" loading="lazy" alt=""></div><div class="pv-card__t">${(p.title || '').replace(/</g, '')}</div>${p.price ? `<div class="pv-card__p">₪${p.price}</div>` : ''}</a>`;

const PV_CSS = `
  .pv-bar{position:sticky;top:0;z-index:20;background:#0f1830;color:#fff;font:600 13px/1 'FtbAssistant','Assistant',sans-serif;direction:rtl;padding:9px 16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
  .pv-bar a{color:#9ec1ff;text-decoration:none;font-weight:700}.pv-bar b{color:#FFD700}
  .pv-grid-wrap{max-width:1180px;margin:0 auto;padding:24px 16px 8px;direction:rtl;font-family:'FtbAssistant','FtbAssistant','Assistant',sans-serif}
  .pv-grid-wrap h2{font-size:22px;font-weight:800;color:#0f1830;margin:0 0 16px}
  .pv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
  @media(min-width:750px){.pv-grid{grid-template-columns:repeat(4,1fr)}}
  .pv-card{display:block;text-decoration:none;color:#0f1830;background:#fff;border:1px solid #e7ebf2;border-radius:14px;overflow:hidden;transition:box-shadow .18s,transform .18s}
  .pv-card:hover{box-shadow:0 12px 28px rgba(10,125,189,.14);transform:translateY(-3px)}
  .pv-card__img{aspect-ratio:1/1;background:#f4f6fa}.pv-card__img img{width:100%;height:100%;object-fit:cover;display:block}
  .pv-card__t{font-size:13px;font-weight:600;line-height:1.4;padding:10px 12px 2px}
  .pv-card__p{font-size:14px;font-weight:800;color:#334fb4;padding:0 12px 12px}`;

const HEAD = (title) => `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>:root{font-size:62.5%;--font-body-family:'FtbAssistant','Assistant',sans-serif;--font-heading-family:'FtbAssistant','Assistant',sans-serif}body{margin:0;background:#f6f8fc}</style>
<style>${heroCss}</style><style>${versionsCss}</style><style>${infoCss}</style><style>${faqCss}</style><style>${moreCss}</style><style>${PV_CSS}</style></head><body>`;
const BAR = `<div class="pv-bar"><b>תצוגה מקומית · WC2026 Team Pages</b><a href="index.html">כל הנבחרות</a><span>— לא פורסם, לא נוגע ב-Live</span></div>`;

function teamPage(t, prods) {
  const heroBody = whenBlock('snippets/wc2026-team-hero-body.liquid', t.slug);
  const infoBody = whenBlock('snippets/wc2026-team-info-body.liquid', t.slug);
  const faqBody = whenBlock('snippets/wc2026-team-faq-body.liquid', t.slug);
  const moreBody = localLinks(whenBlock('snippets/wc2026-team-more-body.liquid', t.slug));
  const hasJ = prods.length > 0;
  const shirts = prods.slice(0, 3).map((p, k) => shirtCard(p, k + 1)).join('');
  const comingSoon = `<div class="wc26t__soon"><p class="wc26t__soon-note">החולצות של הנבחרת בדרך — השאירו מייל ונעדכן אתכם ברגע שהן יעלו.</p><div class="wc26t__soon-row"><input type="email" placeholder="המייל שלך"><button type="button">עדכנו אותי</button></div><a class="wc26t__soon-all" href="#all">בינתיים — לכל חולצות המונדיאל ›</a></div>`;
  const hero_extra = hasJ ? `<div class="wc26t__shirts">${shirts}</div>` : comingSoon;
  const grid = hasJ ? `<section class="pv-grid-wrap"><h2>החולצות של נבחרת ${t.he}</h2><div class="pv-grid">${prods.map(gridCard).join('')}</div></section>` : '';
  return HEAD('חולצות נבחרת ' + t.he) + BAR + `
<div class="wc26t" id="wc26t-S">
  <div class="wc26t__hero"><div class="wc26t__wash" aria-hidden="true"><span class="wc26t__blob wc26t__blob--1"></span><span class="wc26t__blob wc26t__blob--2"></span></div>
    <div class="wc26t__grid">${heroBody}${hero_extra}</div>
  </div>
  <div class="wc26t__ribbon" aria-hidden="true"></div>
  <div class="wc26t__trust-band">${trustUl}</div>
</div>
<div class="wc26tv" id="wc26tv-S">${versionsBody}</div>
${grid}
<div class="wc26ti" id="wc26ti-S">${infoBody}</div>
<div class="wc26tf" id="wc26tf-S">${faqBody}</div>
<div class="wc26tm" id="wc26tm-S">${moreBody}${moreTail}</div>
</body></html>`;
}

console.log('Fetching products for', teams.length, 'collections (read-only)…');
let totalImgs = 0;
for (const t of teams) {
  const prods = productsFor(t.slug);
  totalImgs += prods.length;
  writeFileSync(`${OUT}/${t.slug}.html`, teamPage(t, prods), 'utf-8');
  console.log(`  ✓ ${t.slug.padEnd(14)} ${prods.length} products`);
}
// index = hub flag grid (real snippet), local links
writeFileSync(`${OUT}/index.html`, HEAD('כל הנבחרות · WC2026') + BAR + `<div id="wc2026-hub" style="--wc-container:1120px;--wc-ink:#0f1830;--wc-ink-2:#4a5573;--wc-line:#e4e9f2;--wc-surface:#fff;--wc-blue:#334fb4;font-family:'FtbAssistant','FtbAssistant','Assistant',sans-serif">${gridBody}</div></body></html>`, 'utf-8');
console.log(`\nWrote ${teams.length} team pages + index to ${OUT} (${totalImgs} product images).`);
