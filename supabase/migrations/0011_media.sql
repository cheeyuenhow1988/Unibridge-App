-- 0011 Institution media bucket
-- Back-office photo uploads for the catalog. PUBLIC read (these are campus
-- photos shown in the app), writes/deletes strictly admin-only.
insert into storage.buckets (id, name, public)
values ('institution-media', 'institution-media', true)
on conflict (id) do update set public = true;

create policy "media: public read" on storage.objects
  for select using (bucket_id = 'institution-media');
create policy "media: admin insert" on storage.objects
  for insert with check (bucket_id = 'institution-media' and public.is_admin(auth.uid()));
create policy "media: admin update" on storage.objects
  for update using (bucket_id = 'institution-media' and public.is_admin(auth.uid()))
  with check (bucket_id = 'institution-media' and public.is_admin(auth.uid()));
create policy "media: admin delete" on storage.objects
  for delete using (bucket_id = 'institution-media' and public.is_admin(auth.uid()));
