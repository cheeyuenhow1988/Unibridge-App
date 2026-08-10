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
supabase/seed.sql           ← generated from the mock JSON (gen-seed.mjs)
supabase/functions/         ← sync-entitlement edge function
scripts/test-migrations.mjs ← 35-check harness: real embedded Postgres
```

## Why RLS is in the first migration

This database will hold **passports, transcripts and financial documents of
minors and young adults**. Every table is created with row-level security in
the same migration — there is no window where a table exists unprotected.
The harness proves the policies empirically with two simulated users
(see "Verifying" below).

## Zero-to-live runbook (~20 minutes, free tier)

1. **Create the project** at [database.new](https://database.new) (free
   tier). Pick a region close to Malaysia (Singapore). Save the database
   password somewhere safe.

2. **Link and push the schema** (from the repo root; the CLI runs via npx —
   nothing to install):

   ```sh
   npx supabase@latest login
   npx supabase@latest link --project-ref <your-project-ref>
   npx supabase@latest db push          # applies migrations 0001…0007
   ```

3. **Load the seed data.** Regenerate first if the mock JSON changed:

   ```sh
   node scripts/gen-seed.mjs            # writes supabase/seed.sql
   ```

   Then paste `supabase/seed.sql` into the dashboard's **SQL Editor** and
   run it (or `psql "$DB_URL" -f supabase/seed.sql`). It is idempotent —
   it truncates and reinserts the catalog tables only, never student data.

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

Runs every migration + the generated seed against a real embedded Postgres
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
