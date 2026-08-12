-- 0009 Realtime publication
-- Live group chat streams postgres_changes INSERTs on public.messages; on
-- hosted Supabase a table only emits those when it is in the
-- supabase_realtime publication. Guarded so environments without that
-- publication (the pglite test harness, plain Postgres) apply cleanly.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
  end if;
end
$$;
