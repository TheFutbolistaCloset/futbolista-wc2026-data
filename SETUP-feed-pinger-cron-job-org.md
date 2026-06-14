# ⚙️ הקמת Pinger אמין ל-feed (cron-job.org → GitHub Actions) — ~3 דקות

**למה:** ה-cron המובנה של GitHub Actions (`*/5`) לא אמין — ירה פעמיים ב-~5 שעות. הפתרון: שירות cron חיצוני חינמי (cron-job.org) שמפעיל את ה-workflow **כל 5 דק' בדיוק** דרך GitHub API. נשאר 100% בענן (לא תלוי במחשב/שינה). **קריאת ה-API אומתה ועובדת (HTTP 204).**

---

## שלב 1 — ליצור GitHub Fine-grained PAT (טוקן ממוקד)
1. GitHub → תמונת פרופיל → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. הגדרות:
   - **Token name:** `cron-job-wc2026-feed`
   - **Expiration:** עד אחרי הגמר (למשל 90 יום).
   - **Resource owner:** `TheFutbolistaCloset`
   - **Repository access:** **Only select repositories** → בחר **`futbolista-wc2026-data`** בלבד.
   - **Permissions** → Repository permissions → **Actions** → **Read and write**. (זה הכל — שום הרשאה אחרת.)
3. **Generate token** → העתק את הטוקן (`github_pat_...`). תראה אותו פעם אחת.

> אבטחה: הטוקן ממוקד לריפו אחד + הרשאת Actions בלבד, ושמור רק ב-cron-job.org. ניתן לבטל בכל רגע מאותו מסך.

## שלב 2 — להקים את ה-cronjob ב-cron-job.org
1. היכנס ל-https://cron-job.org → הרשמה חינמית → **Create cronjob**.
2. **Common:**
   - **Title:** `WC2026 feed refresh`
   - **URL:** `https://api.github.com/repos/TheFutbolistaCloset/futbolista-wc2026-data/actions/workflows/refresh-feed.yml/dispatches`
   - **Schedule:** Every **5** minutes (Custom: every 5 minutes).
3. **Advanced** (חשוב):
   - **Request method:** `POST`
   - **Request body / custom:** הפעל "Send custom request body" והדבק:
     ```json
     {"ref":"main"}
     ```
   - **Headers** (הוסף 4 שורות):
     | Key | Value |
     |-----|-------|
     | `Accept` | `application/vnd.github+json` |
     | `X-GitHub-Api-Version` | `2022-11-28` |
     | `Authorization` | `Bearer github_pat_...` ← הדבק את הטוקן משלב 1 |
     | `Content-Type` | `application/json` |
   - (אם יש "Treat HTTP 2xx as success" / טווח קודים — ודא ש-**204** נחשב הצלחה.)
4. **Save / Create**.

## שלב 3 — אימות (אחרי ~6 דק')
מהמחשב:
```bash
cd ~/futbolista-wc2026-data
gh run list --workflow=refresh-feed.yml --limit 10 --json event,status,createdAt -q '.[] | "\(.createdAt) \(.event) \(.status)"'
```
אמור להופיע **run חדש מסוג `workflow_dispatch` כל ~5 דק'** (אלו ההפעלות של cron-job.org). אם כן — הרענון אמין 24/7. 🎉

---

## הערות
- ה-`schedule` המובנה (`*/5`) **נשאר ב-workflow כגיבוי** (יורה מדי פעם בלי עלות) — אפשר להשאיר; הוא לא מזיק (ריצה כפולה = "no meaningful change, skip").
- ה-API call המדויק שאומת: `POST .../workflows/refresh-feed.yml/dispatches` עם body `{"ref":"main"}` → **204**.
- אם תרצה לעצור: השבת/מחק את ה-cronjob ב-cron-job.org, ובטל את ה-PAT ב-GitHub.
