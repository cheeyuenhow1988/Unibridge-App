-- 0003 Applications & documents
-- The most sensitive tables in the product (passports, transcripts,
-- financial documents). RLS from birth; files live in the PRIVATE
-- 'documents' storage bucket under documents/{student_id}/... (policies in
-- migration 0007).

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  doc_type text not null,
  storage_path text not null,
  expiry_date date,
  status text not null default 'uploaded',
  uploaded_at timestamptz not null default now()
);
alter table public.documents enable row level security;
create policy "documents: own select" on public.documents
  for select using (student_id = auth.uid());
create policy "documents: own insert" on public.documents
  for insert with check (student_id = auth.uid());
create policy "documents: own update" on public.documents
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "documents: own delete" on public.documents
  for delete using (student_id = auth.uid());
create index documents_student_idx on public.documents (student_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null references public.courses (id),
  status text not null default 'submitted' check (status in
    ('submitted', 'under_review', 'conditional_offer', 'offer', 'accepted', 'coe_issued')),
  fee_waived boolean not null default false,
  priority_badge boolean not null default false,
  intake text,
  scholarship_id text references public.scholarships (id),
  history jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  decision_at timestamptz
);
alter table public.applications enable row level security;
create policy "applications: own select" on public.applications
  for select using (student_id = auth.uid());
create policy "applications: own insert" on public.applications
  for insert with check (student_id = auth.uid());
create policy "applications: own update" on public.applications
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());
create index applications_student_idx on public.applications (student_id);

create table public.application_documents (
  application_id uuid not null references public.applications (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  reviewed_by_team boolean not null default false,
  primary key (application_id, document_id)
);
alter table public.application_documents enable row level security;
-- Row is visible/writable only when the parent application is the student's.
create policy "app_docs: via own application" on public.application_documents
  for all using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.student_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.student_id = auth.uid()
    )
  );

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  offer_type text not null default 'offer',
  deposit_required numeric,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.offers enable row level security;
create policy "offers: via own application" on public.offers
  for all using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.student_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.student_id = auth.uid()
    )
  );
