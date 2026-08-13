-- 0013 Master account (owner) powers over the admin roster
-- Owners ("master accounts") can see and manage the whole back-office team;
-- staff admins still see only their own row. Guard rails: nobody can touch
-- their OWN row through these policies, so a master cannot lock themselves
-- out and staff cannot self-promote.

alter table public.admin_users add column email text;

create or replace function public.is_owner(uid uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = uid and role = 'owner');
$$;

create policy "admin_users: owner reads all" on public.admin_users
  for select using (public.is_owner(auth.uid()));
create policy "admin_users: owner adds admins" on public.admin_users
  for insert with check (public.is_owner(auth.uid()));
create policy "admin_users: owner updates others" on public.admin_users
  for update using (public.is_owner(auth.uid()) and user_id <> auth.uid())
  with check (public.is_owner(auth.uid()));
create policy "admin_users: owner removes others" on public.admin_users
  for delete using (public.is_owner(auth.uid()) and user_id <> auth.uid());
