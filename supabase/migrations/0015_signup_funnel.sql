-- 0015 Registration funnel for the back office: how many students created
-- an account, confirmed their email, and signed in at least once. The
-- "never confirmed" bucket is the early-warning light for email-delivery
-- problems (many registered, few confirmed → emails are not arriving).
-- auth.users is not client-readable, so a security-definer function hands
-- admins AGGREGATE COUNTS only — no addresses. Non-admins get zeros.
-- Back-office team accounts are excluded — this counts students.

create or replace function public.admin_signup_funnel()
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
     and public.is_admin(auth.uid());
$$;
