# Omar Guettat — Portfolio + Visitor Log

```
index.html        the portfolio
admin.html        your private visitor dashboard (login required)
config.js         ← the ONLY file you edit (LinkedIn, GitHub, Supabase keys)
tracker.js        sends visit / click / time events to Supabase
supabase/schema.sql  run once to create the table + security rules
assets/           photo, favicon, CV PDF
```

## 1. Database (Supabase, free tier) — 10 min
1. Create a project at https://supabase.com.
2. SQL Editor → paste `supabase/schema.sql` → Run.
   (Check the email in the "owner can read" policy is yours.)
3. Authentication → URL Configuration → add your site URL
   (e.g. `https://omarguettat.vercel.app`) to **Site URL** and **Redirect URLs**.
4. Settings → API → copy **Project URL** and **anon public key** into `config.js`.

The anon key is designed to be public. The policies make it **insert-only**:
anyone can write a visit, only your logged-in email can read the log.

## 2. Fill in config.js
LinkedIn URL, GitHub URL (or `""` to hide the button), Supabase URL + key.

## 3. Deploy (Vercel)
Push the folder to a GitHub repo → vercel.com → New Project → import → Deploy.
No build step. Better still: buy `omarguettat.com` (~10 €/yr) and attach it.

## 4. Use it
- Open `/admin.html`, sign in with your email (magic link).
- Click **Ignore my visits** once on each of your own devices/browsers.
- Before applying anywhere, type the recruiter's name in **Personal tracking link**
  and send that link (e.g. `…/?r=sarah-valeo-hr`) in your email / LinkedIn message.
  Their visit, clicks and time show up under that name.

## What gets recorded
| Field | How |
|---|---|
| Who | personal `?r=` link, or the optional name/company they type after downloading the CV. Otherwise "Anonymous #id" (+ "returning" badge). |
| When | timestamp of every event |
| Actions | CV download (which button), LinkedIn, Email, GitHub, sections actually scrolled into view |
| Time spent | active time with the tab visible (background time excluded), + scroll depth |
| Context | referrer (LinkedIn / Google / email…), device, browser, timezone, language |

Browsers with "Do Not Track" enabled are not recorded. Ad-blockers may block some requests — expect undercounting, not overcounting.
