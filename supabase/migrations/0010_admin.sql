-- 0010 Back office (admin) permission layer
-- Admins are ordinary auth users listed in admin_users. Every policy here is
-- ADDITIVE: students' own-row policies are untouched, and is_admin() is
-- false for everyone not in the table, so nothing changes for normal users.
-- Writes that stay service-role-only elsewhere (coin spends) stay that way —
-- admins get explicit, auditable powers instead.

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
-- Users may check whether THEY are an admin (the back office gate).
create policy "admin_users: self see" on public.admin_users
  for select using (user_id = auth.uid());

create or replace function public.is_admin(uid uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = uid);
$$;

-- ---- students & their journey (read) --------------------------------------
create policy "profiles: admin read" on public.profiles
  for select using (public.is_admin(auth.uid()));
create policy "grades: admin read" on public.grades
  for select using (public.is_admin(auth.uid()));
create policy "english: admin read" on public.english_scores
  for select using (public.is_admin(auth.uid()));
create policy "parent_links: admin read" on public.parent_links
  for select using (public.is_admin(auth.uid()));
create policy "documents: admin read" on public.documents
  for select using (public.is_admin(auth.uid()));
create policy "buddy: admin read" on public.buddy_opt_ins
  for select using (public.is_admin(auth.uid()));
create policy "group_members: admin read" on public.intake_group_members
  for select using (public.is_admin(auth.uid()));

-- ---- applications pipeline (read + move status) ---------------------------
create policy "applications: admin read" on public.applications
  for select using (public.is_admin(auth.uid()));
create policy "applications: admin update" on public.applications
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "app_docs: admin read" on public.application_documents
  for select using (public.is_admin(auth.uid()));
create policy "offers: admin all" on public.offers
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---- entitlements & rewards ------------------------------------------------
-- Admin grants join the edge function as the only entitlement write paths.
create policy "entitlements: admin read" on public.entitlements
  for select using (public.is_admin(auth.uid()));
create policy "entitlements: admin write" on public.entitlements
  for insert with check (public.is_admin(auth.uid()));
create policy "entitlements: admin update" on public.entitlements
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "coins: admin read" on public.coin_ledger
  for select using (public.is_admin(auth.uid()));
-- Admin adjustments (bonus grants, corrections) may be negative; the reason
-- column keeps them auditable.
create policy "coins: admin insert" on public.coin_ledger
  for insert with check (public.is_admin(auth.uid()));

-- Redemption fulfilment tracking for the back office.
alter table public.redemptions add column fulfilled boolean not null default false;
alter table public.redemptions add column fulfilled_at timestamptz;
create policy "redemptions: admin read" on public.redemptions
  for select using (public.is_admin(auth.uid()));
create policy "redemptions: admin update" on public.redemptions
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---- community moderation ---------------------------------------------------
create policy "messages: admin read" on public.messages
  for select using (public.is_admin(auth.uid()));
create policy "messages: admin delete" on public.messages
  for delete using (public.is_admin(auth.uid()));

-- ---- catalog management -----------------------------------------------------
-- One write policy per catalog table (public read policies already exist).
create policy "institutions: admin write" on public.institutions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "courses: admin write" on public.courses
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "entry_requirements: admin write" on public.entry_requirements
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "recognition: admin write" on public.recognition_matrix
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "col: admin write" on public.cost_of_living
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "attractions: admin write" on public.nearby_attractions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "scholarships: admin write" on public.scholarships
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "ambassadors: admin write" on public.ambassadors
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "posts: admin write" on public.ambassador_posts
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "shorts: admin write" on public.shorts
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "groups: admin write" on public.intake_groups
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "embassies: admin write" on public.embassy_directory
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "support_team: admin write" on public.support_team
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "badges: admin write" on public.badges
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---- storage: admins may review uploaded documents --------------------------
create policy "documents bucket: admin read" on storage.objects
  for select using (bucket_id = 'documents' and public.is_admin(auth.uid()));
