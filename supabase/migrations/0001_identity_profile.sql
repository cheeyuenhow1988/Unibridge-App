-- 0001 Identity & profile
-- Holds personal data of minors/young adults: RLS is enabled here, in the
-- same migration that creates each table — never added later.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  home_country text,
  nationality text,
  qualification_system text,
  intake_year int,
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text,
  emergency_contact_email text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: own select" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: own insert" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles: own update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create the profile row on signup so every auth path (email, magic
-- link, future OAuth) is consistent — no app-code inserts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Door-2 parent link: a phone/handle the notification bot pushes to.
-- Deliberately NOT an auth account.
create table public.parent_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'telegram')),
  phone_or_handle text not null,
  opted_in boolean not null default false,
  linked_at timestamptz not null default now()
);
alter table public.parent_links enable row level security;
create policy "parent_links: own all" on public.parent_links
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  grade_value text not null,
  qualification_system text not null
);
alter table public.grades enable row level security;
create policy "grades: own all" on public.grades
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create index grades_student_idx on public.grades (student_id);

create table public.english_scores (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  test_type text not null default 'none' check (test_type in ('ielts', 'toefl', 'none')),
  score numeric,
  test_date date
);
alter table public.english_scores enable row level security;
create policy "english: own all" on public.english_scores
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
