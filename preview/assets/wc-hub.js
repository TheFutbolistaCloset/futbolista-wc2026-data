/* ============================================================================
   WC2026 Hub — shared renderer. Fetches the feed once, renders whichever
   module mounts are present (#wc-next / #wc-today / #wc-schedule / #wc-groups).
   Framework-free, XSS-safe (DOM building + textContent; SVG from trusted
   constants only). SOURCE OF TRUTH — ports verbatim to theme assets/wc-hub.js.

   Config (set before this script, or via data-* on .wc-hub):
     window.WC_HUB = {
       feed: '/path/wc2026-data.json',
       collectionBase: 'https://.../collections/world-cup-2026-football-shirts',
       allJerseysUrl: '.../collections/world-cup-2026-football-shirts'
     }
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.WC_HUB || {};
  var FEED_URL = CFG.feed || './sample-data.json';
  var COLL = CFG.collectionBase || '#';
  var ALL_JERSEYS = CFG.allJerseysUrl || COLL;
  var FLAG_BASE = CFG.flagBase || 'https://cdn.jsdelivr.net/gh/HatScripts/circle-flags/flags/';

  var SVG = {
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a1 1 0 0 0-1 1c0 2.2 1.8 4 4 4M17 6h3a1 1 0 0 1 1 1c0 2.2-1.8 4-4 4"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.2a1.5 1.5 0 0 0 1.5 1.3h8.6a1.5 1.5 0 0 0 1.5-1.2L22 7H6"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3z"/></svg>',
    starO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l2.5 5 5.5.8-4 3.9 1 5.5L12 16.6 7.5 19.2l1-5.5-4-3.9 5.5-.8L12 4z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
  };

  // ── tiny DOM helpers ──
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function svg(name, cls) { var s = document.createElement('span'); if (cls) s.className = cls; s.innerHTML = SVG[name] || ''; s.setAttribute('aria-hidden', 'true'); return s; }
  // Round national flag (circle-flags SVG). Gradient of the team's flag colors
  // stays as the background so placeholders/knockout slots and any failed image
  // still show a sensible colored disc.
  function flagEl(iso, flag, alt, cls) {
    var d = el('span', 'wc-flag' + (cls ? ' ' + cls : ''));
    if (flag && flag[0]) d.style.background = 'linear-gradient(135deg,' + flag[0] + ',' + (flag[1] || flag[0]) + ')';
    if (iso) {
      var img = document.createElement('img');
      img.src = FLAG_BASE + iso + '.svg';
      img.alt = alt || ''; img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error', function () { img.remove(); });
      d.appendChild(img);
    }
    return d;
  }
  // RTL-safe "a : b" — flex (not text) so bidi can't reorder; team1/gf sits on the right.
  function scoreEl(a, b, cls) { var s = el('span', 'wc-pair' + (cls ? ' ' + cls : '')); s.appendChild(el('span', null, String(a))); s.appendChild(el('span', 'wc-pair__c', ':')); s.appendChild(el('span', null, String(b))); return s; }
  // small ★ toggle for a team inside a match card (favorite from anywhere)
  function favStar(code) {
    var b = el('button', 'wc-cardfav' + (isFav(code) ? ' is-on' : '')); b.type = 'button';
    b.setAttribute('aria-label', (isFav(code) ? 'הסר ממועדפים: ' : 'הוסף למועדפים: ') + code);
    b.appendChild(svg(isFav(code) ? 'star' : 'starO'));
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); setFav(code); });
    return b;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }

  // ── favorites (localStorage) ──
  var FAV_KEY = 'wc26_favs';
  function getFavs() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; } }
  function isFav(code) { return getFavs().indexOf(code) >= 0; }
  function toggleFav(code) { var f = getFavs(); var i = f.indexOf(code); if (i >= 0) f.splice(i, 1); else f.push(code); try { localStorage.setItem(FAV_KEY, JSON.stringify(f)); } catch (e) {} return f; }
  // toggle + broadcast so the strip / today / schedule all re-render in sync
  function setFav(code) { toggleFav(code); document.dispatchEvent(new CustomEvent('wc:favchange', { detail: { code: code } })); }

  // ── add-to-calendar (.ics) ──
  function pad2(n) { return String(n).padStart(2, '0'); }
  function icsStamp(d) { return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T' + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + '00Z'; }
  function downloadIcs(m) {
    if (!m.kickoff_utc) return;
    var title = 'מונדיאל 2026: ' + m.t1_he + ' נגד ' + m.t2_he;
    var loc = (m.venue_he || m.venue || '').replace(/[,;]/g, ' ');
    var desc = (m.stage === 'group' ? 'בית ' + m.group : (STAGE_HE[m.stage] || '')) + ' · שעון ישראל';
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Futbolista//WC2026//HE', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + m.id + '@futbolista', 'DTSTAMP:' + icsStamp(new Date()), 'DTSTART:' + icsStamp(new Date(m.kickoff_utc)),
      'DURATION:PT2H', 'SUMMARY:' + title, 'LOCATION:' + loc, 'DESCRIPTION:' + desc, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'wc2026-' + m.id + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ── labels ──
  var STAGE_HE = { r32: '1/16 גמר', r16: '1/8 גמר', qf: 'רבע גמר', sf: 'חצי גמר', third: 'מקום 3', final: 'גמר', ko: 'נוקאאוט' };
  function groupOrStageBadge(m) {
    if (m.stage === 'group' && m.group) { var b = el('span', 'wc-badge wc-badge--group', 'בית ' + m.group); return b; }
    return el('span', 'wc-badge wc-badge--stage', STAGE_HE[m.stage] || m.stage);
  }
  function statusPill(m) {
    if (m.status === 'live') { var l = el('span', 'wc-status wc-status--live'); l.appendChild(el('span', 'wc-dot')); l.appendChild(el('span', null, 'משחק חי')); return l; }
    if (m.status === 'finished') { var f = el('span', 'wc-status wc-status--done'); f.appendChild(el('span', null, 'הסתיים')); return f; }
    var s = el('span', 'wc-status wc-status--soon'); s.appendChild(el('span', null, 'טרם שוחק')); return s;
  }

  // jersey deep-link for a team code (uses feed.teams[code].jersey if present)
  function teamJersey(feed, code) {
    var t = feed.teams && feed.teams[code];
    if (t && t.jersey && t.jersey.has) return { url: t.jersey.url || (COLL + '#team=' + encodeURIComponent(t.he)), he: t.he };
    return null;
  }

  // ── match card ──
  function teamSide(side, code, iso, heDisplay, heFull, flag, isWin, favable) {
    var t = el('div', 'wc-team wc-team--' + side + (isWin ? ' is-win' : ''));
    var f = flagEl(iso, flag, heFull), n = el('span', 'wc-team__name', heDisplay || heFull);
    n.title = heFull; // full name on hover; short shows in the compact card
    // flags stay on the OUTER edge; the star sits on the inner side
    if (side === 1) { t.appendChild(f); t.appendChild(n); if (favable) t.appendChild(favStar(code)); }
    else { if (favable) t.appendChild(favStar(code)); t.appendChild(n); t.appendChild(f); }
    return t;
  }
  function midBlock(m) {
    var mid = el('div', 'wc-mid');
    if (m.status === 'live') {
      if (m.score) mid.appendChild(scoreEl(m.score[0], m.score[1], 'wc-score'));
      if (m.minute != null) mid.appendChild(el('span', 'wc-min', m.minute + "'"));
    } else if (m.status === 'finished') {
      if (m.score) mid.appendChild(scoreEl(m.score[0], m.score[1], 'wc-score'));
    } else {
      mid.appendChild(el('span', 'wc-time', m.time_il || '—'));
      mid.appendChild(el('span', 'wc-time__tz', 'שעון ישראל'));
    }
    return mid;
  }
  function matchCard(feed, m, opts) {
    opts = opts || {};
    var win1 = m.status === 'finished' && m.score && m.score[0] > m.score[1];
    var win2 = m.status === 'finished' && m.score && m.score[1] > m.score[0];
    var card = el('article', 'wc-card' + (m.status === 'live' ? ' is-live' : '') + (m.status === 'finished' ? ' is-finished' : ''));

    var meta = el('div', 'wc-card__meta');
    var left = el('div', 'wc-card__metaleft');
    left.appendChild(groupOrStageBadge(m));
    meta.appendChild(left);
    meta.appendChild(statusPill(m));
    card.appendChild(meta);

    var board = el('div', 'wc-board');
    var favable1 = !opts.noFav && !!(feed.teams && feed.teams[m.t1]);
    var favable2 = !opts.noFav && !!(feed.teams && feed.teams[m.t2]);
    board.appendChild(teamSide(1, m.t1, m.t1_iso, m.t1_short, m.t1_he, m.t1_flag, win1, favable1));
    board.appendChild(midBlock(m));
    board.appendChild(teamSide(2, m.t2, m.t2_iso, m.t2_short, m.t2_he, m.t2_flag, win2, favable2));
    card.appendChild(board);

    // date line for scheduled non-today games (schedule view)
    if (opts.showDate && m.date_il && m.status === 'scheduled') {
      var dl = el('div', null); dl.style.textAlign = 'center'; dl.style.marginTop = '4px';
      dl.appendChild(el('span', 'wc-date', m.dow_he ? (m.dow_he + ' · ' + m.date_il) : m.date_il));
      card.appendChild(dl);
    }

    // CTA row
    var cta = el('div', 'wc-card__cta');
    var j1 = teamJersey(feed, m.t1), j2 = teamJersey(feed, m.t2);
    if (j1) cta.appendChild(shopPill(j1));
    if (j2) cta.appendChild(shopPill(j2));
    if (!j1 && !j2) {
      var ghost = el('a', 'wc-shop wc-shop--ghost'); ghost.href = ALL_JERSEYS; ghost.appendChild(svg('cart')); ghost.appendChild(el('span', null, 'כל חולצות המונדיאל')); cta.appendChild(ghost);
    }
    if (m.status === 'scheduled' && m.kickoff_utc) {
      var cb = el('button', 'wc-cal'); cb.type = 'button'; cb.appendChild(svg('cal')); cb.appendChild(el('span', null, 'ליומן'));
      cb.addEventListener('click', function () { downloadIcs(m); });
      cta.appendChild(cb);
    }
    if (opts.star) { var st = el('span', 'wc-star'); st.appendChild(svg('star')); st.appendChild(el('span', null, 'כוכב למעקב: ' + opts.star)); cta.appendChild(st); }
    if (m.venue_he || m.venue) {
      var v = el('span', 'wc-card__venue'); v.style.marginInlineStart = 'auto'; v.appendChild(svg('pin')); v.appendChild(el('span', null, m.venue_he || m.venue));
      if (!opts.star) cta.appendChild(v);
    }
    card.appendChild(cta);
    return card;
  }
  function shopPill(j) { var a = el('a', 'wc-shop'); a.href = j.url; a.appendChild(svg('cart')); a.appendChild(el('span', null, 'חולצות ' + j.he)); a.appendChild(svg('chev')); return a; }

  // ── HERO next-match chip (live or countdown) ──
  function mountHero(feed, baseNow) {
    var box = document.getElementById('wc-next');
    if (!box) return;
    var t0 = Date.now();
    function now() { return baseNow + (Date.now() - t0); }
    function pick() {
      var live = feed.matches.filter(function (m) { return m.status === 'live'; });
      if (live.length) return { type: 'live', m: live[0] };
      var up = feed.matches.filter(function (m) { return m.status === 'scheduled' && m.ts && m.ts > now(); }).sort(function (a, b) { return a.ts - b.ts; });
      if (up.length) return { type: 'next', m: up[0] };
      return null;
    }
    function fmt(ms) { var s = Math.max(0, Math.floor(ms / 1000)); var h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60), se = s % 60; var p = function (x) { return String(x).padStart(2, '0'); }; return (h > 0 ? h + ':' : '') + p(mi) + ':' + p(se); }
    function render() {
      var sel = pick();
      clear(box);
      if (!sel) { box.style.display = 'none'; return; }
      box.style.display = '';
      var m = sel.m;
      box.className = 'wc-next' + (sel.type === 'live' ? ' is-live' : '');
      box.href = '#wc-today';
      var top = el('div', 'wc-next__top');
      if (sel.type === 'live') { top.appendChild(svg('bolt')); top.appendChild(el('span', null, 'משחק חי עכשיו' + (m.minute != null ? " · " + m.minute + "'" : ''))); }
      else { top.appendChild(svg('trophy')); top.appendChild(el('span', null, 'המשחק הבא · בעוד ' + fmt(m.ts - now()))); }
      var row = el('div', 'wc-next__row');
      var a = el('span', 'wc-next__team'); a.appendChild(flagEl(m.t1_iso, m.t1_flag, m.t1_he)); a.appendChild(el('span', null, m.t1_he));
      var mid = (sel.type === 'live' && m.score) ? scoreEl(m.score[0], m.score[1], 'wc-next__mid') : el('span', 'wc-next__mid', m.time_il);
      var b = el('span', 'wc-next__team'); b.appendChild(flagEl(m.t2_iso, m.t2_flag, m.t2_he)); b.appendChild(el('span', null, m.t2_he));
      row.appendChild(a); row.appendChild(mid); row.appendChild(b);
      box.appendChild(top); box.appendChild(row);
    }
    render();
    setInterval(render, 1000);
  }

  // ── TODAY (viewing-night window) ──
  function mountToday(feed) {
    var sec = document.getElementById('wc-today');
    if (!sec) return;
    var mount = sec.querySelector('[data-cards]') || sec;
    var note = sec.querySelector('[data-note]');
    function inToday(m) {
      // Strict Israel calendar day: only matches whose IL date is today — plus any
      // match currently in play (so a game crossing midnight stays visible).
      // WC2026 kickoffs are US-evening = IL small hours, so "today" groups a date's
      // early-AM + evening games; tomorrow's games never leak in.
      return m.status === 'live' || !!m.is_today;
    }
    function render() {
      var list = feed.matches.filter(inToday);
      if (!list.length) {
        var future = feed.matches.filter(function (m) { return m.ts && m.date_key && m.status !== 'finished'; });
        if (future.length) {
          var nk = future[0].date_key;
          list = feed.matches.filter(function (m) { return m.date_key === nk; });
          if (note) note.textContent = 'אין משחקים הערב — המשחקים הבאים (' + (list[0] ? list[0].date_il : '') + '):';
        }
      }
      clear(mount);
      if (!list.length) { mount.appendChild(el('div', 'wc-empty', 'אין משחקים מתוכננים כרגע.')); return; }
      var favs = getFavs();
      var favOf = function (m) { return favs.length && (favs.indexOf(m.t1) >= 0 || favs.indexOf(m.t2) >= 0) ? 0 : 1; };
      list.sort(function (a, b) { return favOf(a) - favOf(b) || (a.ts || 0) - (b.ts || 0); });
      list.forEach(function (m) { mount.appendChild(matchCard(feed, m, { showDate: false })); });
    }
    render();
    document.addEventListener('wc:favchange', render);
  }

  // ── SCHEDULE + filters ──
  function mountSchedule(feed) {
    var sec = document.getElementById('wc-schedule');
    if (!sec) return;
    var listMount = sec.querySelector('[data-cards]');
    var chipsWrap = sec.querySelector('[data-chips]');
    var panel = sec.querySelector('[data-panel]');
    var countEl = sec.querySelector('[data-count]');
    if (!listMount || !chipsWrap) return;

    var state = { base: 'all', team: null, group: null, stage: null };

    var BASE = [
      { id: 'all', label: 'הכל' }, { id: 'favs', label: 'הנבחרות שלי', icon: 'starO' }, { id: 'today', label: 'היום' }, { id: 'tomorrow', label: 'מחר' },
      { id: 'live', label: 'משחק חי' }, { id: 'finished', label: 'הסתיימו' }, { id: 'upcoming', label: 'טרם שוחקו' }
    ];
    var EXP = [ { id: 'group', label: 'לפי בית' }, { id: 'stage', label: 'לפי שלב' }, { id: 'team', label: 'לפי נבחרת' } ];

    // base chips
    BASE.forEach(function (b) {
      var c = el('button', 'wc-chip'); c.type = 'button'; c.setAttribute('aria-pressed', b.id === 'all' ? 'true' : 'false'); c.dataset.base = b.id;
      if (b.icon) c.appendChild(svg(b.icon));
      c.appendChild(el('span', null, b.label));
      chipsWrap.appendChild(c);
    });
    // expanding chips
    EXP.forEach(function (e) {
      var c = el('button', 'wc-chip'); c.type = 'button'; c.setAttribute('aria-expanded', 'false'); c.dataset.exp = e.id;
      c.appendChild(el('span', null, e.label)); c.appendChild(svg('chev'));
      chipsWrap.appendChild(c);
    });

    function setBase(id) { state.base = id; state.team = state.group = state.stage = null; closePanel(); syncChips(); render(); }
    function syncChips() {
      chipsWrap.querySelectorAll('[data-base]').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.base === state.base && !state.team && !state.group && !state.stage ? 'true' : 'false'); });
      chipsWrap.querySelectorAll('[data-exp]').forEach(function (c) {
        var on = (c.dataset.exp === 'group' && state.group) || (c.dataset.exp === 'stage' && state.stage) || (c.dataset.exp === 'team' && state.team);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function closePanel() { if (panel) { panel.classList.remove('is-open'); clear(panel); } chipsWrap.querySelectorAll('[data-exp]').forEach(function (c) { c.setAttribute('aria-expanded', 'false'); }); }

    function openPanel(kind, chip) {
      if (!panel) return;
      var isOpen = chip.getAttribute('aria-expanded') === 'true';
      closePanel();
      if (isOpen) return;
      chip.setAttribute('aria-expanded', 'true');
      var grid = el('div', 'wc-panel__grid');
      if (kind === 'group') {
        Object.keys(feed.groups).sort().forEach(function (g) { grid.appendChild(opt('בית ' + g, function () { state.base = 'all'; state.group = g; state.team = state.stage = null; afterPick(); }, state.group === g)); });
      } else if (kind === 'stage') {
        var stages = uniqueStages(feed); stages.forEach(function (s) { grid.appendChild(opt(STAGE_HE[s] || (s === 'group' ? 'שלב הבתים' : s), function () { state.base = 'all'; state.stage = s; state.team = state.group = null; afterPick(); }, state.stage === s)); });
      } else {
        teamsInPlay(feed).forEach(function (t) { grid.appendChild(teamOpt(t)); });
      }
      panel.appendChild(grid);
      panel.classList.add('is-open');
    }
    function afterPick() { closePanel(); syncChips(); render(); }
    function opt(label, on, pressed) { var b = el('button', 'wc-opt'); b.type = 'button'; b.setAttribute('aria-pressed', pressed ? 'true' : 'false'); b.appendChild(el('span', null, label)); b.addEventListener('click', on); return b; }
    function teamOpt(t) {
      var wrap = el('div', 'wc-opt wc-opt--team' + (state.team === t.code ? ' is-on' : ''));
      var pick = el('button', 'wc-opt__pick'); pick.type = 'button';
      pick.appendChild(flagEl(t.iso, t.flag, t.he)); pick.appendChild(el('span', null, t.he));
      pick.addEventListener('click', function () { state.base = 'all'; state.team = t.code; state.group = state.stage = null; afterPick(); });
      var star = el('button', 'wc-fav' + (isFav(t.code) ? ' is-on' : '')); star.type = 'button'; star.setAttribute('aria-label', 'מועדפים: ' + t.he);
      star.appendChild(svg(isFav(t.code) ? 'star' : 'starO'));
      star.addEventListener('click', function () { setFav(t.code); var on = isFav(t.code); star.classList.toggle('is-on', on); clear(star); star.appendChild(svg(on ? 'star' : 'starO')); });
      wrap.appendChild(pick); wrap.appendChild(star);
      return wrap;
    }

    chipsWrap.addEventListener('click', function (e) {
      var base = e.target.closest('[data-base]'); if (base) { setBase(base.dataset.base); return; }
      var exp = e.target.closest('[data-exp]'); if (exp) { openPanel(exp.dataset.exp, exp); }
    });

    function matches() {
      return feed.matches.filter(function (m) {
        if (state.team && m.t1 !== state.team && m.t2 !== state.team) return false;
        if (state.group && m.group !== state.group) return false;
        if (state.stage && m.stage !== state.stage) return false;
        switch (state.base) {
          case 'today': return m.is_today;
          case 'tomorrow': return m.is_tomorrow;
          case 'live': return m.status === 'live';
          case 'finished': return m.status === 'finished';
          case 'upcoming': return m.status === 'scheduled';
          case 'favs': { var f = getFavs(); return f.indexOf(m.t1) >= 0 || f.indexOf(m.t2) >= 0; }
          default: return true;
        }
      });
    }
    function render() {
      var list = matches();
      clear(listMount);
      if (countEl) countEl.textContent = 'מציג ' + list.length + ' משחקים';
      if (!list.length) {
        var msg = state.base === 'favs' ? 'עדיין לא בחרת נבחרות. פתח "לפי נבחרת" וסמן כוכב ⭐ ליד הנבחרות שלך.' : 'אין משחקים שתואמים לסינון.';
        listMount.appendChild(el('div', 'wc-empty', msg)); return;
      }
      // group consecutive matches by Israel date → sticky-ish day headers
      var curKey = null, dayCards = null;
      list.forEach(function (m) {
        var key = m.date_key || 'tbd';
        if (key !== curKey) {
          curKey = key;
          var day = el('div', 'wc-day');
          var head = el('div', 'wc-day__head');
          head.appendChild(el('span', 'wc-day__dow', m.dow_he || 'מועד ייקבע'));
          if (m.date_il) head.appendChild(el('span', 'wc-day__date', m.date_il));
          day.appendChild(head);
          dayCards = el('div', 'wc-cards');
          day.appendChild(dayCards);
          listMount.appendChild(day);
        }
        dayCards.appendChild(matchCard(feed, m, { showDate: false }));
      });
    }

    syncChips(); render();
    document.addEventListener('wc:favchange', render); // refresh card stars + favs filter
    stickyShadow(sec.querySelector('.wc-filter'));
  }

  // ── GROUP standings ──
  function mountGroups(feed) {
    var sec = document.getElementById('wc-groups');
    if (!sec) return;
    var mount = sec.querySelector('[data-groups]') || sec;
    clear(mount);
    Object.keys(feed.groups).sort().forEach(function (g) {
      var gd = feed.groups[g];
      var card = el('div', 'wc-grp');
      var head = el('div', 'wc-grp__head');
      head.appendChild(el('span', 'wc-grp__name', 'בית ' + g));
      var tag = el('span', 'wc-grp__tag' + (gd.complete ? ' is-done' : ''), gd.complete ? 'שלב הבתים הסתיים' : (anyPlayed(gd) ? 'בעיצומו' : 'טרם החל'));
      head.appendChild(tag);
      card.appendChild(head);

      var tbl = el('table', 'wc-tbl');
      var thead = el('thead'); var htr = el('tr');
      ['#', 'נבחרת', 'מש', 'נצ', 'תי', 'הפ', 'שע', '+/-', 'נק'].forEach(function (h, i) {
        var th = el('th', i === 1 ? 'wc-tbl__team' : null, h);
        if (i >= 3 && i <= 5) th.classList.add('wc-col-min'); // נצ/תי/הפ hidden on small
        htr.appendChild(th);
      });
      thead.appendChild(htr); tbl.appendChild(thead);
      var tb = el('tbody');
      gd.standings.forEach(function (r) {
        var tr = el('tr', posClass(r.status));
        tr.appendChild(el('td', 'wc-tbl__pos', String(r.pos)));
        var tc = el('td', 'wc-tbl__team'); var cell = el('span', 'wc-tbl__teamcell'); cell.appendChild(flagEl(r.iso, r.flag, r.he)); cell.appendChild(el('span', null, r.he)); tc.appendChild(cell); tr.appendChild(tc);
        tr.appendChild(el('td', null, String(r.p)));
        tr.appendChild(addMin(el('td', null, String(r.w))));
        tr.appendChild(addMin(el('td', null, String(r.d))));
        tr.appendChild(addMin(el('td', null, String(r.l))));
        var gtd = el('td'); gtd.appendChild(scoreEl(r.gf, r.ga)); tr.appendChild(gtd);
        tr.appendChild(el('td', 'wc-tbl__gd', (r.gd > 0 ? '+' : '') + r.gd));
        tr.appendChild(el('td', 'wc-tbl__pts', String(r.pts)));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); card.appendChild(tbl);
      mount.appendChild(card);
    });
  }
  function addMin(td) { td.classList.add('wc-col-min'); return td; }
  function posClass(status) { if (status === 'qualified' || status === 'advancing') return 'is-up'; if (status === 'third-pending' || status === 'third-watch') return 'is-third'; if (status === 'eliminated') return 'is-out'; return ''; }
  function anyPlayed(gd) { return gd.standings.some(function (r) { return r.p > 0; }); }

  // ── KNOCKOUT BRACKET ──
  // FIFA WC2026 knockout wiring: match id -> its two feeder matches, where
  // t1 = winner of feeders[0] and t2 = winner of feeders[1] (m103 takes the
  // LOSERS of its feeders). The feed drops the W##/L## source codes once a
  // slot resolves, so this tree is static — extracted from the pre-resolution
  // feed and cross-checked against every resolved knockout result.
  var KO_FEEDERS = {
    m089: ['m074', 'm077'], m090: ['m073', 'm075'], m091: ['m076', 'm078'], m092: ['m079', 'm080'],
    m093: ['m083', 'm084'], m094: ['m081', 'm082'], m095: ['m086', 'm088'], m096: ['m085', 'm087'],
    m097: ['m089', 'm090'], m098: ['m093', 'm094'], m099: ['m091', 'm092'], m100: ['m095', 'm096'],
    m101: ['m097', 'm098'], m102: ['m099', 'm100'],
    m104: ['m101', 'm102'], m103: ['m101', 'm102']
  };
  // Two-sided converging layout: side r renders from the right edge inward,
  // side l mirrors from the left edge; the final + third-place sit center.
  var KO_SIDES = {
    r: { r32: ['m074', 'm077', 'm073', 'm075', 'm083', 'm084', 'm081', 'm082'], r16: ['m089', 'm090', 'm093', 'm094'], qf: ['m097', 'm098'], sf: ['m101'] },
    l: { r32: ['m076', 'm078', 'm079', 'm080', 'm086', 'm088', 'm085', 'm087'], r16: ['m091', 'm092', 'm095', 'm096'], qf: ['m099', 'm100'], sf: ['m102'] }
  };
  var KO_ORDER = ['r32', 'r16', 'qf', 'sf', 'final'];

  // Winner of a finished knockout match. A score draw means penalties — the
  // score alone can't tell the winner, but the NEXT match's resolved slot can
  // (the feed writes the advancing team there). Child-first, score fallback.
  function koWinner(byId, feed, id) {
    var m = byId[id];
    if (!m || m.status !== 'finished') return null;
    for (var cid in KO_FEEDERS) {
      if (cid === 'm103') continue; // third-place child holds the LOSERS
      var slot = KO_FEEDERS[cid].indexOf(id);
      if (slot < 0) continue;
      var c = byId[cid];
      if (c) {
        var code = slot === 0 ? c.t1 : c.t2;
        if (feed.teams && feed.teams[code]) return code;
      }
    }
    if (m.score && m.score[0] !== m.score[1]) return m.score[0] > m.score[1] ? m.t1 : m.t2;
    return null; // pens result not yet resolved downstream (brief window)
  }

  // Resolve what a slot of a knockout match should DISPLAY: the feed's resolved
  // team; else a winner/loser derived from the feeder match (covers the window
  // between a whistle and the feed writing the next round); else the feed's
  // Hebrew placeholder ("מנצחת משחק 97") on a gray disc.
  function koSlot(byId, feed, m, slot) {
    var code = slot === 0 ? m.t1 : m.t2;
    var t = feed.teams && feed.teams[code];
    if (t) return { code: code, he: t.he, short: t.heShort || t.he, iso: t.iso, flag: t.flag };
    var f = KO_FEEDERS[m.id];
    if (f) {
      var w = koWinner(byId, feed, f[slot]);
      if (w) {
        if (m.id === 'm103') { // loser slot: the feeder team that is NOT the winner
          var fm = byId[f[slot]];
          w = fm ? (fm.t1 === w ? fm.t2 : fm.t1) : null;
        }
        var wt = w && feed.teams && feed.teams[w];
        if (wt) return { code: w, he: wt.he, short: wt.heShort || wt.he, iso: wt.iso, flag: wt.flag };
      }
    }
    var ph = (slot === 0 ? m.t1_he : m.t2_he) || '';
    // compact for the tight desktop cells: "מנצחת משחק 97" -> "מנצחת 97"
    return { code: null, he: ph, short: ph.replace(' משחק ', ' '), iso: slot === 0 ? m.t1_iso : m.t2_iso, flag: slot === 0 ? m.t1_flag : m.t2_flag };
  }

  function bktTeamRow(byId, feed, m, slot, winCode) {
    var t = koSlot(byId, feed, m, slot);
    var isWin = !!(winCode && t.code === winCode);
    var j = t.code ? teamJersey(feed, t.code) : null;
    var row = el(j ? 'a' : 'div', 'wc-bkt__team' + (isWin ? ' is-win' : '') + (t.code ? '' : ' is-tbd'));
    if (j) { row.href = j.url; row.title = 'חולצות ' + t.he; }
    row.appendChild(flagEl(t.iso, t.flag, t.he));
    var name = el('span', 'wc-bkt__name', t.short || t.he); name.title = t.he;
    row.appendChild(name);
    if (m.status !== 'scheduled' && m.score) {
      var g = el('span', 'wc-bkt__goals', String(m.score[slot]));
      if (isWin || (m.status === 'live')) g.classList.add('is-strong');
      row.appendChild(g);
    }
    return row;
  }

  function bktMatch(byId, feed, id, mods) {
    var m = byId[id];
    if (!m) return el('div', 'wc-bkt__match');
    var win = koWinner(byId, feed, id);
    var c = el('div', 'wc-bkt__match' + (m.status === 'live' ? ' is-live' : '') + (m.status === 'finished' ? ' is-finished' : '') + (mods ? ' ' + mods : ''));
    c.appendChild(bktTeamRow(byId, feed, m, 0, win));
    c.appendChild(bktTeamRow(byId, feed, m, 1, win));
    var meta = el('div', 'wc-bkt__meta');
    if (m.status === 'live') { meta.appendChild(el('span', 'wc-dot')); meta.appendChild(el('span', 'wc-bkt__live', 'חי' + (m.minute != null ? " · " + m.minute + "'" : ''))); }
    else if (m.status === 'scheduled') meta.appendChild(el('span', null, (m.date_il || '') + (m.time_il ? ' · ' + m.time_il : '')));
    else meta.appendChild(el('span', null, 'הסתיים'));
    c.appendChild(meta);
    return c;
  }

  function bktColumn(byId, feed, stage, ids, sideMod) {
    var col = el('div', 'wc-bkt__col wc-bkt__col--' + stage + (sideMod ? ' ' + sideMod : ''));
    col.appendChild(el('div', 'wc-bkt__coltitle', STAGE_HE[stage] || stage));
    var stack = el('div', 'wc-bkt__stack');
    ids.forEach(function (id) { stack.appendChild(bktMatch(byId, feed, id, sideMod ? 'wc-bkt__match--' + (sideMod === 'is-side-r' ? 'r' : 'l') : '')); });
    col.appendChild(stack);
    return col;
  }

  function mountBracket(feed) {
    var sec = document.getElementById('wc-bracket');
    if (!sec) return; // section toggled off in the Theme Editor → silent no-op
    var mount = sec.querySelector('[data-bracket]');
    if (!mount) return;
    var byId = {};
    feed.matches.forEach(function (m) { if (m.stage !== 'group') byId[m.id] = m; });
    if (!byId.m104) return; // knockout data missing → keep the SSR skeleton
    clear(mount);

    // ── desktop: 9-column converging tree (RTL grid: col 1 = right edge) ──
    var tree = el('div', 'wc-bkt');
    tree.appendChild(bktColumn(byId, feed, 'r32', KO_SIDES.r.r32, 'is-side-r'));
    tree.appendChild(bktColumn(byId, feed, 'r16', KO_SIDES.r.r16, 'is-side-r'));
    tree.appendChild(bktColumn(byId, feed, 'qf', KO_SIDES.r.qf, 'is-side-r'));
    tree.appendChild(bktColumn(byId, feed, 'sf', KO_SIDES.r.sf, 'is-side-r'));
    var center = el('div', 'wc-bkt__col wc-bkt__col--final');
    center.appendChild(el('div', 'wc-bkt__coltitle', STAGE_HE.final));
    var cstack = el('div', 'wc-bkt__stack wc-bkt__stack--final');
    var cup = el('div', 'wc-bkt__cup'); cup.appendChild(svg('trophy')); cstack.appendChild(cup);
    cstack.appendChild(bktMatch(byId, feed, 'm104', 'wc-bkt__match--final'));
    cstack.appendChild(el('div', 'wc-bkt__thirdtitle', STAGE_HE.third));
    cstack.appendChild(bktMatch(byId, feed, 'm103', 'wc-bkt__match--third'));
    center.appendChild(cstack);
    tree.appendChild(center);
    tree.appendChild(bktColumn(byId, feed, 'sf', KO_SIDES.l.sf, 'is-side-l'));
    tree.appendChild(bktColumn(byId, feed, 'qf', KO_SIDES.l.qf, 'is-side-l'));
    tree.appendChild(bktColumn(byId, feed, 'r16', KO_SIDES.l.r16, 'is-side-l'));
    tree.appendChild(bktColumn(byId, feed, 'r32', KO_SIDES.l.r32, 'is-side-l'));
    mount.appendChild(tree);

    // ── mobile: round tabs + full match cards, chronological ──
    var mob = el('div', 'wc-bkt-m');
    var tabs = el('div', 'wc-chips wc-bkt-m__tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'בחירת שלב');
    var list = el('div', 'wc-cards');
    function roundMatches(stage) {
      var ids = stage === 'final' ? ['m104', 'm103'] : KO_SIDES.r[stage].concat(KO_SIDES.l[stage]);
      return ids.map(function (id) { return byId[id]; }).filter(Boolean).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    }
    var current = 'final';
    for (var i = 0; i < KO_ORDER.length; i++) {
      var st = KO_ORDER[i];
      if (roundMatches(st).some(function (m) { return m.status !== 'finished'; })) { current = st; break; }
    }
    function renderRound(stage) {
      clear(list);
      roundMatches(stage).forEach(function (m) {
        list.appendChild(matchCard(feed, m, { showDate: true, noFav: true }));
      });
      tabs.querySelectorAll('[data-stage]').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.stage === stage ? 'true' : 'false'); });
    }
    KO_ORDER.forEach(function (st) {
      var c = el('button', 'wc-chip'); c.type = 'button'; c.dataset.stage = st;
      c.setAttribute('aria-pressed', st === current ? 'true' : 'false');
      c.appendChild(el('span', null, STAGE_HE[st]));
      c.addEventListener('click', function () { renderRound(st); });
      tabs.appendChild(c);
    });
    mob.appendChild(tabs); mob.appendChild(list);
    mount.appendChild(mob);
    renderRound(current);
  }

  // ── shared helpers ──
  function uniqueStages(feed) { var seen = {}, out = []; feed.matches.forEach(function (m) { if (!seen[m.stage]) { seen[m.stage] = 1; out.push(m.stage); } }); var order = ['group', 'r32', 'r16', 'qf', 'sf', 'third', 'final', 'ko']; return out.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); }); }
  function teamsInPlay(feed) {
    var codes = {}; feed.matches.forEach(function (m) { if (feed.teams[m.t1]) codes[m.t1] = 1; if (feed.teams[m.t2]) codes[m.t2] = 1; });
    return Object.keys(codes).map(function (c) { return { code: c, he: feed.teams[c].he, flag: feed.teams[c].flag, iso: feed.teams[c].iso }; }).sort(function (a, b) { return a.he.localeCompare(b.he, 'he'); });
  }
  function stickyShadow(barEl) {
    if (!barEl) return;
    var header = document.querySelector('.section-header') || document.querySelector('sticky-header');
    function setTop() { var h = header ? Math.round(header.getBoundingClientRect().height) : 0; barEl.style.setProperty('--wc-sticky-top', h + 'px'); }
    setTop(); window.addEventListener('resize', setTop, { passive: true });
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; var top = parseFloat(getComputedStyle(barEl).top) || 0; barEl.classList.toggle('is-stuck', Math.abs(barEl.getBoundingClientRect().top - top) < 2 && window.scrollY > 80); });
    }, { passive: true });
  }

  // ── MY TEAMS strip (favorites picker, near the top) ──
  function mountMyTeams(feed) {
    var sec = document.getElementById('wc-myteams'); if (!sec) return;
    var strip = sec.querySelector('[data-strip]'); var picker = sec.querySelector('[data-picker]');
    if (!strip) return;
    function renderChips() {
      clear(strip);
      var favs = getFavs();
      if (!favs.length) {
        strip.appendChild(el('span', 'wc-myteams__hint', 'בחר את הנבחרות שלך — הן יוצמדו לראש "משחקי היום", ולכל משחק יש כפתור "ליומן".'));
      } else {
        favs.forEach(function (code) {
          var t = feed.teams[code]; if (!t) return;
          var chip = el('span', 'wc-myteams__chip'); chip.appendChild(flagEl(t.iso, t.flag, t.he)); chip.appendChild(el('span', null, t.he));
          var x = el('button', 'wc-myteams__x'); x.type = 'button'; x.setAttribute('aria-label', 'הסר ' + t.he); x.textContent = '×';
          x.addEventListener('click', function () { setFav(code); });
          chip.appendChild(x); strip.appendChild(chip);
        });
      }
      var add = el('button', 'wc-myteams__add'); add.type = 'button';
      add.setAttribute('aria-expanded', picker && picker.classList.contains('is-open') ? 'true' : 'false');
      add.appendChild(svg('starO')); add.appendChild(el('span', null, favs.length ? 'ערוך נבחרות' : 'בחר נבחרות'));
      add.addEventListener('click', togglePicker);
      strip.appendChild(add);
    }
    function buildPicker() {
      clear(picker); var grid = el('div', 'wc-panel__grid');
      teamsInPlay(feed).forEach(function (t) {
        var o = el('button', 'wc-opt' + (isFav(t.code) ? ' is-on' : '')); o.type = 'button'; o.dataset.code = t.code;
        o.appendChild(flagEl(t.iso, t.flag, t.he)); o.appendChild(el('span', null, t.he));
        o.addEventListener('click', function () { setFav(t.code); o.classList.toggle('is-on', isFav(t.code)); });
        grid.appendChild(o);
      });
      picker.appendChild(grid);
    }
    function togglePicker() {
      if (!picker) return;
      var open = !picker.classList.contains('is-open');
      picker.classList.toggle('is-open', open);
      if (open) buildPicker(); else clear(picker);
      renderChips();
    }
    document.addEventListener('wc:favchange', function () {
      renderChips();
      if (picker && picker.classList.contains('is-open')) picker.querySelectorAll('.wc-opt').forEach(function (o) { o.classList.toggle('is-on', isFav(o.dataset.code)); });
    });
    renderChips();
  }

  // "עודכן HH:MM" (Israel time of the feed's updated stamp)
  function mountUpdated(feed) {
    var els = document.querySelectorAll('[data-updated]');
    if (!els.length || !feed.updated) return;
    var t = new Intl.DateTimeFormat('en-GB', { timeZone: feed.tz || 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(feed.updated));
    els.forEach(function (e) { e.textContent = 'עודכן ' + t; });
  }

  // SEO: SportsEvent ItemList so Google can index the fixtures. (The theme also
  // server-renders the schedule HTML in Liquid — this is the structured layer.)
  function buildJsonLd(feed) {
    // Skip when the theme already server-rendered the JSON-LD (the SEO source layer).
    if (document.querySelector('script[type="application/ld+json"][data-wc-ssr]')) return;
    try {
      var items = feed.matches.filter(function (m) { return m.kickoff_utc && feed.teams[m.t1] && feed.teams[m.t2]; }).map(function (m, i) {
        return { '@type': 'ListItem', position: i + 1, item: {
          '@type': 'SportsEvent', name: m.t1_he + ' נגד ' + m.t2_he + ' · מונדיאל 2026',
          startDate: m.kickoff_utc, eventStatus: 'https://schema.org/EventScheduled', sport: 'Soccer',
          location: { '@type': 'Place', name: m.venue_he || m.venue || '' },
          competitor: [{ '@type': 'SportsTeam', name: m.t1_he }, { '@type': 'SportsTeam', name: m.t2_he }]
        } };
      });
      var ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'לוח משחקי מונדיאל 2026 בשעון ישראל', numberOfItems: items.length, itemListElement: items };
      var s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
    } catch (e) { /* non-fatal */ }
  }

  // ── boot ──
  function boot(feed) {
    var baseNow = feed._sample ? Date.parse(feed.updated) : Date.now();
    mountHero(feed, baseNow);
    mountMyTeams(feed);
    mountToday(feed);
    mountSchedule(feed);
    mountBracket(feed);
    mountGroups(feed);
    mountUpdated(feed);
    buildJsonLd(feed);
    document.querySelectorAll('[data-sample-note]').forEach(function (n) { n.style.display = feed._sample ? '' : 'none'; });
  }
  function init() {
    fetch(FEED_URL, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(boot).catch(function (e) {
      document.querySelectorAll('[data-cards],[data-groups]').forEach(function (m) { clear(m); m.appendChild(el('div', 'wc-empty', 'לא ניתן לטעון את נתוני המשחקים כרגע.')); });
      var bk = document.querySelector('[data-bracket] .wc-empty'); if (bk) bk.textContent = 'לא ניתן לטעון את נתוני המשחקים כרגע.'; // text-only: the mount itself is never cleared
      console.error('WC2026 feed load failed:', e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
