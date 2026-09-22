# SHIFT website — setup guide

This package contains:

```
index.html          → the public website (your existing design, now dynamic)
admin.html           → the admin dashboard (login-protected)
site.js              → makes the public site load speakers/partners/team + handles forms
admin.js             → powers the admin dashboard
config.js            → where you paste your Supabase project keys (edit this!)
supabase/schema.sql  → database tables + security rules, run once in Supabase
supabase/functions/  → two small server functions that send emails via Gmail
```

Follow these steps in order. None of them require coding experience — it's mostly
clicking buttons in the Supabase dashboard and pasting a few values.

---

## 1. Create your Supabase project

1. Go to https://supabase.com → **New project**.
2. Pick a name (e.g. `shift-2026`), a database password (save it somewhere), and a region close to Tunisia (e.g. Frankfurt).
3. Wait ~2 minutes for it to finish provisioning.

## 2. Create the database tables

1. In your Supabase project, open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this package, copy the whole file, paste it in, and click **Run**.
3. This creates all 5 tables (speakers, team_members, partners, applicants, partner_applications), the security rules, and 3 storage buckets for photos/logos.

## 3. Create your admin login

1. In Supabase, go to **Authentication → Users → Add user**.
2. Enter your email (the AIESEC address you'll log in with) and a password. Tick **Auto Confirm User**.
3. That's the account you'll use to log into `admin.html`.

> Want more than one admin (e.g. you + the partnerships lead)? Just repeat this step for each person — anyone added here can log into the admin page.

## 4. Connect the website to your project

1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `config.js` in this package and paste them in:
   ```js
   const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ....";
   ```
4. Save the file. `index.html` and `admin.html` both read from this same file.

## 5. Set up the Gmail sender

Gmail requires an **App Password** (not your normal password) for apps like this to send mail through it.

1. On the Google account you'll send from (your AIESEC Gmail), turn on **2-Step Verification** if it isn't already on: https://myaccount.google.com/security
2. Go to https://myaccount.google.com/apppasswords, create an app password (name it "SHIFT website"), and copy the 16-character code.
3. Keep this code and the Gmail address handy for step 6.

Heads-up: a normal Gmail account can send roughly 500 emails/day, and Google throttles fast bursts — fine for confirmation emails and for reminding a few hundred guests, but not for mass marketing. The reminder function already sends slowly (one every ~0.4s) to stay safe.

## 6. Deploy the two email functions — no terminal needed

You can do this entirely by clicking around in the Supabase Dashboard; the CLI is optional (see below if you'd rather script it).

**6a. Add the two secrets first**
1. In your Supabase project, go to **Edge Functions → Secrets** in the left sidebar (or **Project Settings → Edge Functions**).
2. Add two secrets:
   - `GMAIL_USER` = your AIESEC Gmail address
   - `GMAIL_APP_PASSWORD` = the 16-character app password from step 5
3. Save. (`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` already exist automatically — don't add those yourself, that name prefix is reserved.)

**6b. Create the first function (`send-confirmation`)**
1. Go to **Edge Functions** in the sidebar → **Deploy a new function → Via Editor**.
2. Name it exactly `send-confirmation`.
3. Delete the placeholder code the editor gives you, then open `supabase/functions/send-confirmation/index.ts` from this package, copy the whole file, and paste it in.
4. Click **Deploy**.

**6c. Create the second function (`send-reminders`)**
1. Same as above: **Deploy a new function → Via Editor**, name it exactly `send-reminders`.
2. Paste in the contents of `supabase/functions/send-reminders/index.ts`.
3. Click **Deploy**.

That's it — both functions are now live at `https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-confirmation` etc., which is what `site.js`/`admin.js` call automatically.

**Prefer the command line instead?** You can also do all of this with the Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set GMAIL_USER=your-aiesec-address@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=your16charapppassword
supabase functions deploy send-confirmation
supabase functions deploy send-reminders
```

## 7. Put the site online

Any static hosting works since this is plain HTML/JS — no build step needed. Easiest free options:

- **Netlify**: drag-and-drop the whole folder onto https://app.netlify.com/drop
- **Vercel**: `vercel` CLI, or drag-and-drop via the dashboard
- **GitHub Pages**: push this folder to a repo and enable Pages in settings

Your admin dashboard will then be live at `yoursite.com/admin.html` — keep that link private (don't put it in the site's navigation).

---

## How things work day-to-day

- **Adding speakers/partners/team**: log into `/admin.html`, go to the relevant tab, click "+ Add", fill the form, optionally upload a photo, save. It appears on the public site immediately (refresh the page).
- **Someone registers to attend**: their info is saved to the `applicants` table, and they instantly get a confirmation email from your Gmail.
- **Reminding everyone**: in the Applicants tab, click "Send reminder to everyone" — this emails every registered applicant.
- **Partner applications**: when a company fills the "Become a Partner" form on the site, it shows up in the "Partner Applications" tab (separate from the displayed logos) with a status dropdown (new / contacted / approved / declined) so you can track outreach. Once you've signed a partner, add their logo in the "Partners (displayed)" tab so it shows on the site.

## Troubleshooting

- **Nothing loads on the public site / admin login fails**: double-check `config.js` has your real project URL and anon key (not the placeholder text).
- **Confirmation/reminder emails don't arrive**: check spam folder first; then in Supabase go to **Edge Functions → send-confirmation → Logs** to see the error. Usually it's a wrong app password or 2-Step Verification not enabled.
- **"Row level security" errors**: means `schema.sql` wasn't fully run — re-run it from the SQL Editor.
