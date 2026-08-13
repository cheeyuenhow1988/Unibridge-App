-- 0014 Team security: IP whitelist for STAFF admin access
-- Once at least one entry exists, staff admins must come from an allowed
-- address — every admin read/write policy inherits it through is_admin().
-- MASTER accounts (role owner) are never IP-restricted, which also makes
-- lock-out impossible. Client IP comes from the gateway's x-forwarded-for
-- header — defense in depth on top of auth, not a replacement for it.

create table public.admin_ip_whitelist (
  id uuid primary key default gen_random_uuid(),
  cidr text not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.admin_ip_whitelist enable row level security;
create policy "ipwl: owner manages" on public.admin_ip_whitelist
  for all using (public.is_owner(auth.uid())) with check (public.is_owner(auth.uid()));
create policy "ipwl: admins read" on public.admin_ip_whitelist
  for select using (exists (select 1 from public.admin_users where user_id = auth.uid()));

create or replace function public.admin_ip_ok()
returns boolean
language plpgsql stable
security definer
set search_path = public
as $$
declare
  n int;
  ip text;
begin
  select count(*) into n from public.admin_ip_whitelist;
  if n = 0 then
    return true; -- no whitelist configured: IP gating off
  end if;
  begin
    ip := trim(split_part(coalesce(
      nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1));
    if ip = '' then
      return false;
    end if;
    return exists (select 1 from public.admin_ip_whitelist w where ip::inet <<= w.cidr::inet);
  exception when others then
    return false; -- malformed header/ip/cidr never grants access
  end;
end;
$$;

-- Staff admin powers now also require an allowed address; owners bypass.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = uid)
     and (public.is_owner(uid) or public.admin_ip_ok());
$$;
