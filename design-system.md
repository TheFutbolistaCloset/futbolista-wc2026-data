# WC2026 Hub — Design System (locked 2026-06-13)

Synthesized via `/ui-ux-pro-max` for The Futbolista Closet (Hebrew/RTL jersey store).
**Pattern:** Event/Conference Landing (live hero → today → schedule → standings, sticky filter).
**Style:** Vibrant & block-based, high contrast, large type — must feel *alive* (live pulse, today front-and-center). Anti-pattern to avoid: static / low fan-engagement.
**Direction:** light/Apple-clean body + dark navy "match-night" hero & live moments.
**Font:** Assistant (brand) — NOT Noto, for store consistency. **All sizes in px** (theme root is 10px → rem renders ~40% small).

## Color tokens
```
Light body   --wc-bg #f6f8fc   --wc-surface #ffffff   --wc-surface-2 #f1f4fa
Ink          --wc-ink #0f1830  --wc-ink-2 #4a5573 (≈7:1)  --wc-ink-3 #6b7488 (≈4.6:1, small meta only)
Lines        --wc-line #e4e9f2   --wc-line-2 #d4dbe8
Brand        --wc-blue #334fb4   --wc-blue-ink #2a43a0   --wc-blue-soft #eaeefb
Hero (dark)  --wc-navy-1 #0b1322  --wc-navy-2 #0f1c38  --wc-navy-3 #0d2240  --wc-navy-card #142441
On-dark      #ffffff / --wc-on-navy-2 #c7d0e4 (≈8:1)
Gold         --wc-gold #FFD700   --wc-gold-soft #FFE680
Status       live --wc-live #e0214a (+tint #fff5f6) · finished neutral (ink-3) · scheduled blue
Standings    advancing #168542 (green) · third-watch #C79100 (gold) · eliminated #b0182f
Flag accents per-team, injected inline from feed flag[] (2-stop gradient dot/ring)
```

## Type scale (px)
```
display H1   40 / 56 desktop · w800 · lh1.05 · ls -0.02em
h2 section   24 / 30 · w800
h3 card/grp  17 / 18 · w700
body         15 / 16 · w500-600 · lh1.55
score        22 / 26 · w800 · tabular-nums
meta/label   13 · w700
micro badge  11 / 12 · w800 · ls .02em
chip         14 · w700
```

## Spacing / radius / shadow / z
```
space  4 8 12 16 20 24 32 40 48 64 ; section pad 40(m)/64(d) ; container max 1120
radius sm8 md12 lg16 xl20 pill999
shadow card: 0 1px 2px rgba(15,24,48,.04), 0 6px 20px -8px rgba(15,24,48,.12)
       hover: 0 10px 30px -10px rgba(51,79,180,.22)
       hero: 0 20px 52px rgba(13,27,51,.22) ; pill: 0 2px 10px rgba(13,27,51,.10)
z      base1 · heroChip2 · stickyFilter30 · overlay50
motion 200-300ms color/shadow (no layout-shift scale on hover) ; live pulse 1.6s ; reduced-motion disables glows+pulse
```

## Components
- **Hero band (dark):** navy gradient + drifting glows; gold badge "המונדיאל בעיצומו"; H1 display; one-line sub (#c7d0e4); key-facts row (פתיחה 11.06 · גמר 19.07 · שעון ישראל UTC+3 · 48 נבחרות · 104 משחקים) dot-separated, wraps 2-col on mobile; **live "next match" chip** (dark card, gold ring) = live score+minute (red pulse) OR countdown to next kickoff + teams, taps to Today; tricolor hairline ribbon bottom.
- **Match card (Today + Schedule):** white, r16, card shadow, RTL scoreboard row → `[team1 ▸ flag dot + he name] [center] [team2]`. Center by status: scheduled = big IL time (22px) + "שעון ישראל"; live = LIVE pill (pulsing dot) + score(26) + `58'`; finished = score(22) + "הסתיים", winner bolded. Meta row: group/stage badge + status pill + venue (city, muted). CTA row: per-team "חולצות ברזיל ›" blue-soft pills (only when `jersey.has`), else ghost "כל חולצות המונדיאל". Hover = shadow lift + blue border (no scale). Live = red left-accent + tint.
- **Sticky filter bar:** sticky under header (measure `.section-header` height for top), z30, white, shadow-when-stuck. Horizontal scroll-snap pills (hidden scrollbar + edge mask + desktop arrows — reuse hero pattern). Chips: הכל · היום · מחר · הסתיימו · עתידיים + expanding לפי בית / לפי שלב / לפי נבחרת panels. Active = blue fill, white text. ≥44px targets. aria-live count "מציג N משחקים".
- **Group standings:** grid auto-fill minmax(320,1fr) → 1col<749 / 2col<1100 / 3col≥1100. Mini-table per group, RTL cols (#·נבחרת·מש·נצ·תי·הפ·שע·הפרש·נק; mobile condenses to #·נבחרת·מש·הפרש·נק). Pos accents: 1–2 green (עולה), 3 gold (מאבק שלישיות), 4 muted (הודחה). Legend + one-liner: "שתי הראשונות עולות + 8 השלישיות הטובות". `complete` groups show ✓ final colors.

## A11y / responsive
SVG icons only; every interactive = button/a + cursor-pointer + focus-visible (2px blue, offset2); status never color-only (text + icon); tabular-nums; sweep 320/360/390/480/749/990/1200/1440/1680; no horizontal scroll on mobile; prefers-reduced-motion respected.
```
