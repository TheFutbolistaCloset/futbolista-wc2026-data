# ▶️ דף המונדיאל 2026 — קובץ המשכיות (START HERE)
**מקור האמת היחיד להמשך העבודה.** עודכן: 2026-06-13 (אחרי עליית פרודקשן + SEO).

---

## 🟢 מצב נוכחי (TL;DR) — הדף **חי בפרודקשן**
דף מונדיאל 2026 חי בעברית: לוח 104 משחקים בשעון ישראל · משחקי היום · תוצאות חי · טבלאות בתים → מוביל למכירת חולצות.
- **URL חי:** **https://thefutbolistacloset.com/pages/world-cup-2026-hub**
- **ארכיטקטורה:** *progressive enhancement* — הלוח+הטבלאות+ה-JSON-LD **מרונדרים בשרת (Liquid)** כדי שגוגל יסרוק אותם כטקסט; ה-JS (`wc-hub.js`) מוסיף מעליהם פילטרים/מועדפים/**תוצאות חי**.
- **SEO אומת:** Lighthouse SEO **100/100**; 104 משחקים + SportsEvent(72)+FAQPage+BreadcrumbList בקוד הגולמי; H1 יחיד; canonical/meta תקינים.
- **תוצאות מתעדכנות חי למשתמשים:** ✅ פעיל. מנוע רענון (launchd, כל 10 דק') דוחף feed מעודכן ל-GitHub; ה-JS מושך משם. מפתח API-Football מחובר (נקרא רק בחלון משחק כדי לשמור על מכסת 100/יום).

---

## ✅ מה צריך לעשות מחר — 3 דברים (זה כל מה שנשאר, הכל תלוי בך)
1. **Theme Access token** → להפעיל את הרענון היומי לגוגל (הסקריפט+ה-job מוכנים, רק חסר ה-token):
   - Admin → **Apps** → "Theme Access" (אפליקציה רשמית של Shopify) → התקן → **Add password** → שם `wc2026-ssr-deploy` → העתק את ה-token (`shptka_...`).
   - תן אותו ל-Claude: "הנה ה-Theme Access token: shptka_…". Claude יוסיף אותו ל-`.env` (gitignored) + יטען את ה-job `com.futbolista.wc2026-ssr-deploy`.
   - *(לא חוסם — המשתמשים כבר מקבלים תוצאות חי דרך ה-JS. זה רק כדי שגם השכבה שגוגל סורק תתעדכן יומי.)*
2. **לפרסם את 30 הקולקציות `wc2026-*`** (Admin → Products → Collections → סינון "מונדיאל 2026" → Bulk → הדלק Online Store → Save). כרגע 90 קישורי "חולצות X" בדף מובילים ל-`/search`; ברגע שתפרסם, הם **משתדרגים אוטומטית** ל-`/collections/wc2026-<team>` (קישורים פנימיים נקיים = SEO טוב יותר). ה-self-verify + הרענון היומי יעשו את זה לבד.
3. **קישור בתפריט** (ידני — ל-token אין menus scope): להוסיף תת-פריט **"לוח משחקים · שעון ישראל"** → `/pages/world-cup-2026-hub` תחת הדרופדאון "מונדיאל 2026"; ולהפנות את הפריט הישן הכפול "מונדיאל 2026" → `/pages/euros-copa-america-2024` לדף החדש (ניקוי SEO).

> אם תרצה רק להמשיך: פתח את Claude בתיקייה `~/futbolista-wc2026-data` וכתוב "המשך את דף המונדיאל מ-RESUME.md". הוא יידע בדיוק את כל המצב.

---

## 📍 מפת הכל (איפה מה)
| מה | איפה |
|----|------|
| הקובץ הזה (להמשך) | `~/futbolista-wc2026-data/RESUME.md` |
| **דף חי** | `https://thefutbolistacloset.com/pages/world-cup-2026-hub` (page handle + template = `world-cup-2026-hub`) |
| קוד ה-feed + ה-SSR + ה-preview | `~/futbolista-wc2026-data/` |
| **ה-feed הציבורי שהאתר מושך** | `https://raw.githubusercontent.com/TheFutbolistaCloset/futbolista-wc2026-data/main/public/wc2026-data.json` |
| קוד ה-theme שנפרס | worktree `~/wc-hub-port` (ענף `feat/wc2026-hub`, merged ל-origin/main) |
| מפתח API-Football | `~/futbolista-wc2026-data/.env` → `APIFOOTBALL_KEY` (gitignored, Free 100/יום) |
| job רענון feed (משתמשים) | `~/Library/LaunchAgents/com.futbolista.wc2026-data.plist` — **טעון**, כל 10 דק' |
| job רענון SSR (גוגל) | `~/futbolista-wc2026-data/launchd/com.futbolista.wc2026-ssr-deploy.plist` — **לא טעון** (מחכה ל-token) |
| תג גלגול לאחור (פרודקשן) | `pre-wc2026-hub-2026-06-13` → `48b01a32` |

---

## מה נעשה בסשן הזה (איך) — הארכיטקטורה המלאה
1. **תיקון כפתורי חולצות:** ב-build האמיתי אף נבחרת לא קיבלה לינק חולצה (רק ה-sample). תוקן — `build.mjs` ממלא 30 נבחרות דרך `jerseyUrl(...,{checkLive:true})` (קולקציה אם 200, אחרת חיפוש). `HAS_JERSEY` עבר ל-`lib/jersey.mjs` (משותף sample+build).
2. **אירוח feed:** נוצר repo ציבורי `TheFutbolistaCloset/futbolista-wc2026-data`. ה-theme מושך את ה-JSON ה-raw (CORS פתוח, cache 5 דק'). **ה-theme לא נדחף לעולם ברענון נתונים.**
3. **שכבת SEO מרונדרת-בשרת:** `lib/ssr.mjs` מייצר 3 snippets — `wc2026-{schedule,standings,jsonld}-ssr.liquid` — עם אותם classes כמו ה-JS (אז `wc-hub.css` מעצב אותם זהה). מרונדרים **בתוך** ה-mounts; ה-JS עושה `clear()`+rebuild (אז גוגל רואה את הכל, המשתמש מקבל אינטראקטיבי+חי). `buildJsonLd` ב-JS מדלג אם יש JSON-LD מהשרת (`data-wc-ssr`) → אין כפילות.
4. **קופי SEO (gal-hebrew):** פסקת פתיח עשירת-מילות-מפתח + 7 שאלות נפוצות (`<details>`, נגיש) + FAQPage schema. עובדות אומתו מול ה-feed.
5. **פונט:** הסקשן עושה self-host ל-`FtbAssistant` (Assistant 500/600/800 מתעוותים תחת custom-rtl) + נעילת font-family לפי id.
6. **deploy לפרודקשן:** FF ל-origin/main → תג גלגול + CHANGELOG → push של 8 קבצים ל-theme 186430161182 (additive, שום קובץ קיים לא נדרס) → pull-back verify.
7. **חי:** API key + window-gate ב-build; job רענון feed טעון (משתמשים); job רענון SSR יומי מוכן (גוגל, מחכה ל-token).

## פקודות
```bash
cd ~/futbolista-wc2026-data
npm run build              # בונה feed + 3 snippets ל-SSR (לייב; API נקרא רק בחלון משחק)
npm run build:offline      # מ-cache, בלי רשת/חי
npm run sample && npm run preview   # תצוגה מקדימה מקומית → http://localhost:8753/preview/
node scripts/refresh.mjs   # רענון feed ידני (push ל-GitHub אם יש שינוי אמיתי)
node scripts/deploy-ssr.mjs   # push ידני של ה-SSR ל-live (צריך SHOPIFY_CLI_THEME_TOKEN+STORE ב-.env)
launchctl list | grep futbolista   # אילו jobs טעונים
```

## מפת קבצים (בפרויקט)
- `lib/teams.mjs` 48 נבחרות (he/heShort/דגל/ISO/slug) · `lib/venues.mjs` ערים בעברית · `lib/transform.mjs` openfootball(+חי)→feed (שעון ישראל, טבלאות) · `lib/sources.mjs` fetch+timeout+retry+cache · `lib/jersey.mjs` קישור חולצות self-verify + `HAS_JERSEY`.
- `lib/ssr.mjs` רינדור שרת (לוח+טבלאות+JSON-LD) — **המנוע ל-SEO**.
- `build.mjs` מרכיב feed + 3 snippets · `scripts/refresh.mjs` (cron feed) · `scripts/deploy-ssr.mjs` (cron SSR→live).
- theme (ב-`~/wc-hub-port`): `sections/wc2026-hub.liquid` · `snippets/wc2026-{data,jsonld,schedule-ssr,standings-ssr}.liquid` · `assets/wc-hub.{css,js}` · `templates/page.world-cup-2026-hub.json`.

## גוצ'ות / לקחים
- **מפתח API-Football = 100 בקשות/יום** → ה-build קורא ל-API **רק בחלון משחק** (kickoff-5דק' עד +150דק'). אחרת מדלג. אל תוריד את ה-gate.
- **דף Shopify נשמר כ-Hidden = 404 לציבור.** היה צריך `pageUpdate(isPublished:true)`. אם הדף נעלם — בדוק Visibility.
- **handle בעברית יוצא מקושקש** → תמיד להגדיר URL handle ידנית באנגלית.
- **store-execute עובד עם `--store 143f82.myshopify.com`** (לא thefutbolistacloset.com). יש לו scope ל-`pageUpdate`. **לא** להריץ `shopify store auth` (ישבור tracker/backup).
- **`shopify theme check` מציף 2.6MB** → להפנות לקובץ ולעשות grep. ה-baseline של ה-theme ~2683 הערות (קבצי backup) — לא שלנו.
- agent-browser: צילום מסך נתקע על 104 דגלים מ-CDN; os-error-35 → `agent-browser close` ואז `open`. cache-bust ל-reload (`?v=N`).
- ה-theme מוסיף `– TheFutbolistaCloset` ל-`<title>` → כדאי לא לכפול מיתוג ב-Page title.

## החלטות שננעלו
דף (לא מאמר) · ארכיטקטורה=SSR ל-SEO + JS לחי · handle=`world-cup-2026-hub` · feed ציבורי ב-GitHub raw (לא jsDelivr — cache ארוך) · רענון: feed כל 10 דק' (משתמשים) + SSR יומי ל-live (גוגל) · תעתיקים: כף ורדה / קונגו / חוף השנהב (אושרו).
