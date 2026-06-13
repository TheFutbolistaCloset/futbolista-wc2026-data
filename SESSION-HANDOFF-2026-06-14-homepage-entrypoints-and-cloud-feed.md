# 🟢 דף המשכיות — סשן 2026-06-14: נקודות כניסה לדף המונדיאל + העברת ה-feed לענן

**מה זה הקובץ:** סיכום מלא של מה שנעשה בסשן הזה כדי להמשיך מחר בקלות. מקור-האמת ה**עדכני** למצב הכללי של פרויקט המונדיאל הוא `RESUME.md` (אותה תיקייה) — הקובץ הזה מתעד ספציפית את עבודת ה-14/6.

---

## TL;DR — הכול חי ואומת ✅
1. **Phase 2 (נקודות כניסה לדף ההאב) — חי בפרודקשן.** דף הבית קיבל **רצועת "משחקי היום"** והבאנר העליון קיבל **קישור דו-שלבי**.
2. **רענון ה-feed עבר מ-launchd מקומי ל-GitHub Actions** — רץ 24/7 בענן, לא תלוי במחשב/שינה.
3. תוקן באג חיתוך שם נבחרת ("אוסטרליה").

---

## מה חי עכשיו (Phase 2)
3 נקודות כניסה לדף ההאב `/pages/world-cup-2026-hub`:
- **רצועת "משחקי היום"** (סקשן חדש `wc2026-today.liquid`) בדף הבית, בין הביקורות לחיפוש-שחקן. מושכת את משחקי היום מה-feed (client-side), כרטיסים בעיצוב ההאב, כל כרטיס + הקישור → דף ההאב. נעלמת לבד אחרי הגמר.
- **באנר עליון דו-שלבי** (`wc2026-announcement-bar.liquid`): לפני הפתיחה → דף ההאב (`countdown_link`), אחרי → קולקציית החולצות (`link`). כרגע במצב "🏆 המונדיאל התחיל!" → חולצות.
- **קישור תפריט — ❗נשאר ידני לגל** (ל-token אין `menus` scope): Online Store → Navigation → **Main Menu** → תחת "מונדיאל 2026" → Add menu item: **"לוח משחקים · שעון ישראל"** → `/pages/world-cup-2026-hub`.

## מקור הנתונים — האמת (חשוב!)
- **API-Football בתוכנית החינמית חוסם את עונת 2026 לגמרי** (`"Free plans do not have access to this season"`). ה-live overlay מעולם לא עבד. ה-overlay דורמנטי מאחורי דגל `LIVE_API=on` (כבוי).
- **המקור היחיד = openfootball** (קובץ קהילתי ב-GitHub), בעיכוב פרסום של דקות–שעות אחרי שריקת הסיום. **לא** חי דקה-אחר-דקה.
- אם תרצה חי אמיתי בעתיד: לשדרג API-Football (Pro ~€19/חודש) → `LIVE_API=on` + מפתח כ-repo secret.

## רענון ה-feed — עכשיו בענן (GitHub Actions)
- workflow: `.github/workflows/refresh-feed.yml` (repo `futbolista-wc2026-data`, ציבורי → דקות Actions חינם). cron `*/5` + `workflow_dispatch`. בונה מ-openfootball ודוחף `public/wc2026-data.json` **רק על שינוי משמעותי**.
- `scripts/refresh.mjs` נהפך **portable + CI-aware** (אותו קוד מקומי/ענן; ב-CI מדלג על ה-throttle, תמיד בונה).
- **ה-cron המקומי launchd פורק:** `~/Library/LaunchAgents/com.futbolista.wc2026-data.plist` → `.disabled`. (להחזיר מקומי: rename חזרה + `launchctl load`.)
- שוויץ-קטאר 1:1 תיקלט אוטומטית ברגע ש-openfootball יפרסם — בלי תלות במחשב.

---

## Git — מצב מדויק
### Theme (`~/wc-hub-port` → repo `Futbolista-Theme-Clean-V2`)
- `origin/main` = **aad277bc** | branches `feat/wc2026-homepage-entry`, `hotfix/wc2026-today-strict` (pushed)
- תגי גלגול-לאחור: `pre-wc2026-homepage-entry-2026-06-14` → 9dda8589 ; `pre-wc2026-today-strict-2026-06-14` → a4f1846e
- **Hotfix שני (חי):** `assets/wc-hub.js` — סקשן "היום" בדף ההאב הפך **strict ל-יום-לוח ישראלי** (`inToday` = live OR `is_today`; הוסר `TODAY_END_HOUR`). תיקן זליגה של משחקי מחר 02:00/05:00 ל"היום". אומת על הלייב (5 משחקי 14/6 בלבד).
- קבצים שעלו ללייב (theme **186430161182**): `sections/wc2026-today.liquid` (חדש), `sections/wc2026-announcement-bar.liquid`, `sections/header-group.json`, `templates/index.json`.
- גיבוי הסקשן שהוסר (image_banner — היה כבוי, הוסר כי דף הבית היה ב-25-section cap): `docs/homepage-section-backups/image_banner.json` (הפיך). ראה memory: "Shopify 25-section template cap".
- **Rollback ללייב:**
  ```bash
  cd ~/wc-hub-port
  git checkout pre-wc2026-homepage-entry-2026-06-14 -- templates/index.json sections/header-group.json sections/wc2026-announcement-bar.liquid
  shopify theme push --theme 186430161182 --allow-live --only templates/index.json --only sections/header-group.json --only sections/wc2026-announcement-bar.liquid
  ```

### Data (`~/futbolista-wc2026-data` → repo `futbolista-wc2026-data`)
- `origin/main` = **d237221**. commits היום: `9c1082c` (cadence אדפטיבי), `46ec987` (workflow+portable), `07d5ce8` (drop setup-node), `d237221` (RESUME).
- קבצים: `.github/workflows/refresh-feed.yml` (חדש), `scripts/refresh.mjs` (portable+CI), `build.mjs` (API מאחורי `LIVE_API`), `RESUME.md`.

## Theme IDs (אומת מול `shopify theme list`)
- **Live:** `186430161182` ("Live Theme | 17.04.2026") · **Staging:** `188847358238` ("Staging - AI Playground | 29.05.2026").

---

## אימות שבוצע
- **Phase 2 על הלייב:** pull-back מהתמה החיה (strip בסדר #3, image_banner הוסר, order+sections=25, באנר countdown_link→האב/celebration→חולצות) + רינדור חי (5 כרטיסים, 3 טורים, 0 שמות חתוכים, "אוסטרליה" מלא, אפס overflow, דף הבית שלם).
- **GitHub Actions:** 2 ריצות `success`; הצעד מבצע "CI — no meaningful change, skip push". launchd לא טעון (`launchctl list | grep wc2026-data` ריק).

## מה נשאר / לעקוב
1. **קישור התפריט** (ידני, גל — ראה למעלה). זו נקודת הכניסה השלישית, עדיין לא קיימת.
2. **לוודא שהריצה המתוזמנת** (event=schedule, לא רק dispatch) של ה-Action נדלקה — `gh run list --workflow=refresh-feed.yml` ולחפש `schedule`. (GH cron יכול להתעכב 5–20 דק'.)
3. **לא חוסם, מ-RESUME:** Theme Access token ל-cron ה-SSR (שכבת גוגל); פרסום 30 קולקציות `wc2026-*`.
4. הערה: `checkout@v4` יקבל warning של Node20→24 (מיגרציה כפויה של גיטהאב ב-16/6; v4 תומך, לא נשבר).

## פקודות מהירות
```bash
# מצב ה-Action
cd ~/futbolista-wc2026-data && gh run list --workflow=refresh-feed.yml --limit 5
gh workflow run refresh-feed.yml                 # הרצה ידנית
# preview לייב (עוקף cache): https://143f82.myshopify.com?preview_theme_id=186430161182&_fd=0
# feed ציבורי:
# https://raw.githubusercontent.com/TheFutbolistaCloset/futbolista-wc2026-data/main/public/wc2026-data.json
```

**להמשך מחר:** פתח Claude בתיקייה `~/futbolista-wc2026-data` וכתוב "המשך מ-SESSION-HANDOFF-2026-06-14".
