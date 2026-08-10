// Executes every migration + the generated seed against a real embedded
// Postgres (pglite), then enforces the RLS matrix with two simulated users.
// This is the closest possible verification without a live Supabase project:
// identical SQL, real Postgres semantics, auth.uid() shimmed the way
// Supabase defines it (JWT claim -> uuid).
//
// Run: node scripts/test-migrations.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

const MIG_DIR = new URL('../supabase/migrations/', import.meta.url).pathname;
const SEED = new URL('../supabase/seed.sql', import.meta.url).pathname;

const results = [];
const ok = (name, pass, extra = '') => {
  results.push([pass ? 'PASS' : 'FAIL', name, extra].filter(Boolean).join(' | '));
  console.log(results[results.length - 1]);
};

const db = new PGlite();

// ---- Supabase environment shims (exist on the real platform) -------------
await db.exec(`
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid
    language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text,
    name text,
    owner uuid
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[]
    language sql immutable
    as $$ select string_to_array(name, '/') $$;

  -- Non-superuser role so RLS actually applies during tests.
  create role authenticated nologin;
  grant usage on schema public, auth, storage to authenticated;
`);

// ---- Run migrations in order ---------------------------------------------
for (const f of fs.readdirSync(MIG_DIR).sort()) {
  if (!f.endsWith('.sql')) continue;
  try {
    await db.exec(fs.readFileSync(path.join(MIG_DIR, f), 'utf8'));
    ok(`migration ${f}`, true);
  } catch (e) {
    ok(`migration ${f}`, false, String(e.message).slice(0, 160));
    process.exit(1);
  }
}
await db.exec(`
  grant select, insert, update, delete on all tables in schema public to authenticated;
  grant execute on all functions in schema public to authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
`);

// ---- Seed ----------------------------------------------------------------
if (fs.existsSync(SEED)) {
  try {
    await db.exec(fs.readFileSync(SEED, 'utf8'));
    ok('seed.sql applies', true);
  } catch (e) {
    ok('seed.sql applies', false, String(e.message).slice(0, 200));
    process.exit(1);
  }
  const counts = {};
  for (const t of ['institutions', 'courses', 'entry_requirements', 'recognition_matrix',
    'cost_of_living', 'nearby_attractions', 'scholarships', 'ambassadors', 'ambassador_posts',
    'shorts', 'intake_groups', 'messages', 'embassy_directory', 'support_team', 'badges']) {
    counts[t] = Number((await db.query(`select count(*) c from public.${t}`)).rows[0].c);
  }
  console.log('SEED COUNTS:', JSON.stringify(counts));
  const src = JSON.parse(fs.readFileSync(new URL('../src/data/institutions.json', import.meta.url), 'utf8'));
  const srcCourses = JSON.parse(fs.readFileSync(new URL('../src/data/courses.json', import.meta.url), 'utf8'));
  ok('seed: all institutions preserved', counts.institutions === src.length, `${counts.institutions}/${src.length}`);
  ok('seed: all courses preserved', counts.courses === srcCourses.length, `${counts.courses}/${srcCourses.length}`);
  ok('seed: entry requirements exploded per system', counts.entry_requirements >= srcCourses.length, `${counts.entry_requirements}`);

  // Content roundtrips — counts alone cannot catch a field that survived as
  // the wrong shape (e.g. an array flattened into text).
  const srcAttr = JSON.parse(fs.readFileSync(new URL('../src/data/attractions.json', import.meta.url), 'utf8'));
  const tipAttr = srcAttr.find((a) => Array.isArray(a.tips) && a.tips.length > 1);
  const gotTips = await db.query(`select tips from public.nearby_attractions where id = '${tipAttr.id}'`);
  ok('seed: attraction tips stay a JSON array', JSON.stringify(gotTips.rows[0]?.tips) === JSON.stringify(tipAttr.tips));
  const srcCol = JSON.parse(fs.readFileSync(new URL('../src/data/costOfLiving.json', import.meta.url), 'utf8'));
  const verCol = srcCol.find((c) => (c.verifiedBy ?? []).length > 0);
  const gotVer = await db.query(`select verified_by, rent_options from public.cost_of_living where city = '${verCol.city}' and country = '${verCol.country}'`);
  ok('seed: col verifiedBy stays a JSON array', JSON.stringify(gotVer.rows[0]?.verified_by) === JSON.stringify(verCol.verifiedBy));
  ok('seed: col rentOptions object intact', gotVer.rows[0]?.rent_options?.roomSuburb === verCol.rentOptions.roomSuburb);
  const reqCourse = srcCourses.find((c) => c.requirements && Object.keys(c.requirements).length > 0);
  const [reqSys, reqVal] = Object.entries(reqCourse.requirements)[0];
  const gotReq = await db.query(`select requirement_text, min_value from public.entry_requirements
    where course_id = '${reqCourse.id}' and qualification_system = '${reqSys}'`);
  ok('seed: entry requirement text+min roundtrip', gotReq.rows[0]?.requirement_text === reqVal.display && Number(gotReq.rows[0]?.min_value) === reqVal.min);
}

// ---- Signup trigger ------------------------------------------------------
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
await db.exec(`insert into auth.users (id, email, raw_user_meta_data)
  values ('${A}', 'a@test.example', '{"name":"Student A"}'::jsonb),
         ('${B}', 'b@test.example', '{"name":"Student B"}'::jsonb);`);
const profs = await db.query('select id, name from public.profiles order by name');
ok('trigger: profiles auto-created on signup', profs.rows.length === 2 && profs.rows[0].name === 'Student A');

// ---- RLS matrix with two users -------------------------------------------
// Seed private rows for A as superuser (like the service role would).
await db.exec(`
  -- Self-sufficient catalog fixture (does not rely on seed.sql being present)
  insert into public.institutions (id, name, country, city) values ('test-uni', 'Test University', 'AU', 'Testville')
    on conflict (id) do nothing;
  insert into public.courses (id, institution_id, name, field, level) values ('test-uni-c1', 'test-uni', 'Testing BSc', 'it', 'bachelor')
    on conflict (id) do nothing;
  update public.profiles set emergency_contact_name = 'Mak A', emergency_contact_phone = '+60 000' where id = '${A}';
  insert into public.grades (student_id, subject, grade_value, qualification_system) values ('${A}', 'Maths', 'A', 'spm');
  insert into public.documents (student_id, doc_type, storage_path) values ('${A}', 'passport', '${A}/passport.pdf');
  insert into public.applications (student_id, course_id, status) values ('${A}', 'test-uni-c1', 'submitted');
  insert into public.entitlements (student_id, plan, pass_term, source) values ('${A}', 'season_pass', 'lifetime', 'manual');
  insert into public.coin_ledger (student_id, delta, reason) values ('${A}', 120, 'rule_survey');
  insert into public.intake_groups (id, institution_id, intake_label) values ('test-grp', 'test-uni', 'Feb 2027 (test)');
  insert into public.intake_group_members (group_id, student_id) values ('test-grp', '${A}');
  insert into public.messages (group_id, sender_id, body) values ('test-grp', '${A}', 'hello from A');
  insert into storage.objects (bucket_id, name, owner) values ('documents', '${A}/passport.pdf', '${A}');
`);

const as = async (uid, sql) => {
  // Fresh transaction per check: set role + jwt claim, run, roll back.
  await db.exec('begin');
  await db.exec(`set local role authenticated; set local "request.jwt.claim.sub" = '${uid}';`);
  let out;
  try {
    out = await db.query(sql);
  } catch (e) {
    out = { error: String(e.message) };
  }
  await db.exec('rollback');
  return out;
};

const own = await as(A, 'select name, emergency_contact_name from public.profiles');
ok('RLS: A reads own profile + emergency contact', own.rows?.length === 1 && own.rows[0].emergency_contact_name === 'Mak A');
const cross = await as(B, 'select * from public.profiles');
ok('RLS: B cannot see A profile at all', cross.rows?.length === 1 && cross.rows[0].id === B && !cross.rows[0].emergency_contact_name);
for (const [t, label] of [
  ['grades', 'grades'], ['documents', 'documents'], ['applications', 'applications'],
  ['entitlements', 'entitlements'], ['coin_ledger', 'coin ledger'],
]) {
  const r = await as(B, `select * from public.${t}`);
  ok(`RLS: B sees zero of A's ${label}`, r.rows?.length === 0, r.error ?? '');
}
const msgB = await as(B, "select * from public.messages where group_id = 'test-grp'");
ok('RLS: non-member B cannot read group messages', msgB.rows?.length === 0);
const msgA = await as(A, "select body from public.messages where group_id = 'test-grp'");
ok('RLS: member A reads group messages', msgA.rows?.length === 1);
const sendAsA = await as(B, `insert into public.messages (group_id, sender_id, body) values ('test-grp', '${A}', 'forged') returning id`);
ok('RLS: B cannot forge a message as A', Boolean(sendAsA.error));
const upgrade = await as(B, `update public.entitlements set plan = 'vip' where student_id = '${B}' returning id`);
ok('RLS: client cannot self-upgrade entitlement', Boolean(upgrade.error) || upgrade.rows?.length === 0);
const stObjB = await as(B, "select name from storage.objects where bucket_id = 'documents'");
ok('RLS: B sees zero of A storage objects', stObjB.rows?.length === 0);
const stObjA = await as(A, "select name from storage.objects where bucket_id = 'documents'");
ok('RLS: A sees own storage object', stObjA.rows?.length === 1);
const pub = await as(B, 'select count(*) c from public.institutions');
ok('RLS: catalog publicly readable', Number(pub.rows?.[0]?.c) > 0);
const wr = await as(B, "insert into public.institutions (id, name, country, city) values ('hack', 'Hack U', 'XX', 'Nowhere') returning id");
ok('RLS: client cannot write catalog', Boolean(wr.error));

// redeem_reward: definer function spends atomically, blocks overdraft
const earn = await as(B, "insert into public.coin_ledger (student_id, delta, reason) values (auth.uid(), 50, 'rule_survey') returning id");
ok('RLS: B can earn own positive coins', earn.rows?.length === 1);
await db.exec(`insert into public.coin_ledger (student_id, delta, reason) values ('${B}', 400, 'seedtest')`);
const redeem = await as(B, "select public.redeem_reward('event-ticket', 150) as id");
ok('fn: redeem_reward spends when balance suffices', redeem.rows?.length === 1);
const over = await as(B, "select public.redeem_reward('pass-discount', 99999) as id");
ok('fn: redeem_reward blocks overdraft', Boolean(over.error) && /insufficient/i.test(over.error ?? ''));
const negative = await as(B, "insert into public.coin_ledger (student_id, delta, reason) values (auth.uid(), -500, 'hack') returning id");
ok('RLS: client cannot insert negative coins directly', Boolean(negative.error));

const fails = results.filter((r) => r.startsWith('FAIL'));
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
