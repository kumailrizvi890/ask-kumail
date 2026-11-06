---
title: Fade Kings booking app
url: https://github.com/kumailrizvi890/Barber-Shop
---

# Fade Kings Barber Shop — Lynnwood

A full-stack Next.js booking app (demo build) for Fade Kings Barber Shop (Lynnwood): customers can browse the crew and prices without an account, book a chair as a guest or a member, track appointments, and earn rewards; barbers approve/decline requests, manage weekly availability and services, and post work photos/videos.

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase** (Postgres, Auth, Storage).

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's up, open **SQL Editor** → paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) → Run. This creates every table, row-level-security policy, and the `posts` storage bucket used by the app.
3. Go to **Project Settings → API** and copy the **Project URL** and **anon public key**.
4. In **Authentication → Sign In / Providers**, turn on:
   - **Phone** (customers sign up/log in with phone + password — no SMS provider needed, see below)
   - **Anonymous sign-ins** (powers guest checkout)
5. In **Authentication → Settings**, turn on **"Auto confirm"** for both email and phone (or use the Management API to set `mailer_autoconfirm` / `sms_autoconfirm` to `true`). Without this, new accounts sit unconfirmed and can't write their profile row — the app has no email/SMS-sending step, so autoconfirm is required, not just a testing convenience.

## 2. Configure the app

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on `/auth`. Sign up once as a **Barber** (email + password, add at least one service) so there's someone to book. Customers don't need an account at all: click **"Browse Without Signing Up"** to look around and book — an account only gets created (as a phone-number login) if they choose to save the appointment afterward.

## 4. Deploy

The fastest path is **Vercel**:

1. Push this folder to a GitHub repo (see below).
2. Go to [vercel.com/new](https://vercel.com/new) → import the repo.
3. Add the two env vars from step 2 in the Vercel project settings.
4. Deploy. Vercel auto-detects Next.js — no build config needed.

Any other Node host (Railway, Render, Netlify, self-hosted) works too since this is a standard Next.js app — just set the same two env vars and run `npm run build && npm start`.

## Pushing to GitHub

No GitHub connection was active in this session, so the code lives in this folder rather than a repo. To publish it:

```bash
cd fade-kings   # this folder
git init
git add .
git commit -m "Fade Kings Barber Shop — initial build"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(Create the empty repo on GitHub first, or use `gh repo create` if you have the GitHub CLI.)

## 5. Owner dashboard setup (existing/live project)

The owner dashboard, barber-approval workflow, and live booking counter need a schema update on top of what's already deployed. Since your Supabase project is already live, **don't re-run `schema.sql`** (it's not written to be safely re-run) — instead:

1. Open **SQL Editor** in your Supabase project → paste the contents of [`supabase/migrations/002_owner_dashboard.sql`](./supabase/migrations/002_owner_dashboard.sql) → Run. This adds the `owner` role, a `status` (pending/approved/rejected) column on `profiles` for barber approval, and a public `site_stats` counter that powers the live "Online Bookings" number.
   - Existing barbers are unaffected — the new `status` column defaults to `'approved'` for every existing row, so no one currently live disappears from The Crew.
   - If the last line (`alter publication supabase_realtime add table site_stats;`) errors, it just means Realtime is already on for that table — ignore it. If it fails for another reason, enable Realtime for `site_stats` manually in **Database → Replication**.
2. Promote your own account to owner. Sign up on the live site first (any role — Customer is simplest, just phone + password), then find your user's UUID in **Authentication → Users**, and run in SQL Editor:
   ```sql
   update profiles set role = 'owner', status = 'approved' where id = '<paste-your-user-uuid>';
   ```
3. Log in at `/auth` with that account — you'll land on `/owner/dashboard`.

New barber signups now land on a "Application under review" screen (`/pending`) until you approve them from `/owner/crew`. Approved barbers immediately show up in The Crew and can take bookings; rejected ones see a decline message and stay out of the crew list.

## What's implemented

- **Auth**: barbers use email/password; customers use phone/password. Role picker on signup; barber signup also collects location/bio and a repeatable services-&-rates builder.
- **Guest checkout**: customers can browse barbers, prices, and availability with zero account (public read access via RLS), and complete a full booking as a Supabase anonymous session. After booking, they're prompted to add a name/phone/password to keep the appointment and start earning points — this *upgrades* the same anonymous account in place (via `supabase.auth.updateUser`), so nothing already booked is lost or re-created under a new id.
- **Customer app**: Home (crew list, book-now hero), 3-step Book flow (barber → service/date/time → confirm) plus a 4th "save your spot" step for guests, Bookings list with status stripes and tap-to-rate, Rewards (points, progress bar, 5000-pt redemption).
- **Barber app**: Requests (approve/decline), Schedule (Bookings sub-tab with reminder/complete actions; Availability sub-tab with per-weekday recurring slot blocking), Profile (services CRUD, My Work photo/video uploads to Supabase Storage).
- **Notifications**: bell + slide-down panel, generated on request/approve/decline/reminder/completion, unread badge, mark-as-read.
- **Rewards**: 10 points per $1, credited on rating; 5000-point redemption.
- **Owner dashboard** (`/owner`): approve/reject barber applications, browse the crew with per-barber stats (revenue YTD/month/all-time, bookings, cuts completed), shop-wide revenue and booking totals, and a live "Online Bookings" counter (also shown to anonymous visitors on the `/auth` landing page) via a Supabase Realtime-backed public counter.
- **Data**: everything lives in Postgres via `supabase/schema.sql` — no mock/in-memory state.

## Notes & things you may want to adjust

- **Reminders** are barber-triggered (a button), same as the original prototype — wire this to a Supabase Edge Function + cron if you want real 1-hour-before reminders sent automatically.
- **Slot availability** combines the barber's real blocked slots (`availability` table) with a small amount of deterministic pseudo-randomness (`seededUnavailable` in `app/customer/book/page.tsx`) so the demo doesn't show every slot open before any bookings exist — remove that once you have real booking-density data to grey out slots from.
- **Barber rating** is recalculated as a simple running average of a barber's rated bookings each time a new rating comes in.
- The phone-frame prototype was mobile-only; this rebuild is a responsive web app. The logged-in customer/barber screens use a centered phone-width card shell on desktop (see `.app-shell` in `app/globals.css`) since they're a task-focused, single-column flow. The public landing page (`/auth`) is a full-width, full-bleed marketing page instead.
