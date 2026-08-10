-- 0006 Community & safety
-- Ambassadors get their own table (posts and shorts reference them).
-- messages carries an explicit recipient_id for 1:1 threads so thread
-- readability is enforceable in RLS, not by convention.

create table public.ambassadors (
  id text primary key,
  name text not null,
  institution_id text references public.institutions (id) on delete set null,
  home_country text,
  course text,
  avatar_url text,
  bio text
);
alter table public.ambassadors enable row level security;
create policy "ambassadors: public read" on public.ambassadors for select using (true);

create table public.intake_groups (
  id text primary key,
  institution_id text not null references public.institutions (id) on delete cascade,
  intake_label text not null,
  member_count int not null default 0
);
alter table public.intake_groups enable row level security;
create policy "groups: public read" on public.intake_groups for select using (true);

create table public.intake_group_members (
  group_id text not null references public.intake_groups (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, student_id)
);
alter table public.intake_group_members enable row level security;

-- Membership checks live in a security-definer helper: policies that query
-- the members table directly (from itself or from messages) hit Postgres's
-- infinite-recursion guard. The definer function reads past RLS safely and
-- leaks nothing beyond a boolean.
create or replace function public.is_group_member(gid text, uid uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.intake_group_members
    where group_id = gid and student_id = uid
  );
$$;

create policy "group_members: own rows" on public.intake_group_members
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
-- Members can see who else is in a group they belong to.
create policy "group_members: fellow members read" on public.intake_group_members
  for select using (public.is_group_member(group_id, auth.uid()));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id text references public.intake_groups (id) on delete cascade,
  thread_id text,
  recipient_id uuid references public.profiles (id) on delete cascade,
  sender_id uuid not null,
  sender_type text not null default 'student' check (sender_type in ('student', 'staff', 'ambassador')),
  body text not null,
  created_at timestamptz not null default now(),
  check (group_id is not null or thread_id is not null)
);
alter table public.messages enable row level security;
-- Read: group members for group messages; sender or recipient for threads.
create policy "messages: group members read" on public.messages
  for select using (
    (group_id is not null and public.is_group_member(group_id, auth.uid()))
    or (thread_id is not null and (sender_id = auth.uid() or recipient_id = auth.uid()))
  );
-- Write: only as yourself, and only into groups you belong to (staff and
-- ambassador sends use the service role, which bypasses RLS).
create policy "messages: own send" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id, auth.uid()))
  );
create index messages_group_idx on public.messages (group_id, created_at);
create index messages_thread_idx on public.messages (thread_id, created_at);

create table public.ambassador_posts (
  id text primary key,
  ambassador_id text not null references public.ambassadors (id) on delete cascade,
  institution_id text references public.institutions (id) on delete set null,
  caption text not null,
  media_urls jsonb not null default '[]'::jsonb,
  is_reality_check boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ambassador_posts enable row level security;
create policy "posts: public read" on public.ambassador_posts for select using (true);

create table public.shorts (
  id text primary key,
  ambassador_id text references public.ambassadors (id) on delete set null,
  title text not null,
  video_url text,
  thumbnail_url text,
  duration_sec int,
  view_count int not null default 0,
  is_reality_check boolean not null default false
);
alter table public.shorts enable row level security;
create policy "shorts: public read" on public.shorts for select using (true);

create table public.embassy_directory (
  id bigint generated always as identity primary key,
  home_country text not null,
  destination_country text not null,
  city text not null,
  name text not null,
  address text,
  phone text,
  emergency_phone text
);
alter table public.embassy_directory enable row level security;
create policy "embassies: public read" on public.embassy_directory for select using (true);

create table public.support_team (
  id text primary key,
  name text not null,
  role text not null,
  avatar_url text,
  phone text,
  email text
);
alter table public.support_team enable row level security;
create policy "support_team: public read" on public.support_team for select using (true);

create table public.buddy_opt_ins (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  opted_in boolean not null default false,
  flight_date date
);
alter table public.buddy_opt_ins enable row level security;
create policy "buddy: own all" on public.buddy_opt_ins
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
