# ▶️ דף המונדיאל 2026 — קובץ המשכיות (START HERE)
**מקור האמת היחיד להמשך העבודה.** עודכן: 2026-06-13.

---

## ✅ איך ממשיכים מחר (אידיאלי) — 3 צעדים
1. **לראות איפה עצרנו (הפריוויו):**
   ```bash
   cd ~/futbolista-wc2026-data && npm run preview
   ```
   ופותחים: **http://localhost:8753/preview/**
2. **לפתוח את Claude בתיקייה הזו** ולכתוב לו בדיוק את המשפט:
   > "המשך את דף המונדיאל מהקובץ `~/futbolista-wc2026-data/RESUME.md`"

   (גם "תמשיך מאיפה שעצרנו אתמול בדף המונדיאל" יעבוד — Claude טוען את הזיכרון אוטומטית.)
3. Claude יקרא את הקובץ הזה + הזיכרון הקבוע ויידע בדיוק את כל המצב, מה נשאר, ואיך להמשיך.

> 💡 אין צורך לזכור כלום. כל המידע נמצא כאן. אם תרצה רק להחליט על ה־3 דברים שתלויים בך (למטה ב-🟡), זה כל מה שצריך כדי לעלות לאוויר.

---

## 📍 איפה הכל שמור (מפה)
| מה | איפה |
|----|------|
| **הקובץ הזה** (להמשך) | `~/futbolista-wc2026-data/RESUME.md` |
| כל הקוד (feed + preview) | `~/futbolista-wc2026-data/` |
| לקחים מפורטים (לא חובה) | `~/futbolista-wc2026-data/RETROSPECTIVE.md` |
| מערכת העיצוב | `~/futbolista-wc2026-data/design-system.md` |
| התוכנית המלאה (3 סבבים) | `~/.claude/plans/quiet-floating-river.md` |
| זיכרון קבוע (נטען אוטומטית) | `project_futbolista-wc2026-hub.md` + `reference_store-execute-scopes.md` |
| 30 הקולקציות | חיות בחנות (Shopify Admin → Collections, handle `wc2026-*`) — **לא מפורסמות עדיין** |

---

## מצב נוכחי (TL;DR)
דף מונדיאל חי בעברית לפוטבוליסטה: לוח משחקים בשעון ישראל, משחקי היום, תוצאות חי, טבלאות בתים → מוביל למכירת חולצות. **ה-feed והפריוויו המלא בנויים ואומתו** (320→1680). **30 קולקציות לכל נבחרת נוצרו בחנות החיה** אבל **לא מפורסמות**. שום דבר עדיין לא נגע ב-theme/חנות — הכל מקומי והפיך.

## DONE ✅
- **Data feed:** openfootball 2026 (לוח/בתים/אצטדיונים/תוצאות, שעון ישראל) + חיבור API-Football (תוצאות חי; צריך מפתח). אומת — תואם ל-100% את הבריף.
- **Core-4 preview:** פתיח+צ'יפ "המשחק הבא" חי · משחקי היום (חלון ערב-צפייה) · לוח מלא (מקובץ לפי יום, פילטרים דביקים) · טבלאות בתים (מקום 3 מודגש זהב).
- **תוספות:** דגלים עגולים אמיתיים · אצטדיונים בעברית · מועדפים ("הנבחרות שלי" strip + ★ על כרטיסים + הצמדה + localStorage) · "ליומן" (.ics) · JSON-LD ל-SEO · "עודכן HH:MM" · תיקון יישור RTL של התוצאה והדגלים · שמות קצרים (ארה״ב/בוסניה/סעודיה) + גלישה בטוחה (שום שם לא נחתך).
- **30 קולקציות `wc2026-<team>`** נוצרו בחנות (חוק: כותרת מכילה "נבחרת X" וגם "מונדיאל 2026"; 101 מוצרים — כולל ילדים/מכנסיים/שוער/תינוק).
- **כפתורי החולצות לא נותנים 404 לעולם:** `lib/jersey.mjs` → קולקציה אם מפורסמת, אחרת חיפוש Shopify (אומת 200). משתדרג אוטומטית כשמפרסמים.

## PENDING — תלוי בך 🟡 (זה מה שצריך כדי לעלות לאוויר)
1. **לפרסם את 30 הקולקציות** (לא חוסם — החיפוש עובד בינתיים). Admin → Products → Collections → לסנן "מונדיאל 2026" → לבחור את כל ה-`wc2026-*` → Bulk edit → להדליק **Online Store** → Save. (או דרך **Sidekick**: "publish all collections whose handle starts with wc2026- to the Online Store".)
2. **מפתח API-Football חינמי** (api-football.com) → לתוצאות חי. יישמר ב-env של הפרויקט (`APIFOOTBALL_KEY`), לעולם לא ב-theme.
3. **אישור ליצור repo ציבורי** `futbolista-wc2026-data` (מארח את ה-feed שהאתר מושך).
4. **אישור handle + שם בתפריט** (ברירת מחדל: `/pages/mundial-2026`, "מונדיאל 2026 · לוח משחקים").
5. **אישור 3 תעתיקים** (gal-hebrew "ממתין"): כף ורדה / קונגו. (חוף השנהב כבר אושר.)

## NEXT — העבודה שלי כשנפתח 🔜
1. **Port:** להעתיק `preview/assets/wc-hub.{css,js}` ל-theme `assets/` (verbatim) + סקשנים דקים ב-Liquid + `snippets/wc2026-data.liquid` (fetch יחיד) + `templates/page.mundial-2026.json`. להוסיף גשר `?team=`/`#team=` ל-`sections/wc2026-collection-hero.liquid`.
2. **לחבר feed חי:** `build.mjs` → `public/wc2026-data.json` → push ל-repo הציבורי; ה-theme מושך משם. `jerseyUrl(..., {checkLive:true})` כדי להעדיף קולקציות מפורסמות.
3. **launchd:** `launchd/com.futbolista.wc2026-data.plist` (כל ~5–10 דק' בחלונות חי, אחרת כל שעה).
4. **Deploy** לפי הפרוטוקול (futbolista-dev): ענף `feat/wc2026-hub` מ-origin/main טרי → staging (188847358238) → `YES, DEPLOY TO PRODUCTION` (186430161182) + tag לגלגול + CHANGELOG. קישור בתפריט — ידני (אין menus scope).
5. **שלב 2 — מודולים 5–7** (מסלול לגמר / "שווה להישאר ער?" / "חולצת המשחק של היום") טיוטה יומית אוטומטית בקול gal-hebrew → Telegram לאישור.

## פקודות
```bash
cd ~/futbolista-wc2026-data
npm run sample     # בונה מחדש את preview/sample-data.json
npm run preview    # שרת → http://localhost:8753/preview/
npm run build:offline                              # feed מ-cache (בלי תוצאות חי)
node scripts/build-team-collections.mjs            # סריקה בלבד: רשימת נבחרות + כמויות
node scripts/build-team-collections.mjs --create   # יצירת קולקציות (idempotent, צריך --allow-mutations)
```

## מפת קבצים (בפרויקט)
- `lib/teams.mjs` — 48 נבחרות: he, heShort (ארה״ב…), צבעי דגל, ISO (circle-flags), slug.
- `lib/transform.mjs` — openfootball(+חי) → feed מנורמל (שעון ישראל, טבלאות).
- `lib/sources.mjs` — fetch עם timeout+retry; cache fallback ל-openfootball.
- `lib/jersey.mjs` — כתובת חולצות self-verifying (קולקציה אם 200, אחרת חיפוש).
- `build.mjs` — מרכיב את `public/wc2026-data.json` (לא דוחף ל-theme).
- `preview/` — `index.html` + `assets/wc-hub.{css,js}` (ה-renderer המשותף — מועתק ל-theme) + `make-sample.mjs` + `serve.mjs`.
- `scripts/build-team-collections.mjs` — סורק/יוצר קולקציות לכל נבחרת.

## גוצ'ות / לקחים (כדי לא ליפול שוב — מלא ב-RETROSPECTIVE.md)
- `shopify store execute` צריך `--allow-mutations` לכתיבה; **לא יכול לפרסם** (אין publications scope) ולא לגעת בתפריטים → פרסום וקישורי-תפריט ידניים. **לא** לעשות re-auth (ישבור את ה-tracker/backup ששותפים את אותו session).
- Theme: שורש 10px → להשתמש ב-px; `custom-rtl.liquid` כופה גופן → לנעול font-family; CSS סינכרוני (async = FOUC).
- מספרים ב-RTL (תוצאה / שערים) → להציג כ-flex עם `direction:rtl`, לא טקסט "a : b".
- agent-browser: לפתוח מחדש את כתובת הפריוויו לפני בדיקת רוחב; לאמת `location.pathname`; לעטוף eval ב-IIFE.

## החלטות שננעלו
Data=היברידי (openfootball + API-Football חינם) · עיצוב=בהיר/Apple + hero "מאצ'-נייט" כהה, #334fb4, Assistant, px · placement=דף חדש + קישור בתפריט · refresh=feed ציבורי בלי theme push · מועדפים=strip עליון + ★ על כרטיסים · חולצות=self-verify (קולקציה→חיפוש) · 30 קולקציות לפי כותרת (לא תיוג).
