-- 0005 Rewards
-- Append-only coin ledger: balance is always sum(delta). Redemption spends
-- go through a security-definer function so the balance check and the two
-- writes are one atomic step the client cannot fake or race.

create table public.coin_ledger (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  delta int not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.coin_ledger enable row level security;
create policy "coins: own select" on public.coin_ledger
  for select using (student_id = auth.uid());
-- Clients may record EARNS for themselves (positive deltas only — the
-- prototype's earn rules run client-side for now; production moves earns
-- server-side too). Spends are function-only.
create policy "coins: own earn insert" on public.coin_ledger
  for insert with check (student_id = auth.uid() and delta > 0);
create index coin_ledger_student_idx on public.coin_ledger (student_id);

create table public.badges (
  id text primary key,
  code text not null unique,
  name text not null,
  description text,
  journey_stage int
);
alter table public.badges enable row level security;
create policy "badges: public read" on public.badges for select using (true);

create table public.student_badges (
  student_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (student_id, badge_id)
);
alter table public.student_badges enable row level security;
create policy "student_badges: own all" on public.student_badges
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Atomic redemption: check balance, spend, record — or raise.
create or replace function public.redeem_reward(item text, cost int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  balance int;
  redemption_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if cost <= 0 then
    raise exception 'invalid cost';
  end if;
  select coalesce(sum(delta), 0) into balance
    from public.coin_ledger where student_id = uid;
  if balance < cost then
    raise exception 'insufficient coins: have %, need %', balance, cost;
  end if;
  insert into public.coin_ledger (student_id, delta, reason)
    values (uid, -cost, 'redeem:' || item);
  insert into public.redemptions (student_id, reward_item, coin_cost)
    values (uid, item, cost)
    returning id into redemption_id;
  return redemption_id;
end;
$$;
