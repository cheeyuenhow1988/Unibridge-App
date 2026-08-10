-- 0004 Entitlements & monetization
-- One row per student. NO expiry column: season_pass (lifetime term) and vip
-- are permanent once granted — matching the one-time-purchase model. The
-- monthly Season Pass term is granted the same way today; when real IAP
-- lands, Apple/Google notifications simply stop re-upserting an expired
-- monthly and a scheduled check downgrades it (launch task, documented in
-- STACK.md — deliberately absent here).

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'season_pass', 'vip')),
  pass_term text check (pass_term in ('monthly', 'lifetime')),
  granted_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('iap_apple', 'iap_google', 'manual')),
  receipt_reference text
);
alter table public.entitlements enable row level security;
-- Students can READ their entitlement. They can NOT write it — grants come
-- only from the sync-entitlement function (service role), so a client can
-- never self-upgrade by editing its own row.
create policy "entitlements: own select" on public.entitlements
  for select using (student_id = auth.uid());

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  reward_item text not null,
  coin_cost int not null check (coin_cost > 0),
  redeemed_at timestamptz not null default now()
);
alter table public.redemptions enable row level security;
create policy "redemptions: own select" on public.redemptions
  for select using (student_id = auth.uid());
-- Inserts happen only through public.redeem_reward() (defined with the
-- coin ledger in migration 0005), which checks the balance atomically.
