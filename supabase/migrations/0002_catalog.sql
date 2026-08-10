-- 0002 Institutions & courses catalog
-- Public read, zero client write: content is managed by seed scripts and the
-- Supabase dashboard until an admin tool exists (solo-founder constraint).
-- Text primary keys keep the prototype's existing ids ('au-monash',
-- 'au-monash-c1') so every QA-tested route and deep link stays valid.

create table public.institutions (
  id text primary key,
  name text not null,
  short_name text,
  type text,
  country text not null,
  city text not null,
  is_verified_partner boolean not null default false,
  partnership_commission_pct numeric,
  contact_email text,
  contact_phone text,
  tagline text,
  founded int,
  students int,
  website text,
  wikipedia text,
  logo text,
  qs_rank int,
  language text,
  food_mins int,
  photos jsonb not null default '[]'::jsonb
);
alter table public.institutions enable row level security;
create policy "institutions: public read" on public.institutions for select using (true);

create table public.courses (
  id text primary key,
  institution_id text not null references public.institutions (id) on delete cascade,
  name text not null,
  field text not null,
  level text not null,
  campus_city text,
  country text,
  duration_years numeric,
  semesters_per_year int,
  annual_tuition_local numeric,
  tuition_currency text,
  english_requirement jsonb not null default '{}'::jsonb,
  intake_dates jsonb not null default '[]'::jsonb,
  selectivity numeric
);
alter table public.courses enable row level security;
create policy "courses: public read" on public.courses for select using (true);
create index courses_institution_idx on public.courses (institution_id);
create index courses_field_idx on public.courses (field);

create table public.entry_requirements (
  id bigint generated always as identity primary key,
  course_id text not null references public.courses (id) on delete cascade,
  qualification_system text not null,
  requirement_text text not null,
  min_value numeric,
  unique (course_id, qualification_system)
);
alter table public.entry_requirements enable row level security;
create policy "entry_requirements: public read" on public.entry_requirements for select using (true);
create index entry_requirements_course_idx on public.entry_requirements (course_id);

-- Recognition data exists per institution × home country in the prototype
-- dataset, so the matrix references institutions (documented deviation from
-- the course-level draft — no per-course recognition data exists to seed).
create table public.recognition_matrix (
  id bigint generated always as identity primary key,
  institution_id text not null references public.institutions (id) on delete cascade,
  home_country text not null,
  is_recognized boolean not null,
  notes text,
  unique (institution_id, home_country)
);
alter table public.recognition_matrix enable row level security;
create policy "recognition: public read" on public.recognition_matrix for select using (true);

create table public.cost_of_living (
  id bigint generated always as identity primary key,
  city text not null,
  country text not null,
  rent_monthly numeric not null,
  food_monthly numeric not null,
  transport_monthly numeric not null,
  insurance_monthly numeric,
  visa_fee_oneoff numeric,
  currency text not null,
  unique (city, country)
);
alter table public.cost_of_living enable row level security;
create policy "col: public read" on public.cost_of_living for select using (true);

create table public.nearby_attractions (
  id bigint generated always as identity primary key,
  institution_id text not null references public.institutions (id) on delete cascade,
  name text not null,
  type text not null,
  distance_label text,
  description text,
  image_url text,
  rating numeric,
  review_count int,
  review_snippet text,
  photos jsonb not null default '[]'::jsonb
);
alter table public.nearby_attractions enable row level security;
create policy "attractions: public read" on public.nearby_attractions for select using (true);
create index attractions_institution_idx on public.nearby_attractions (institution_id);

create table public.scholarships (
  id text primary key,
  name text not null,
  institution_id text references public.institutions (id) on delete set null,
  provider text,
  destination_country text,
  eligible_nationalities jsonb not null default '[]'::jsonb,
  field text,
  amount_or_coverage text,
  deadline text
);
alter table public.scholarships enable row level security;
create policy "scholarships: public read" on public.scholarships for select using (true);
