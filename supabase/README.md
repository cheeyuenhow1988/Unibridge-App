# UniBridge backend (Supabase) — prototype

The app is **dual-mode**. With no configuration it runs entirely on the
bundled JSON (`src/data/*.json`) — that is what the GitHub Pages demo and
every QA pass use. Point it at a Supabase project and the same screens read
from Postgres instead, with row-level security enforcing who sees what.
Any backend failure falls back to the bundled data with a console warning:
the app never breaks because the backend is down.

```
src/services/api.ts         ← screens call this; signatures never change
  ├─ bundled JSON            (default, and the fallback on any error)
  └─ src/services/backendApi.ts → Supabase (when env vars are set)
supabase/migrations/        ← schema + RLS, one domain per file
  └─ 0008_seed_catalog.sql   ← catalog DATA, generated from the mock JSON
                               (gen-seed.mjs) — applies with the schema
supabase/functions/         ← sync-entitlement edge function
scripts/test-migrations.mjs ← 35-check harness: real embedded Postgres
```

## Why RLS is in the first migration

This database will hold **passports, transcripts and financial documents of
minors and young adults**. Every table is created with row-level security in
the same migration — there is no window where a table exists unprotected.
The harness proves the policies empirically with two simulated users
(see "Verifying" below).

## Deploy via GitHub (recommended — no tools to install)

The repo ships a self-verifying deploy pipeline
(`scripts/deploy-backend.mjs`, run by the `supabase-deploy` workflow). It
needs exactly **one** value:

1. On github.com open the repo → **Settings → Secrets and variables →
   Actions → New repository secret**:
   - Name: `SUPABASE_ACCESS_TOKEN`
   - Value: a personal access token (`sbp_…`) from
     [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
     ("Generate new token", any name).
2. Open the repo's **Actions** tab → **supabase-deploy** → **Run
   workflow** (branch `claude/unibridge-app-prototype-11m67q`). Over the
   Supabase Management API (HTTPS only — no database password needed) it:
   applies all migrations with CLI-compatible version tracking, deploys
   the `sync-entitlement` function, sets the webhook secret, points auth
   at the web app, then **verifies the live database** — seed counts,
   signup trigger, the full two-student RLS matrix through the real API
   gateway, storage folder isolation, entitlement rules, and a live
   realtime message round-trip (throwaway test users, swept afterwards —
   including leftovers of any crashed earlier run).
   When verification passes it **builds the app in live-backend mode and
   publishes it to GitHub Pages under
   [`/Unibridge-App/live/`](https://cheeyuenhow1988.github.io/Unibridge-App/live/)**
   — the root demo stays untouched. It re-runs itself on every push that
   changes `supabase/`.
   If the account has several Supabase projects, add optional secret
   `SUPABASE_PROJECT_REF` (Project Settings → General → Reference ID).
3. **Vercel**: the repo's `vercel.json` already makes Vercel build the app
   correctly. In the Vercel dashboard open the project (or **Add New →
   Project** and import this repo), then under **Settings → Git** set the
   Production Branch to `claude/unibridge-app-prototype-11m67q`. To turn
   the deployed app's backend mode on, either install the **Supabase
   integration** from Vercel's marketplace (it injects the URL and key
   automatically — the build maps them) or add two env vars under
   **Settings → Environment Variables**: `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (values from Supabase **Project
   Settings → API**). Without them Vercel still deploys the bundled-data
   demo, same as GitHub Pages.

The `probe-connections` workflow is a harmless diagnostic that prints which
secrets exist (never values) — handy for checking step 1 worked; safe to
delete anytime.

## Back office (/admin)

A single-page admin console is published at
[`/Unibridge-App/admin/`](https://cheeyuenhow1988.github.io/Unibridge-App/admin/)
by the same pipeline. It signs in through Supabase auth with the ordinary
public key — **admin power comes from the database, not the page**:
migration `0010_admin.sql` adds an `admin_users` table and additive RLS
policies (`is_admin()`), so an account listed there can read every student,
move application stages, grant plans, credit coins, fulfil reward
redemptions, moderate chat, and edit the catalog — while accounts not
listed there see exactly what they always did. The harness proves both
sides (50/50).

To invite an admin: run the **supabase-deploy** workflow with the
`admin_email` input (Actions tab → supabase-deploy → Run workflow). The
pipeline creates the account, emails an invitation that lands on /admin to
set a password, and grants back-office access. Repeat with another email
to add staff later; remove a row from `admin_users` to revoke.

## Zero-to-live runbook (manual CLI alternative, ~20 minutes, free tier)

1. **Create the project** at [database.new](https://database.new) (free
   tier). Pick a region close to Malaysia (Singapore). Save the database
   password somewhere safe.

2. **Link and push schema + data** (from the repo root; the CLI runs via
   npx — nothing to install):

   ```sh
   npx supabase@latest login
   npx supabase@latest link --project-ref <your-project-ref>
   npx supabase@latest db push          # applies migrations 0001…0008
   ```

   Migration `0008_seed_catalog.sql` IS the seed data (102 institutions,
   868 courses, everything) — schema and content land in one push, and the
   Supabase **GitHub connection** applies them the same way on push to its
   configured production branch. It touches catalog tables only, never
   student data.

3. **Regenerating data later:** after `0008` has been applied to a live
   project it is frozen in the migration history — run
   `node scripts/gen-seed.mjs`, then move the output to the next free
   number (e.g. `0009_seed_catalog_v2.sql`) before pushing.

4. **Deploy the entitlement function** and set its webhook secret:

   ```sh
   npx supabase@latest functions deploy sync-entitlement
   npx supabase@latest secrets set ENTITLEMENT_WEBHOOK_SECRET=$(openssl rand -hex 24)
   ```

5. **Point the app at the project.** In the dashboard under
   *Settings → API*, copy the URL and the `anon` key, then:

   ```sh
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
   npx expo start
   ```

   (For a deployed web build, export with the same two variables set.
   They are compile-time — set them before `expo export`.)

6. **Auth**: magic-link email sign-in is enabled by `config.toml`
   (`enable_confirmations = false` for the prototype). The app itself has
   no sign-in UI yet (out of scope) — create test users in the dashboard
   under *Authentication → Users → Add user*, or call
   `backendApi.signInWithEmail(...)` from a dev console. **Signed-out
   behavior**: catalog reads work (public tables); private features
   (documents, applications, coins, group history) come back empty, and
   writes warn + stay local. The profile row is auto-created for every new
   user by the `handle_new_user` trigger.

## Verifying (no live project needed)

```sh
node scripts/test-migrations.mjs
```

Runs every migration (including the generated data) against a real embedded Postgres
(pglite) with Supabase's `auth.uid()` semantics shimmed, then enforces the
RLS matrix with two simulated users: profile/grades/documents/applications/
entitlements/coin isolation, group-message membership gating, message
forgery blocked, entitlement self-upgrade blocked, storage-object folder
isolation, catalog write-protection, redeem overdraft blocked. 35/35 as of
this commit — rerun after every schema change.

### Manual two-account test on the live project

1. Create users `a@…` and `b@…` (dashboard → Authentication).
2. SQL editor, as **service role**: give A a document row and a coin earn.
3. Sign in as B (magic link) in the app / an API client with B's JWT:
   - `select * from documents` → **0 rows** (A's are invisible).
   - `insert into coin_ledger (student_id, delta, reason) values ('<A's id>', 500, 'x')` → **rejected**.
   - `update entitlements set plan='vip'` → **0 rows updated**.
4. Call `sync-entitlement` with B's JWT and `{"plan":"season_pass","pass_term":"monthly"}`
   → B's entitlements row appears; A's is untouched.

## What reads from Postgres vs. what stays bundled

| Domain | Backend mode | Notes |
| --- | --- | --- |
| Institutions, courses, entry requirements, recognition | **Postgres** | text ids preserved — every route/deep link identical |
| Cost of living, attractions, scholarships | **Postgres** | |
| Ambassadors + posts, shorts, support team | **Postgres** | |
| Intake groups + group chat | **Postgres + Realtime** | membership-gated by RLS; live INSERT feed |
| Embassy directory | **Postgres** | emergency phone lines stay bundled |
| Documents vault, applications, coins, entitlements | **Postgres (writes)** | RLS-owned rows; redeem via atomic `redeem_reward()` |
| Qualifications, city info, flights, student life, reviews | Bundled JSON | reference data — tables when an admin tool exists |
| Coursemates, community events, predeparture, mail demo | Bundled JSON | demo/mock content by design (see EMAIL_RELAY.md §9) |

## Prototype caveats (deliberate, revisit at launch)

- **Local state is authoritative.** Stores mirror earns/redemptions/plan
  changes to the backend fire-and-forget; the UI never blocks on it.
  Production flips authority server-side (balance = `sum(delta)` from the
  ledger, plan = entitlements row).
- **Opening a group chat auto-joins it** (mirrors the demo's behavior).
- **Monthly pass expiry** is not scheduled anywhere yet — see the note in
  migration 0004 and STACK.md.
- **No institution portal / multi-tenant anything** — catalog writes go
  through seed scripts and the dashboard only.
- Free-tier limits are fine for a pilot: 500 MB database (seed uses a few
  MB), 1 GB storage, 2M realtime messages/month. Set a **spend cap** in
  the dashboard so a surprise can't bill you.
