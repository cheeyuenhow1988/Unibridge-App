// Deploys the complete UniBridge backend to a Supabase project using ONLY
// the Management API over HTTPS — no CLI, no database password. Runs in
// GitHub Actions (see .github/workflows/supabase-deploy.yml) with a single
// secret: SUPABASE_ACCESS_TOKEN (a personal token from
// supabase.com/dashboard/account/tokens).
//
// What it does, in order:
//   1. Finds the project (or uses SUPABASE_PROJECT_REF if set)
//   2. Applies pending migrations 0001…000N with CLI-compatible version
//      tracking (large seed migrations are applied in batches)
//   3. Deploys the sync-entitlement edge function
//   4. Ensures the ENTITLEMENT_WEBHOOK_SECRET function secret exists
//   5. Points auth site_url/redirects at the deployed web app
//   6. VERIFIES the live database end to end: seed counts, the signup
//      trigger, the full two-student RLS matrix through the real API
//      gateway (documents, grades, entitlements, coins, group chat,
//      storage), the edge function's auth rules, and a live realtime
//      message round-trip. Test users are deleted afterwards.
//
// Idempotent: safe to re-run. Prints only public values (project URL,
// publishable key) — never tokens, service keys, passwords, or JWTs.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { splitStatements } from './sql-split.mjs';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API = 'https://api.supabase.com';
const MIG_DIR = new URL('../supabase/migrations/', import.meta.url).pathname;
const FN_ENTRY = new URL('../supabase/functions/sync-entitlement/index.ts', import.meta.url).pathname;
const PAGES_URL = 'https://cheeyuenhow1988.github.io/Unibridge-App';

const results = [];
const ok = (name, pass, extra = '') => {
  results.push([pass ? 'PASS' : 'FAIL', name, extra].filter(Boolean).join(' | '));
  console.log(results[results.length - 1]);
};
const fatal = (msg) => {
  console.error(`FATAL | ${msg}`);
  process.exit(1);
};

if (!TOKEN) {
  console.log('Not deploying — the SUPABASE_ACCESS_TOKEN repository secret is not set.');
  console.log('Add it under GitHub → repo → Settings → Secrets and variables → Actions.');
  console.log('Value: a personal access token (sbp_…) from supabase.com/dashboard/account/tokens.');
  process.exit(0);
}

// ---------------------------------------------------------------- helpers

async function api(method, p, body, { form = false, retries = 3 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const headers = { Authorization: `Bearer ${TOKEN}` };
    let payload = body;
    if (body !== undefined && !form) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(`${API}${p}`, { method, headers, body: payload });
    } catch (e) {
      if (attempt <= retries) { await sleep(2000 * attempt); continue; }
      throw e;
    }
    if (res.status >= 500 && attempt <= retries) { await sleep(2000 * attempt); continue; }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSql(ref, query, label) {
  const { status, data } = await api('POST', `/v1/projects/${ref}/database/query`, { query });
  if (status < 200 || status >= 300) {
    throw new Error(`${label ?? 'sql'}: HTTP ${status} ${JSON.stringify(data).slice(0, 400)}`);
  }
  // Normalize across Management API versions: rows may arrive as a bare
  // array or wrapped in {result}/{rows}.
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.rows)) return data.rows;
  return data ?? [];
}

// -------------------------------------------------------- project discovery

const projects = await api('GET', '/v1/projects');
if (projects.status !== 200) fatal(`cannot list projects: HTTP ${projects.status} ${JSON.stringify(projects.data).slice(0, 200)}`);
let project;
const wanted = process.env.SUPABASE_PROJECT_REF;
if (wanted) {
  project = projects.data.find((p) => p.id === wanted);
  if (!project) fatal(`SUPABASE_PROJECT_REF=${wanted} not found in this account`);
} else if (projects.data.length === 1) {
  project = projects.data[0];
} else {
  project = projects.data.find((p) => /unibridge/i.test(p.name) && !/INACTIVE|REMOVED/i.test(p.status))
    ?? projects.data.find((p) => !/INACTIVE|REMOVED/i.test(p.status));
  if (projects.data.length > 1) {
    console.log(`Multiple projects found — using "${project?.name}". Set SUPABASE_PROJECT_REF to override.`);
  }
}
if (!project) fatal('no usable Supabase project found in this account');
const REF = project.id;
console.log(`Project: ${project.name} (${REF}) | region ${project.region} | status ${project.status}`);

for (let i = 0; i < 30 && !/ACTIVE_HEALTHY/i.test(project.status); i++) {
  console.log(`Waiting for project to be healthy (currently ${project.status})…`);
  await sleep(10000);
  const p = await api('GET', `/v1/projects/${REF}`);
  if (p.status === 200) project = p.data;
}
if (!/ACTIVE_HEALTHY/i.test(project.status)) fatal(`project is not healthy: ${project.status}`);

// ------------------------------------------------------------- migrations

async function applyMigrations() {
  await runSql(REF, `
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key, statements text[], name text
    );`, 'migration tracking bootstrap');
  const appliedRows = await runSql(REF, 'select version from supabase_migrations.schema_migrations', 'read applied');
  const applied = new Set((appliedRows ?? []).map((r) => r.version));

  const files = fs.readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const version = f.split('_')[0];
    if (applied.has(version)) {
      ok(`migration ${f}`, true, 'already applied');
      continue;
    }
    const sql = fs.readFileSync(path.join(MIG_DIR, f), 'utf8');
    const BATCH_ABOVE = 500_000; // bytes — small files go up whole
    try {
      if (sql.length <= BATCH_ABOVE) {
        await runSql(REF, sql, f);
      } else {
        const stmts = splitStatements(sql);
        const BATCH = 800;
        for (let i = 0; i < stmts.length; i += BATCH) {
          const chunk = `begin;\n${stmts.slice(i, i + BATCH).join('\n')}\ncommit;`;
          await runSql(REF, chunk, `${f} [${i}-${Math.min(i + BATCH, stmts.length)}/${stmts.length}]`);
          console.log(`  ${f}: ${Math.min(i + BATCH, stmts.length)}/${stmts.length} statements`);
        }
      }
      await runSql(REF,
        `insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${f.replace(/'/g, "''")}')
         on conflict (version) do nothing`, `record ${f}`);
      ok(`migration ${f}`, true);
    } catch (e) {
      ok(`migration ${f}`, false, String(e.message).slice(0, 300));
      fatal('migration failed — stopping before anything else runs');
    }
  }
}
await applyMigrations();

// ------------------------------------------------------------ edge function

async function deployFunction() {
  const source = fs.readFileSync(FN_ENTRY, 'utf8');
  const form = new FormData();
  form.append('metadata', JSON.stringify({ name: 'sync-entitlement', entrypoint_path: 'index.ts', verify_jwt: false }));
  form.append('file', new Blob([source], { type: 'application/typescript' }), 'index.ts');
  let r = await api('POST', `/v1/projects/${REF}/functions/deploy?slug=sync-entitlement`, form, { form: true });
  if (r.status === 404 || r.status === 405) {
    // Older management API: create/update with inline body.
    const body = { slug: 'sync-entitlement', name: 'sync-entitlement', verify_jwt: false, body: source };
    r = await api('POST', `/v1/projects/${REF}/functions`, body);
    if (r.status === 409) r = await api('PATCH', `/v1/projects/${REF}/functions/sync-entitlement`, body);
  }
  ok('edge function sync-entitlement deployed', r.status >= 200 && r.status < 300,
    r.status >= 300 ? `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}` : '');
  return r.status >= 200 && r.status < 300;
}
const fnDeployed = await deployFunction();

const secrets = await api('GET', `/v1/projects/${REF}/secrets`);
const hasHook = Array.isArray(secrets.data) && secrets.data.some((s) => s.name === 'ENTITLEMENT_WEBHOOK_SECRET');
if (!hasHook) {
  const r = await api('POST', `/v1/projects/${REF}/secrets`, [
    { name: 'ENTITLEMENT_WEBHOOK_SECRET', value: crypto.randomBytes(24).toString('hex') },
  ]);
  ok('ENTITLEMENT_WEBHOOK_SECRET created', r.status >= 200 && r.status < 300);
} else {
  ok('ENTITLEMENT_WEBHOOK_SECRET already set', true);
}

// --------------------------------------------------------------- API keys

const keysRes = await api('GET', `/v1/projects/${REF}/api-keys?reveal=true`);
if (keysRes.status !== 200) fatal(`cannot read api keys: HTTP ${keysRes.status}`);
const keys = keysRes.data;
const anonKey = (keys.find((k) => k.name === 'anon') ?? keys.find((k) => k.type === 'publishable')
  ?? keys.find((k) => String(k.api_key).startsWith('sb_publishable_')))?.api_key;
const serviceKey = (keys.find((k) => k.name === 'service_role') ?? keys.find((k) => k.type === 'secret')
  ?? keys.find((k) => String(k.api_key).startsWith('sb_secret_')))?.api_key;
if (!anonKey || !serviceKey) fatal('could not identify anon/publishable and service keys');
const URL_BASE = `https://${REF}.supabase.co`;
console.log('');
console.log('== Public client config (safe to publish — it ships inside the web app) ==');
console.log(`EXPO_PUBLIC_SUPABASE_URL=${URL_BASE}`);
console.log(`EXPO_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`);
console.log('');

// ------------------------------------------------------------- auth config

{
  const r = await api('PATCH', `/v1/projects/${REF}/config/auth`, {
    site_url: PAGES_URL,
    uri_allow_list: `${PAGES_URL},${PAGES_URL}/**`,
  });
  ok('auth site_url points at the web app', r.status >= 200 && r.status < 300, r.status >= 300 ? `HTTP ${r.status}` : '');
}

// ------------------------------------------------------------ verification

const gw = async (method, p, jwt, body, extraHeaders = {}) => {
  const headers = { apikey: anonKey, ...extraHeaders };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (body !== undefined && !(body instanceof Blob)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${URL_BASE}${p}`, {
    method, headers, body: body === undefined ? undefined : body instanceof Blob ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};
const admin = (method, p, body) => fetch(`${URL_BASE}${p}`, {
  method,
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
}).then(async (res) => ({ status: res.status, data: await res.json().catch(() => null) }));

// Seed counts
const expectInst = JSON.parse(fs.readFileSync(new URL('../src/data/institutions.json', import.meta.url), 'utf8')).length;
const expectCourses = JSON.parse(fs.readFileSync(new URL('../src/data/courses.json', import.meta.url), 'utf8')).length;
const counts = await runSql(REF, `select
  (select count(*) from public.institutions) inst,
  (select count(*) from public.courses) courses,
  (select count(*) from public.entry_requirements) reqs,
  (select count(*) from public.messages) msgs,
  (select count(*) from public.badges) badges`, 'counts');
const c = counts[0] ?? {};
ok('live DB: all institutions present', Number(c.inst) === expectInst, `${c.inst}/${expectInst}`);
ok('live DB: all courses present', Number(c.courses) === expectCourses, `${c.courses}/${expectCourses}`);
ok('live DB: entry requirements exploded', Number(c.reqs) > expectCourses, String(c.reqs));
ok('live DB: demo chatter + badges seeded', Number(c.msgs) > 0 && Number(c.badges) === 6, `msgs=${c.msgs} badges=${c.badges}`);

// Two throwaway students via the REAL signup path (admin API → trigger).
const rand = crypto.randomBytes(5).toString('hex');
const userA = { email: `rls-a-${rand}@example.com`, password: crypto.randomBytes(12).toString('hex') };
const userB = { email: `rls-b-${rand}@example.com`, password: crypto.randomBytes(12).toString('hex') };
const mkUser = async (u, name) => {
  const r = await admin('POST', '/auth/v1/admin/users', {
    email: u.email, password: u.password, email_confirm: true, user_metadata: { name },
  });
  if (r.status >= 300) fatal(`cannot create test user: HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  return r.data.id;
};
const A = await mkUser(userA, 'RLS Test A');
const B = await mkUser(userB, 'RLS Test B');
const profs = await runSql(REF, `select count(*) c from public.profiles where id in ('${A}','${B}')`, 'profiles');
ok('trigger: profiles auto-created on signup', Number(profs[0]?.c) === 2);

const signIn = async (u) => {
  const r = await gw('POST', '/auth/v1/token?grant_type=password', null, { email: u.email, password: u.password });
  if (r.status !== 200) fatal(`sign-in failed: HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  return r.data.access_token;
};
const jwtA = await signIn(userA);
const jwtB = await signIn(userB);
ok('auth: password sign-in works for both students', Boolean(jwtA && jwtB));

// RLS matrix through the real REST gateway
let r = await gw('POST', '/rest/v1/documents', jwtA,
  { student_id: A, doc_type: 'passport', storage_path: `${A}/rls-test.pdf` }, { Prefer: 'return=representation' });
ok('RLS: A uploads own document row', r.status === 201, `HTTP ${r.status}`);
r = await gw('GET', '/rest/v1/documents?select=*', jwtB);
ok("RLS: B sees zero of A's documents", r.status === 200 && r.data.length === 0, `got ${r.data?.length}`);
r = await gw('POST', '/rest/v1/documents', jwtB, { student_id: A, doc_type: 'passport', storage_path: `${A}/forged.pdf` });
ok('RLS: B cannot create a document as A', r.status >= 400, `HTTP ${r.status}`);
r = await gw('GET', '/rest/v1/profiles?select=id,name', jwtB);
ok('RLS: B sees only their own profile', r.status === 200 && r.data.length === 1 && r.data[0].id === B);

// Entitlements: only the edge function can grant; clients cannot.
if (fnDeployed) {
  r = await gw('POST', '/functions/v1/sync-entitlement', jwtA, { plan: 'season_pass', pass_term: 'lifetime' });
  ok('fn: A gets Season Pass via sync-entitlement', r.status === 200, `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  r = await gw('POST', '/functions/v1/sync-entitlement', jwtB, { student_id: A, plan: 'vip' });
  ok("fn: B cannot set A's entitlement", r.status === 403, `HTTP ${r.status}`);
  r = await gw('GET', '/rest/v1/entitlements?select=plan,pass_term', jwtA);
  ok('RLS: A reads own entitlement (season_pass/lifetime)',
    r.status === 200 && r.data[0]?.plan === 'season_pass' && r.data[0]?.pass_term === 'lifetime');
  await gw('PATCH', '/rest/v1/entitlements?plan=eq.season_pass', jwtA, { plan: 'vip' }, { Prefer: 'return=representation' });
  r = await gw('GET', '/rest/v1/entitlements?select=plan', jwtA);
  ok('RLS: A cannot self-upgrade to VIP (plan unchanged after PATCH attempt)',
    r.status === 200 && r.data[0]?.plan === 'season_pass', `plan=${r.data?.[0]?.plan}`);
}

// Coins: positive earns only; spends only via the atomic function.
r = await gw('POST', '/rest/v1/coin_ledger', jwtA, { student_id: A, delta: 120, reason: 'rule_survey' });
ok('RLS: A earns own positive coins', r.status === 201, `HTTP ${r.status}`);
r = await gw('POST', '/rest/v1/coin_ledger', jwtA, { student_id: A, delta: -50, reason: 'hack' });
ok('RLS: negative direct insert blocked', r.status >= 400, `HTTP ${r.status}`);
r = await gw('POST', '/rest/v1/rpc/redeem_reward', jwtA, { item: 'event-ticket', cost: 50 });
ok('fn: redeem_reward spends atomically', r.status === 200, `HTTP ${r.status}`);
r = await gw('POST', '/rest/v1/rpc/redeem_reward', jwtA, { item: 'event-ticket', cost: 99999 });
ok('fn: redeem_reward blocks overdraft', r.status >= 400 && /insufficient/i.test(JSON.stringify(r.data)), `HTTP ${r.status}`);

// Group chat: membership-gated reads, no forged sends.
const grpRows = await runSql(REF, 'select id from public.intake_groups limit 1', 'pick group');
const GRP = grpRows[0]?.id;
r = await gw('POST', '/rest/v1/intake_group_members', jwtA, { group_id: GRP, student_id: A });
ok('RLS: A joins an intake group', r.status === 201, `HTTP ${r.status}`);
r = await gw('POST', '/rest/v1/messages', jwtA, { group_id: GRP, sender_id: A, sender_name: 'RLS Test A', body: 'hello from A' });
ok('RLS: member A sends a group message', r.status === 201, `HTTP ${r.status}`);
r = await gw('GET', `/rest/v1/messages?group_id=eq.${GRP}&select=id`, jwtB);
ok('RLS: non-member B reads zero group messages', r.status === 200 && r.data.length === 0, `got ${r.data?.length}`);
r = await gw('POST', '/rest/v1/messages', jwtB, { group_id: GRP, sender_id: A, sender_name: 'RLS Test A', body: 'forged' });
ok('RLS: B cannot forge a message as A', r.status >= 400, `HTTP ${r.status}`);
r = await gw('POST', '/rest/v1/intake_group_members', jwtB, { group_id: GRP, student_id: B });
const bJoined = r.status === 201;
r = await gw('GET', `/rest/v1/messages?group_id=eq.${GRP}&select=body`, jwtB);
ok('RLS: after joining, B reads the group history', bJoined && r.status === 200 && r.data.length > 0, `got ${r.data?.length}`);

// Storage: private bucket, per-student folders.
r = await gw('POST', `/storage/v1/object/documents/${A}/rls-test.txt`, jwtA,
  new Blob(['owned by A'], { type: 'text/plain' }));
ok('storage: A uploads into own folder', r.status === 200, `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
r = await gw('GET', `/storage/v1/object/documents/${A}/rls-test.txt`, jwtB);
ok("storage: B cannot read A's file", r.status >= 400, `HTTP ${r.status}`);
r = await gw('POST', `/storage/v1/object/documents/${A}/intruder.txt`, jwtB, new Blob(['intruder'], { type: 'text/plain' }));
ok("storage: B cannot write into A's folder", r.status >= 400, `HTTP ${r.status}`);
r = await gw('GET', `/storage/v1/object/documents/${A}/rls-test.txt`, jwtA);
ok('storage: A reads own file back', r.status === 200 && String(r.data).includes('owned by A'), `HTTP ${r.status}`);

// Realtime: B subscribes to the group channel, A inserts, B must hear it.
try {
  const { createClient } = await import('@supabase/supabase-js');
  const clientB = createClient(URL_BASE, anonKey, { auth: { persistSession: false } });
  await clientB.auth.signInWithPassword({ email: userB.email, password: userB.password });
  const got = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 15000);
    clientB.channel(`grp-${GRP}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${GRP}` }, (payload) => {
        clearTimeout(timer);
        resolve(payload.new?.body ?? null);
      })
      .subscribe();
  });
  await sleep(2500); // give the subscription time to be live
  await gw('POST', '/rest/v1/messages', jwtA, { group_id: GRP, sender_id: A, sender_name: 'RLS Test A', body: 'realtime ping' });
  const heard = await got;
  ok('realtime: B receives A\'s message live', heard === 'realtime ping', heard === null ? 'timeout (no event in 15s)' : String(heard));
  await clientB.auth.signOut();
  clientB.realtime.disconnect();
} catch (e) {
  ok('realtime: B receives A\'s message live', false, `skipped/failed: ${String(e.message).slice(0, 160)}`);
}

// ------------------------------------------------------------------ cleanup

await gw('DELETE', `/storage/v1/object/documents/${A}/rls-test.txt`, jwtA).catch(() => undefined);
// Test chat lines have no FK to profiles — remove them so the live group
// keeps only its real content.
await runSql(REF, `delete from public.messages where sender_id in ('${A}','${B}')`, 'cleanup messages');
for (const id of [A, B]) {
  const del = await admin('DELETE', `/auth/v1/admin/users/${id}`);
  if (del.status >= 300) console.log(`note: could not delete test user ${id}: HTTP ${del.status}`);
}
const gone = await runSql(REF, `select count(*) c from public.profiles where id in ('${A}','${B}')`, 'cleanup check');
ok('cleanup: test students fully removed (cascade)', Number(gone[0]?.c) === 0);

// ------------------------------------------------------------------ summary

const fails = results.filter((x) => x.startsWith('FAIL'));
console.log(`\n${results.length - fails.length}/${results.length} live checks passed`);
if (fails.length) {
  console.log('Failed checks:');
  for (const f of fails) console.log(`  ${f}`);
}
process.exit(fails.length ? 1 : 0);
