// Server-side renderer — emits the SAME DOM/classes as the client renderer
// (preview/assets/wc-hub.js), so wc-hub.css styles it identically, but as static
// crawlable HTML for SEO. Output is dropped INSIDE the JS mount nodes; on load
// wc-hub.js clear()s + rebuilds them with filters/favorites/live. Crawler & no-JS
// users get the full content; real users get the interactive version.
//
// Renders STATIC states only (scheduled = Israel time; finished = score, winner
// bold). No live/today/filter UI (those are JS-only, ephemeral, non-SEO).

// Accurate flags via lipis/flag-icons (canonical: lib/teams.mjs FLAG_BASE). 1x1 square SVGs
// clip to a circle via .wc-flag { border-radius:50%; overflow:hidden } + img object-fit:cover.
const FLAG_BASE = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/1x1/';
const STAGE_HE = { r32: '1/16 גמר', r16: '1/8 גמר', qf: 'רבע גמר', sf: 'חצי גמר', third: 'מקום 3', final: 'גמר', ko: 'נוקאאוט' };

const SVG = {
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.2a1.5 1.5 0 0 0 1.5 1.3h8.6a1.5 1.5 0 0 0 1.5-1.2L22 7H6"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
};

// HTML-escape text + attribute values (& → &amp; makes search-URL hrefs valid HTML).
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function icon(name, cls) { return `<span class="${cls || ''}" aria-hidden="true">${SVG[name] || ''}</span>`; }

function flag(iso, fl, alt, cls) {
  const bg = fl && fl[0] ? ` style="background:linear-gradient(135deg,${esc(fl[0])},${esc(fl[1] || fl[0])})"` : '';
  const img = iso ? `<img src="${esc(FLAG_BASE + iso + '.svg')}" alt="${esc(alt || '')}" loading="lazy" decoding="async">` : '';
  return `<span class="wc-flag${cls ? ' ' + cls : ''}"${bg}>${img}</span>`;
}
function pair(a, b, cls) {
  return `<span class="wc-pair${cls ? ' ' + cls : ''}"><span>${esc(a)}</span><span class="wc-pair__c">:</span><span>${esc(b)}</span></span>`;
}
function badge(m) {
  if (m.stage === 'group' && m.group) return `<span class="wc-badge wc-badge--group">בית ${esc(m.group)}</span>`;
  return `<span class="wc-badge wc-badge--stage">${esc(STAGE_HE[m.stage] || m.stage)}</span>`;
}
function statusPill(m) {
  if (m.status === 'finished') return `<span class="wc-status wc-status--done"><span>הסתיים</span></span>`;
  return `<span class="wc-status wc-status--soon"><span>טרם שוחק</span></span>`;
}
function teamSide(side, code, iso, heDisplay, heFull, fl, isWin) {
  const f = flag(iso, fl, heFull);
  const n = `<span class="wc-team__name" title="${esc(heFull)}">${esc(heDisplay || heFull)}</span>`;
  const inner = side === 1 ? f + n : n + f;
  return `<div class="wc-team wc-team--${side}${isWin ? ' is-win' : ''}">${inner}</div>`;
}
function mid(m) {
  if (m.status === 'finished' && m.score) return `<div class="wc-mid">${pair(m.score[0], m.score[1], 'wc-score')}</div>`;
  return `<div class="wc-mid"><span class="wc-time">${esc(m.time_il || '—')}</span><span class="wc-time__tz">שעון ישראל</span></div>`;
}
function teamJersey(feed, code) {
  const t = feed.teams && feed.teams[code];
  return t && t.jersey && t.jersey.has ? { url: t.jersey.url, he: t.he } : null;
}
function shopPill(j) {
  return `<a class="wc-shop" href="${esc(j.url)}">${icon('cart')}<span>חולצות ${esc(j.he)}</span>${icon('chev')}</a>`;
}
function card(feed, m, allJerseysUrl) {
  const win1 = m.status === 'finished' && m.score && m.score[0] > m.score[1];
  const win2 = m.status === 'finished' && m.score && m.score[1] > m.score[0];
  const meta = `<div class="wc-card__meta"><div class="wc-card__metaleft">${badge(m)}</div>${statusPill(m)}</div>`;
  const board = `<div class="wc-board">${teamSide(1, m.t1, m.t1_iso, m.t1_short, m.t1_he, m.t1_flag, win1)}${mid(m)}${teamSide(2, m.t2, m.t2_iso, m.t2_short, m.t2_he, m.t2_flag, win2)}</div>`;
  const j1 = teamJersey(feed, m.t1), j2 = teamJersey(feed, m.t2);
  let cta = '';
  if (j1) cta += shopPill(j1);
  if (j2) cta += shopPill(j2);
  if (!j1 && !j2) cta += `<a class="wc-shop wc-shop--ghost" href="${esc(allJerseysUrl)}">${icon('cart')}<span>כל חולצות המונדיאל</span></a>`;
  if (m.venue_he || m.venue) cta += `<span class="wc-card__venue" style="margin-inline-start:auto">${icon('pin')}<span>${esc(m.venue_he || m.venue)}</span></span>`;
  return `<article class="wc-card${m.status === 'finished' ? ' is-finished' : ''}">${meta}${board}<div class="wc-card__cta">${cta}</div></article>`;
}

// ── Full schedule, grouped by Israel date (matches mountSchedule's render). ──
function renderSchedule(feed, allJerseysUrl) {
  const list = (feed.matches || []).slice().sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity));
  let html = '', curKey = null, open = false;
  for (const m of list) {
    const key = m.date_key || 'tbd';
    if (key !== curKey) {
      if (open) html += '</div></div>';
      curKey = key;
      const head = `<div class="wc-day__head"><span class="wc-day__dow">${esc(m.dow_he || 'מועד ייקבע')}</span>${m.date_il ? `<span class="wc-day__date">${esc(m.date_il)}</span>` : ''}</div>`;
      html += `<div class="wc-day">${head}<div class="wc-cards">`;
      open = true;
    }
    html += card(feed, m, allJerseysUrl);
  }
  if (open) html += '</div></div>';
  return html;
}

// ── Group standings tables (matches mountGroups). ──
function posClass(s) {
  if (s === 'qualified' || s === 'advancing') return 'is-up';
  if (s === 'third-pending' || s === 'third-watch') return 'is-third';
  if (s === 'eliminated') return 'is-out';
  return '';
}
function renderStandings(feed) {
  let html = '';
  for (const g of Object.keys(feed.groups || {}).sort()) {
    const gd = feed.groups[g];
    const anyPlayed = gd.standings.some((r) => r.p > 0);
    const tagTxt = gd.complete ? 'שלב הבתים הסתיים' : (anyPlayed ? 'בעיצומו' : 'טרם החל');
    const heads = ['#', 'נבחרת', 'מש', 'נצ', 'תי', 'הפ', 'שע', '+/-', 'נק'];
    const thead = heads.map((h, i) => `<th class="${i === 1 ? 'wc-tbl__team' : (i >= 3 && i <= 5 ? 'wc-col-min' : '')}">${esc(h)}</th>`).join('');
    const rows = gd.standings.map((r) => {
      const cell = `<span class="wc-tbl__teamcell">${flag(r.iso, r.flag, r.he)}<span>${esc(r.he)}</span></span>`;
      return `<tr class="${posClass(r.status)}">`
        + `<td class="wc-tbl__pos">${esc(r.pos)}</td>`
        + `<td class="wc-tbl__team">${cell}</td>`
        + `<td>${esc(r.p)}</td>`
        + `<td class="wc-col-min">${esc(r.w)}</td><td class="wc-col-min">${esc(r.d)}</td><td class="wc-col-min">${esc(r.l)}</td>`
        + `<td>${pair(r.gf, r.ga)}</td>`
        + `<td class="wc-tbl__gd">${r.gd > 0 ? '+' : ''}${esc(r.gd)}</td>`
        + `<td class="wc-tbl__pts">${esc(r.pts)}</td></tr>`;
    }).join('');
    html += `<div class="wc-grp"><div class="wc-grp__head"><span class="wc-grp__name">בית ${esc(g)}</span>`
      + `<span class="wc-grp__tag${gd.complete ? ' is-done' : ''}">${esc(tagTxt)}</span></div>`
      + `<table class="wc-tbl"><thead><tr>${thead}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  return html;
}

// ── SportsEvent ItemList JSON-LD (server-side; mirrors wc-hub.js buildJsonLd). ──
function renderJsonLd(feed) {
  const items = (feed.matches || [])
    .filter((m) => m.kickoff_utc && feed.teams[m.t1] && feed.teams[m.t2])
    .map((m, i) => ({
      '@type': 'ListItem', position: i + 1, item: {
        '@type': 'SportsEvent', name: `${m.t1_he} נגד ${m.t2_he} · מונדיאל 2026`,
        startDate: m.kickoff_utc, eventStatus: 'https://schema.org/EventScheduled', sport: 'Soccer',
        location: { '@type': 'Place', name: m.venue_he || m.venue || '' },
        competitor: [{ '@type': 'SportsTeam', name: m.t1_he }, { '@type': 'SportsTeam', name: m.t2_he }],
      },
    }));
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'לוח משחקי מונדיאל 2026 בשעון ישראל', numberOfItems: items.length, itemListElement: items };
  return `<script type="application/ld+json" data-wc-ssr>\n${JSON.stringify(ld, null, 2)}\n</script>`;
}

// Returns the three server-rendered partials the build writes as theme snippets.
export function renderSSR(feed, opts = {}) {
  const allJerseysUrl = opts.allJerseysUrl || '/collections/world-cup-2026-football-shirts';
  return {
    schedule: renderSchedule(feed, allJerseysUrl),
    standings: renderStandings(feed),
    jsonld: renderJsonLd(feed),
  };
}
