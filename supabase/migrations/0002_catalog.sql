-- 0002 Institutions & courses catalog
-- Public read, zero client write: content is managed by seed scripts and the
-- Supabase dashboard until an admin tool exists (solo-founder constraint).
-- Text primary keys keep the prototype's existing ids ('au-monash',
-- 'au-monash-c1') so every QA-tested route and deep link stays valid.
-- Columns mirror the REAL mock dataset field-for-field — the seed migrates
-- with zero data loss.

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
  languages jsonb not null default '[]'::jsonb,
  campuses jsonb not null default '[]'::jsonb,
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
  tuition_per_semester numeric,
  tuition_currency text,
  application_fee numeric,
  one_off_fees jsonb not null default '[]'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  local_requirement_note text,
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

create table public.recognition_matrix (
  id bigint generated always as identity primary key,
  course_id text not null references public.courses (id) on delete cascade,
  home_country text not null,
  is_recognized boolean not null,
  notes text,
  unique (course_id, home_country)
);
alter table public.recognition_matrix enable row level security;
create policy "recognition: public read" on public.recognition_matrix for select using (true);
create index recognition_course_idx on public.recognition_matrix (course_id);

create table public.cost_of_living (
  id bigint generated always as identity primary key,
  city text not null,
  country text not null,
  rent_monthly numeric not null,
  rent_options jsonb not null default '[]'::jsonb,
  food_monthly numeric not null,
  transport_monthly numeric not null,
  utilities_monthly numeric,
  eating_out_meal numeric,
  insurance_yearly numeric,
  visa_fee_oneoff numeric,
  currency text not null,
  last_verified text,
  verified_by text,
  unique (city, country)
);
alter table public.cost_of_living enable row level security;
create policy "col: public read" on public.cost_of_living for select using (true);

create table public.nearby_attractions (
  id text primary key,
  institution_id text not null references public.institutions (id) on delete cascade,
  name text not null,
  type text not null,
  distance_minutes int,
  description text,
  image_url text,
  tips text,
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
  provider text,
  destination_country text,
  coverage_type text,
  percent_tuition numeric,
  eligibility_note text,
  eligible_nationalities jsonb not null default '[]'::jsonb,
  fields jsonb not null default '[]'::jsonb,
  deadline text
);
alter table public.scholarships enable row level security;
create policy "scholarships: public read" on public.scholarships for select using (true);
