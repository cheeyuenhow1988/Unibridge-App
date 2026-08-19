-- 0016 Date window for the registration funnel: the Overview lets the
-- back office pick a period and see the same counts for accounts created
-- inside it. Postgres cannot change a function's arguments with
-- create-or-replace, so the 0015 zero-argument version is dropped first
-- (calls without arguments keep working through the defaults).
drop function public.admin_signup_funnel();
create function public.admin_signup_funnel(p_from timestamptz default null, p_to timestamptz default null)
returns table (registered bigint, confirmed bigint, signed_in bigint, waiting_confirm bigint)
language sql stable
security definer
set search_path = public
as $$
  select count(*),
         count(*) filter (where u.email_confirmed_at is not null),
         count(*) filter (where u.last_sign_in_at is not null),
         count(*) filter (where u.email_confirmed_at is null)
    from auth.users u
   where not exists (select 1 from public.admin_users a where a.user_id = u.id)
     and (p_from is null or u.created_at >= p_from)
     and (p_to is null or u.created_at <= p_to)
     and public.is_admin(auth.uid());
$$;
