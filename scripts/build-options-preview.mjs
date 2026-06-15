#!/usr/bin/env node
// LOCAL OPTIONS preview — three "match-night" hero/layout directions for the WC2026 team pages,
// matching the live hub (/pages/world-cup-2026-hub): navy gradient + drifting glows (flag-tinted),
// gold badge, tricolor ribbon, #f6f8fc glass body, FtbAssistant. Zero store risk (read-only).
// Serve /tmp/wc26-options with any static server; Gal picks A / B / C. After the pick, the chosen
// hero is ported into sections/wc2026-team-hero.liquid (+ lower sections) per the plan.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { TEAMS, slugOf, isoOf, flagUrl } from '../lib/teams.mjs';
import { productsFor } from '../lib/preview-lib.mjs';

const THEME = process.env.WC_THEME_DIR || '/Users/galvaknin/futbolista-dev-wt';
const OUT = '/tmp/wc26-options';
mkdirSync(OUT, { recursive: true });
const read = (p) => readFileSync(`${THEME}/${p}`, 'utf-8');

// Representative teams: accurate-flag commerce (celeste / green-gold / blue-red) + a coming-soon.
const REP = ['argentina', 'brazil', 'france', 'qatar'];
const OPTS = [
  { id: 'A', he: 'מאצ׳-נייט', desc: 'גיבור ממורכז — באדג׳ זהב, אמבלם, כותרת ענקית, ושלישיית חולצות מרחפת על רקע נייבי (הכי קרוב לדף המונדיאל).' },
  { id: 'B', he: 'ספליט', desc: 'גיבור דו-טורי — אמבלם + טקסט + צ׳יפ "המשחק הבא" בצד אחד, מגדל חולצות זכוכית בצד השני. מסחרי ושימושי.' },
  { id: 'C', he: 'ספוטלייט', desc: 'מינימליזם נועז — אמבלם זוהר ענק במרכז, כותרת ענק, ושורת חולצות נקייה מתחת. אדיטוריאלי.' },
];

// ── reuse the existing lower-section CSS + generated bodies (only the hero is being redesigned) ──
const styleOf = (file) => (read(file).match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1].replace(/\{\{\s*sid\s*\}\}/g, 'S');
const whenBlock = (file, slug) => {
  const m = read(file).match(new RegExp(`\\{%- when '${slug}' -%\\}([\\s\\S]*?)\\{%- (?:when|else) `));
  return (m ? m[1] : '').replace(/\{\{\s*sid\s*\}\}/g, 'S');
};
const bodyOf = (file) => (read(file).match(/<\/style>([\s\S]*?)\{%\s*schema/) || [, ''])[1].replace(/\{\{\s*sid\s*\}\}/g, 'S').replace(/\{\{[^}]*\| default:\s*(\d+)[^}]*\}\}/g, '$1');
const noLinks = (s) => s
  .replace(/\{\{\s*routes\.collections_url\s*\}\}\/[a-z0-9-]+/g, '#')
  .replace(/\{\{\s*routes\.root_url\s*\}\}[a-z0-9/-]*/g, '#')
  .replace(/href="\{\{\s*routes\.search_url\s*\}\}[^"]*"/g, 'href="#"');

const infoCss = styleOf('sections/wc2026-team-info.liquid');
const faqCss = styleOf('sections/wc2026-team-faq.liquid');
const moreCss = styleOf('sections/wc2026-team-more.liquid');
const versionsCss = styleOf('sections/wc2026-team-versions.liquid');
const versionsBody = bodyOf('sections/wc2026-team-versions.liquid');

// ── parse the REAL per-team copy out of the generated hero-body (so the preview is truthful) ──
function heroData(slug) {
  const blk = whenBlock('snippets/wc2026-team-hero-body.liquid', slug);
  const v = blk.match(/--team-1:(#[0-9A-Fa-f]+);--team-2:(#[0-9A-Fa-f]+);--team-accent:(#[0-9A-Fa-f]+)/) || [];
  const em = blk.match(/<img src="([^"]+)" alt="([^"]+)"/) || [];
  const ctaM = blk.match(/wc26t__cta([^>]*)>([^<]+)</) || [];
  return {
    team1: v[1] || '#334fb4', team2: v[2] || '#334fb4', accent: v[3] || '#334fb4',
    emblem: em[1] || '', alt: em[2] || '',
    eyebrow: (blk.match(/wc26t__eyebrow">([^<]+)</) || [, ''])[1].trim(),
    h1: (blk.match(/wc26t__title">([^<]+)</) || [, ''])[1].trim(),
    lead: (blk.match(/wc26t__lead">([^<]+)</) || [, ''])[1].trim(),
    cta: (ctaM[2] || '').trim(),
    notify: /data-wc26t-notify/.test(ctaM[1] || ''),
  };
}
// first group-stage fixture → "next match" chip (option B)
function nextMatch(slug) {
  const blk = whenBlock('snippets/wc2026-team-info-body.liquid', slug);
  const tbody = (blk.match(/<tbody>([\s\S]*?)<\/tbody>/) || [, ''])[1];
  const tr = (tbody.match(/<tr>([\s\S]*?)<\/tr>/) || [, ''])[1];
  if (!tr) return null;
  return {
    date: (tr.match(/wc26ti__date">([^<]+)</) || [, ''])[1].trim(),
    oppFlag: (tr.match(/<img src="([^"]+)"/) || [, ''])[1],
    opp: (tr.match(/<span>([^<]+)<\/span>/) || [, ''])[1].trim(),
    venue: (tr.match(/wc26ti__venue">([^<]+)</) || [, ''])[1].trim(),
  };
}

// ── color math: bright CTA + readable ink on navy ──
const hexRgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (rgb) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; const [r, g, b] = rgb; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const brightOf = (a, b) => (lum(hexRgb(a)) >= lum(hexRgb(b)) ? a : b);
const inkOn = (c) => (lum(hexRgb(c)) > 0.45 ? '#0b1322' : '#fff');
const ctaFill = (t1, t2) => { const b = brightOf(t1, t2); return lum(hexRgb(b)) > 0.32 ? b : '#ffd700'; }; // dark flags → gold

const sizedImg = (url, w) => (url ? url + (url.includes('?') ? '&' : '?') + 'width=' + w : '');

// ── shared design system: hub tokens + FtbAssistant + navy hero + glass cards ──
const HEB = 'https://fonts.gstatic.com/s/assistant/v24/2sDcZGJYnIjSi6H75xkzamW5Kb8VZBHR.woff2';
const LAT = 'https://fonts.gstatic.com/s/assistant/v24/2sDcZGJYnIjSi6H75xkzaGW5Kb8VZA.woff2';
const FONTS = [400, 600, 700, 800].map((w) => `
  @font-face{font-family:'FtbAssistant';font-weight:${w};font-display:swap;src:url(${HEB}) format('woff2');unicode-range:U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F;}
  @font-face{font-family:'FtbAssistant';font-weight:${w};font-display:swap;src:url(${LAT}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}`).join('');

const TRUST = `
  <div class="mn-trust"><ul role="list">
    <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 7h13v9H1zM14 10h4l3 3v3h-7v-6z"/><circle cx="5.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg><span>משלוח חינם בכל הזמנה</span></li>
    <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3L4 6l1.5 3L8 8v11h8V8l2.5 1L20 6l-5-3a3 3 0 0 1-6 0z"/></svg><span>עיצוב אישי בחינם</span></li>
    <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-13.4 7.8L3 21l1.2-4.4A9 9 0 1 1 21 12z"/><path d="M9 9.5c.5 2.5 3 5 5.5 5.5l1-1.5 2 1"/></svg><span>שירות אישי בוואטסאפ</span></li>
    <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg><span>תשלום מאובטח</span></li>
    <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h13a5 5 0 0 1 0 10H8"/><path d="M7 4L3 8l4 4"/></svg><span>החלפה והחזרה קלה</span></li>
  </ul></div>`;

const SHARED_CSS = `
*{box-sizing:border-box}
body{margin:0;background:#f6f8fc;font-family:'FtbAssistant','Assistant',sans-serif;direction:rtl;letter-spacing:normal;color:#0f1830}
img{max-width:100%}
.mn{position:relative;overflow:hidden;background:linear-gradient(160deg,#0b1322 0%,#0f1c38 55%,#0d2240 100%);color:#fff}
.mn *{font-family:'FtbAssistant','Assistant',sans-serif;box-sizing:border-box}
.mn__glows{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.mn__glow{position:absolute;border-radius:50%;filter:blur(6px)}
.mn__glow--1{width:480px;height:480px;top:-32%;right:-6%;background:radial-gradient(circle,color-mix(in srgb,var(--t1) 55%,transparent) 0%,transparent 68%);animation:mn-d1 16s ease-in-out infinite alternate}
.mn__glow--2{width:540px;height:540px;bottom:-40%;left:-8%;background:radial-gradient(circle,color-mix(in srgb,var(--t2) 52%,transparent) 0%,transparent 68%);animation:mn-d2 20s ease-in-out infinite alternate}
.mn__glow--g{width:340px;height:340px;top:-14%;left:30%;background:radial-gradient(circle,rgba(255,215,0,.20) 0%,transparent 68%);animation:mn-d3 14s ease-in-out infinite alternate}
@keyframes mn-d1{from{transform:translate(0,0)}to{transform:translate(-26px,18px)}}
@keyframes mn-d2{from{transform:translate(0,0)}to{transform:translate(28px,-20px)}}
@keyframes mn-d3{from{transform:translate(0,0)}to{transform:translate(-18px,14px)}}
.mn__in{position:relative;z-index:1;max-width:1120px;margin:0 auto;padding:56px 24px 52px}
.mn__ribbon{position:relative;z-index:1;height:3px;background:linear-gradient(90deg,#e63929 0 25%,#ffd700 25% 50%,#168542 50% 75%,#0a7dbd 75% 100%)}
.mn__badge{display:inline-flex;align-items:center;gap:7px;padding:7px 15px;border-radius:999px;background:rgba(255,215,0,.10);border:1px solid rgba(255,215,0,.55);color:#ffe680;font-size:13px;font-weight:800;letter-spacing:.02em}
.mn__emblem{display:inline-block;width:104px;height:104px;border-radius:50%;padding:4px;background:#fff;box-shadow:0 12px 30px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.12)}
.mn__emblem img{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover}
.mn__title{margin:0;font-weight:800;font-size:42px;line-height:1.08;letter-spacing:-.02em;color:#fff;text-shadow:0 2px 22px rgba(0,0,0,.35)}
.mn__lead{margin:0;font-weight:500;font-size:17px;line-height:1.6;color:#c7d0e4;max-width:560px}
.mn__cta{display:inline-block;cursor:pointer;text-decoration:none;font-weight:800;font-size:16px;color:var(--cta-ink);background:var(--cta);border:0;border-radius:999px;padding:14px 30px;box-shadow:0 12px 28px -8px color-mix(in srgb,var(--cta) 60%,transparent);transition:transform .18s ease,box-shadow .18s ease}
.mn__cta:hover{transform:translateY(-2px);box-shadow:0 16px 34px -8px color-mix(in srgb,var(--cta) 70%,transparent)}
/* glass shirt cards on navy */
.mn__shirt{display:block;background:rgba(255,255,255,.97);border:1px solid rgba(255,255,255,.5);border-radius:16px;padding:9px 9px 11px;box-shadow:0 22px 48px -16px rgba(0,0,0,.55);text-decoration:none;transition:transform .22s ease,box-shadow .22s ease}
.mn__shirt img{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;border-radius:10px;background:#eef1f6}
.mn__shirt:hover{transform:translateY(-6px) scale(1.03);box-shadow:0 30px 60px -16px rgba(0,0,0,.6);z-index:5}
/* coming-soon glass card on navy */
.mn__soon{width:min(380px,86vw);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(6px);border-radius:18px;padding:22px 20px;text-align:center}
.mn__soon p{margin:0 0 14px;font-size:15px;font-weight:600;color:#dbe3f3;line-height:1.55}
.mn__soon-row{display:flex;gap:8px}
.mn__soon-row input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.92);border-radius:999px;padding:12px 16px;font-size:15px;color:#0f1830}
.mn__soon-row button{flex-shrink:0;cursor:pointer;border:0;border-radius:999px;padding:12px 20px;font-weight:800;font-size:15px;color:var(--cta-ink);background:var(--cta)}
/* trust band */
.mn-trust{background:#fff;border-bottom:1px solid #e4e9f2}
.mn-trust ul{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:0;max-width:1120px;margin:0 auto;padding:14px 16px;list-style:none}
.mn-trust li{display:flex;align-items:center;gap:9px;font-weight:600;font-size:14px;color:#1c1917;padding:2px 20px}
.mn-trust svg{width:21px;height:21px;flex-shrink:0;color:#44403c}
@media(min-width:990px){.mn-trust li+li{border-inline-start:1px solid rgba(0,0,0,.10)}}
@media(max-width:989px){.mn-trust ul{display:grid;grid-template-columns:repeat(2,auto);column-gap:24px;row-gap:12px;justify-content:center}.mn-trust li{padding:0}.mn-trust li:last-child{grid-column:1/-1}}

/* ===== Option A — centered match-night ===== */
.mn--A .mn__in--center{display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px}
.mn--A .mn__head{display:flex;flex-direction:column;align-items:center;gap:14px;max-width:620px}
.mn--A .mn__shirts--fan{display:flex;justify-content:center;align-items:center;margin-top:8px}
.mn--A .mn__shirts--fan .mn__shirt{width:188px}
.mn--A .mn__shirts--fan .mn__shirt:nth-child(1){transform:rotate(-6deg) translateY(12px);z-index:1}
.mn--A .mn__shirts--fan .mn__shirt:nth-child(2){transform:rotate(3deg) translateY(-10px);z-index:2;margin:0 -26px}
.mn--A .mn__shirts--fan .mn__shirt:nth-child(3){transform:rotate(8deg) translateY(14px);z-index:1}
.mn--A .mn__shirts--fan .mn__shirt:hover{transform:translateY(-8px) scale(1.05)}

/* ===== Option B — split (two columns) ===== */
.mn--B .mn__in--split{display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:46px}
.mn--B .mn__col--text{display:flex;flex-direction:column;align-items:flex-start;gap:16px;text-align:right}
.mn--B .mn__row{display:flex;align-items:center;gap:14px}
.mn--B .mn__emblem{width:72px;height:72px}
.mn--B .mn__title{font-size:38px}
.mn--B .mn__next{display:flex;align-items:center;gap:12px;margin-top:4px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:11px 15px}
.mn--B .mn__next b{display:block;font-size:12px;font-weight:800;color:#ffe680;letter-spacing:.03em;margin-bottom:3px}
.mn--B .mn__next-team{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#fff}
.mn--B .mn__next-flag{width:24px;height:24px;border-radius:50%;overflow:hidden;flex-shrink:0;box-shadow:0 0 0 1px rgba(255,255,255,.25)}
.mn--B .mn__next-flag img{width:100%;height:100%;object-fit:cover}
.mn--B .mn__next-date{font-size:13px;font-weight:600;color:#c7d0e4}
.mn--B .mn__shirts--stack{display:flex;flex-direction:column;gap:14px;align-items:center}
.mn--B .mn__shirts--stack .mn__shirt{width:230px}
.mn--B .mn__shirts--stack .mn__shirt:nth-child(1){transform:rotate(-3deg) translateX(26px)}
.mn--B .mn__shirts--stack .mn__shirt:nth-child(2){transform:rotate(2deg);z-index:2}
.mn--B .mn__shirts--stack .mn__shirt:nth-child(3){transform:rotate(-2deg) translateX(-26px)}
.mn--B .mn__shirts--stack .mn__shirt:hover{transform:translateY(-6px) scale(1.04)}

/* ===== Option C — spotlight (bold editorial) ===== */
.mn--C .mn__in{padding-top:62px;padding-bottom:46px}
.mn--C .mn__in--spot{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px}
.mn--C .mn__emblem--xl{position:relative;width:148px;height:148px}
.mn--C .mn__emblem--xl::after{content:'';position:absolute;inset:-26px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--t1) 60%,transparent) 0%,transparent 70%);filter:blur(18px);z-index:-1}
.mn--C .mn__eyebrow-txt{font-size:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#ffe680}
.mn--C .mn__title--xl{font-size:54px;line-height:1.02;letter-spacing:-.03em;max-width:14ch}
.mn--C .mn__shirts--row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;width:100%;max-width:680px;margin-top:18px}
.mn--C .mn__shirts--row .mn__shirt{width:auto}

@media(prefers-reduced-motion:reduce){.mn__glow{animation:none}.mn__cta,.mn__shirt{transition:none}}

/* ===== Tablet / mobile (all options) ===== */
@media(max-width:989px){
  .mn__in{padding:42px 18px 38px}
  .mn--B .mn__in--split{grid-template-columns:1fr;gap:30px}
  .mn--B .mn__col--text{align-items:center;text-align:center}
  .mn--B .mn__shirts--stack{flex-direction:row;justify-content:center}
  .mn--B .mn__shirts--stack .mn__shirt{width:150px}
  .mn--B .mn__shirts--stack .mn__shirt:nth-child(odd){transform:none}
  .mn--B .mn__shirts--stack .mn__shirt:nth-child(2){transform:translateY(-12px)}
  .mn__title{font-size:30px}.mn--B .mn__title,.mn--C .mn__title--xl{font-size:32px}
  .mn__lead{font-size:15px}
}
@media(max-width:749px){
  .mn__title{font-size:27px}.mn--C .mn__title--xl{font-size:30px}
  .mn__emblem{width:84px;height:84px}.mn--C .mn__emblem--xl{width:112px;height:112px}
  .mn__cta{font-size:14px;padding:13px 24px;min-height:44px}
  .mn--A .mn__shirts--fan .mn__shirt{width:108px}
  .mn--A .mn__shirts--fan .mn__shirt:nth-child(2){margin:0 -14px}
  .mn--C .mn__shirts--row{gap:10px}
}`;

// ── shirt + soon markup ──
const shirtCard = (p) => `<a class="mn__shirt" href="#" title="${(p.title || '').replace(/"/g, '')}"><img src="${sizedImg(p.img, 380)}" width="320" height="320" alt="" loading="eager"></a>`;
const soonCard = (d) => `<div class="mn__soon"><p>החולצות של הנבחרת בדרך — השאירו מייל ונעדכן אתכם ברגע שהן יעלו.</p><div class="mn__soon-row"><input type="email" placeholder="המייל שלך"><button type="button">עדכנו אותי</button></div></div>`;

// ── the three hero builders ──
function heroA(d, shirtsHtml) {
  return `<section class="mn mn--A" style="--t1:${d.team1};--t2:${d.team2};--cta:${d.cta_fill};--cta-ink:${d.cta_ink}">
    <div class="mn__glows" aria-hidden="true"><span class="mn__glow mn__glow--1"></span><span class="mn__glow mn__glow--2"></span><span class="mn__glow mn__glow--g"></span></div>
    <div class="mn__in mn__in--center">
      <div class="mn__head">
        <span class="mn__badge">${d.eyebrow}</span>
        <span class="mn__emblem"><img src="${d.emblem}" alt="${d.alt}" width="120" height="120"></span>
        <h1 class="mn__title">${d.h1}</h1>
        <p class="mn__lead">${d.lead}</p>
        <a class="mn__cta" href="#">${d.cta}</a>
      </div>
      <div class="mn__shirts mn__shirts--fan">${shirtsHtml}</div>
    </div>
    <div class="mn__ribbon"></div>
  </section>`;
}
function heroB(d, shirtsHtml, nm) {
  const next = nm && !d.notify ? `<div class="mn__next"><div><b>המשחק הבא</b><div class="mn__next-team"><span class="mn__next-flag"><img src="${nm.oppFlag}" alt=""></span><span>מול ${nm.opp}</span></div></div><div class="mn__next-date">${nm.date} · ${nm.venue}</div></div>` : '';
  return `<section class="mn mn--B" style="--t1:${d.team1};--t2:${d.team2};--cta:${d.cta_fill};--cta-ink:${d.cta_ink}">
    <div class="mn__glows" aria-hidden="true"><span class="mn__glow mn__glow--1"></span><span class="mn__glow mn__glow--2"></span><span class="mn__glow mn__glow--g"></span></div>
    <div class="mn__in mn__in--split">
      <div class="mn__col mn__col--text">
        <div class="mn__row"><span class="mn__emblem"><img src="${d.emblem}" alt="${d.alt}" width="80" height="80"></span><span class="mn__badge">${d.eyebrow}</span></div>
        <h1 class="mn__title">${d.h1}</h1>
        <p class="mn__lead">${d.lead}</p>
        <a class="mn__cta" href="#">${d.cta}</a>
        ${next}
      </div>
      <div class="mn__col mn__col--media"><div class="mn__shirts mn__shirts--stack">${shirtsHtml}</div></div>
    </div>
    <div class="mn__ribbon"></div>
  </section>`;
}
function heroC(d, shirtsHtml) {
  return `<section class="mn mn--C" style="--t1:${d.team1};--t2:${d.team2};--cta:${d.cta_fill};--cta-ink:${d.cta_ink}">
    <div class="mn__glows" aria-hidden="true"><span class="mn__glow mn__glow--1"></span><span class="mn__glow mn__glow--2"></span><span class="mn__glow mn__glow--g"></span></div>
    <div class="mn__in mn__in--spot">
      <span class="mn__emblem mn__emblem--xl"><img src="${d.emblem}" alt="${d.alt}" width="160" height="160"></span>
      <span class="mn__eyebrow-txt">${d.eyebrow}</span>
      <h1 class="mn__title mn__title--xl">${d.h1}</h1>
      <p class="mn__lead">${d.lead}</p>
      <a class="mn__cta" href="#">${d.cta}</a>
      <div class="mn__shirts mn__shirts--row">${shirtsHtml}</div>
    </div>
    <div class="mn__ribbon"></div>
  </section>`;
}
const HERO = { A: heroA, B: heroB, C: heroC };

// ── page assembly ──
function navBar(curOpt, curSlug) {
  const tabs = OPTS.map((o) => `<a class="nav-tab${o.id === curOpt ? ' is-on' : ''}" href="${o.id}-${curSlug}.html">אופציה ${o.id} · ${o.he}</a>`).join('');
  const teams = REP.map((s) => `<a class="nav-team${s === curSlug ? ' is-on' : ''}" href="${curOpt}-${s}.html">${TEAMS[Object.keys(TEAMS).find((k) => slugOf(TEAMS[k].code) === s)].he}</a>`).join('');
  return `<div class="pv-nav"><a class="pv-home" href="index.html">‹ סקירת האופציות</a><div class="pv-tabs">${tabs}</div><div class="pv-teams">${teams}</div></div>`;
}
const NAV_CSS = `
.pv-nav{position:sticky;top:0;z-index:40;background:#0b1322;color:#fff;padding:8px 14px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:13px}
.pv-home{color:#9ec1ff;text-decoration:none;font-weight:700}
.pv-tabs,.pv-teams{display:flex;gap:6px;flex-wrap:wrap}
.pv-tabs a,.pv-teams a{text-decoration:none;border-radius:999px;padding:5px 12px;font-weight:700}
.nav-tab{background:rgba(255,255,255,.08);color:#dbe3f3}.nav-tab.is-on{background:#ffd700;color:#0b1322}
.nav-team{background:transparent;color:#9aa6c2;font-size:12px}.nav-team.is-on{color:#fff;background:rgba(255,255,255,.12)}
.pv-grid-wrap{max-width:1120px;margin:0 auto;padding:30px 16px 8px;direction:rtl}
.pv-grid-wrap h2{font-size:22px;font-weight:800;color:#0f1830;margin:0 0 16px}
.pv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
@media(min-width:750px){.pv-grid{grid-template-columns:repeat(4,1fr)}}
.pv-card{display:block;text-decoration:none;color:#0f1830;background:#fff;border:1px solid #e4e9f2;border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(15,24,48,.04),0 6px 20px -8px rgba(15,24,48,.10)}
.pv-card__img{aspect-ratio:1/1;background:#f1f4fa}.pv-card__img img{width:100%;height:100%;object-fit:cover;display:block}
.pv-card__t{font-size:13px;font-weight:600;line-height:1.4;padding:10px 12px 2px}
.pv-card__p{font-size:14px;font-weight:800;color:#334fb4;padding:0 12px 12px}`;

const gridCard = (p) => `<a class="pv-card" href="#"><div class="pv-card__img"><img src="${sizedImg(p.img, 400)}" loading="lazy" alt=""></div><div class="pv-card__t">${(p.title || '').replace(/</g, '')}</div>${p.price ? `<div class="pv-card__p">₪${p.price}</div>` : ''}</a>`;

function HEAD(title) {
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>:root{font-size:62.5%;--font-body-family:'FtbAssistant','Assistant',sans-serif;--font-heading-family:'FtbAssistant','Assistant',sans-serif}${FONTS}</style>
<style>${SHARED_CSS}</style><style>${NAV_CSS}</style>
<style>${versionsCss}</style><style>${infoCss}</style><style>${faqCss}</style><style>${moreCss}</style></head><body>`;
}

function lowerSections(slug) {
  const infoBody = whenBlock('snippets/wc2026-team-info-body.liquid', slug);
  const faqBody = whenBlock('snippets/wc2026-team-faq-body.liquid', slug);
  const moreBody = noLinks(whenBlock('snippets/wc2026-team-more-body.liquid', slug));
  return `<div class="wc26tv" id="wc26tv-S">${versionsBody}</div>
<div class="wc26ti" id="wc26ti-S">${infoBody}</div>
<div class="wc26tf" id="wc26tf-S">${faqBody}</div>
<div class="wc26tm" id="wc26tm-S">${moreBody}</div>`;
}

function buildPage(optId, slug, prods, d, nm) {
  const hasJ = prods.length > 0 && !d.notify;
  const shirtsHtml = hasJ ? prods.slice(0, 3).map(shirtCard).join('') : soonCard(d);
  const hero = HERO[optId](d, shirtsHtml, nm);
  const grid = hasJ ? `<section class="pv-grid-wrap"><h2>${d.h1}</h2><div class="pv-grid">${prods.map(gridCard).join('')}</div></section>` : '';
  return HEAD(`אופציה ${optId} · ${d.h1}`) + navBar(optId, slug) + hero + TRUST + grid + lowerSections(slug) + `</body></html>`;
}

// ── build ──
console.log('Fetching products (read-only, ACTIVE-only) for', REP.join(', '), '…');
const data = {};
for (const slug of REP) {
  const d = heroData(slug);
  d.cta_fill = d.notify ? ctaFill(d.team1, d.team2) : ctaFill(d.team1, d.team2);
  d.cta_ink = inkOn(d.cta_fill);
  const prods = productsFor(slug);
  const nm = nextMatch(slug);
  data[slug] = { d, prods, nm };
  console.log(`  ✓ ${slug.padEnd(12)} ${prods.length} products (active)`);
  for (const o of OPTS) writeFileSync(`${OUT}/${o.id}-${slug}.html`, buildPage(o.id, slug, prods, d, nm), 'utf-8');
}

// ── index: the three Argentina heroes stacked for side-by-side judging ──
const ix = 'argentina';
const ixD = data[ix].d, ixP = data[ix].prods, ixNm = data[ix].nm;
const stacked = OPTS.map((o) => {
  const hero = HERO[o.id](ixD, (ixP.slice(0, 3).map(shirtCard).join('')), ixNm);
  return `<div class="ix-block"><div class="ix-head"><div><span class="ix-tag">אופציה ${o.id}</span><b>${o.he}</b></div><p>${o.desc}</p><a class="ix-link" href="${o.id}-${ix}.html">צפו בעמוד המלא ›</a></div>${hero}</div>`;
}).join('');
const INDEX = `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>WC2026 Team Pages · 3 אופציות עיצוב</title>
<style>:root{font-size:62.5%}${FONTS}</style><style>${SHARED_CSS}</style>
<style>
body{background:#eef1f7}
.ix-top{max-width:1120px;margin:0 auto;padding:34px 18px 8px}
.ix-top h1{font-size:30px;font-weight:800;margin:0 0 8px;color:#0f1830}
.ix-top p{font-size:16px;color:#4a5573;margin:0 0 6px;line-height:1.6}
.ix-top small{color:#6b7488;font-size:13px}
.ix-block{max-width:1180px;margin:26px auto;padding:0 14px}
.ix-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 18px;padding:0 4px 12px}
.ix-head>div{display:flex;align-items:baseline;gap:10px}
.ix-tag{background:#ffd700;color:#0b1322;font-weight:800;font-size:13px;border-radius:999px;padding:4px 12px}
.ix-head b{font-size:20px;color:#0f1830}
.ix-head p{flex:1 1 320px;margin:0;font-size:14px;color:#4a5573;line-height:1.5}
.ix-link{font-weight:800;font-size:14px;color:#334fb4;text-decoration:none;white-space:nowrap}
.ix-block .mn{border-radius:18px;box-shadow:0 24px 60px -22px rgba(13,27,51,.5)}
.ix-block .mn__ribbon{border-radius:0 0 18px 18px}
</style></head><body>
<div class="ix-top"><h1>שלוש אופציות עיצוב — עמודי נבחרת מונדיאל 2026</h1>
<p>כולן באותה שפת עיצוב של דף המונדיאל (נייבי, זוהר בצבעי הדגל, באדג׳ זהב, פונט Assistant). בחר A / B / C — ואז ניישם על כל 48 הנבחרות.</p>
<small>תצוגה מקומית · לא פורסם · לא נוגע ב-Live · מוצרי draft סוננו (רק חולצות שמופיעות בחנות)</small></div>
${stacked}
<div class="ix-top" style="padding-bottom:40px"><small>צפו בכל אופציה כעמוד מלא + נבחרות נוספות (ברזיל, צרפת, וקטאר — מצב "בקרוב") דרך הקישורים למעלה.</small></div>
</body></html>`;
writeFileSync(`${OUT}/index.html`, INDEX, 'utf-8');

console.log(`\nWrote index + ${REP.length * OPTS.length} option pages to ${OUT}.`);
console.log('Serve:  cd /tmp/wc26-options && python3 -m http.server 8770   →  http://localhost:8770/index.html');
