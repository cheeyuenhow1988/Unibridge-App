// Full back-office trial in a real browser (runs in GitHub Actions where
// Playwright + open egress are available; triggered by the qa_screens input
// of the supabase-deploy workflow).
//
// What it does:
//   1. Creates a throwaway ADMIN and a throwaway NORMAL user on the live
//      project (management API token from the workflow secret)
//   2. Direct REST pre-checks with the admin's JWT (hard evidence of what
//      the server returns, independent of the page)
//   3. Serves admin/ locally with a generated config.js, signs in with the
//      throwaway admin, clicks through ALL tabs — Overview, Students,
//      Applications, Rewards, Chats, Catalog — asserts each renders its
//      data (or honest empty state, never a silent failure), performs a
//      mock action (grants the test user VIP from the Students tab), and
//      screenshots every step into qa-screenshots/
//   4. Signs in as the NORMAL user and asserts the "No access" wall
//   5. Deletes both throwaway users (and any leftovers of crashed runs)
//
// Exit code 1 on any failed assertion — screenshots are written regardless.
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.log('SUPABASE_ACCESS_TOKEN not set — skipping.'); process.exit(0); }
const API = 'https://api.supabase.com';
const ADMIN_DIR = new URL('../admin/', import.meta.url).pathname;
const SHOTS = 'qa-screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const ok = (name, pass, extra = '') => {
  results.push([pass ? 'PASS' : 'FAIL', name, extra].filter(Boolean).join(' | '));
  console.log(results[results.length - 1]);
};

const mgmt = async (method, p, body) => {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};
const runSql = async (ref, query) => {
  const r = await mgmt('POST', `/v1/projects/${ref}/database/query`, { query });
  if (r.status >= 300) throw new Error(`sql: HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  return Array.isArray(r.data) ? r.data : r.data?.result ?? r.data?.rows ?? [];
};

// ---- project + keys --------------------------------------------------------
const projects = await mgmt('GET', '/v1/projects');
const wanted = process.env.SUPABASE_PROJECT_REF;
const project = wanted ? projects.data.find((p) => p.id === wanted)
  : projects.data.length === 1 ? projects.data[0]
  : projects.data.find((p) => /unibridge/i.test(p.name)) ?? projects.data[0];
if (!project) { console.error('no project'); process.exit(1); }
const REF = project.id;
const URL_BASE = `https://${REF}.supabase.co`;
const keys = (await mgmt('GET', `/v1/projects/${REF}/api-keys?reveal=true`)).data;
const anonKey = (keys.find((k) => k.name === 'anon') ?? keys.find((k) => k.type === 'publishable'))?.api_key;
const serviceKey = (keys.find((k) => k.name === 'service_role') ?? keys.find((k) => k.type === 'secret'))?.api_key;

const gotrue = (method, p, body, jwtOrKey = serviceKey) => fetch(`${URL_BASE}${p}`, {
  method,
  headers: { apikey: anonKey, Authorization: `Bearer ${jwtOrKey}`, 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
}).then(async (res) => ({ status: res.status, data: await res.json().catch(() => null) }));

// ---- throwaway users (sweep leftovers first) -------------------------------
const QA_RE = /^qa-(admin|user)-[0-9a-f]{8}@example\.com$/;
const listUsers = async () => (await gotrue('GET', '/auth/v1/admin/users?page=1&per_page=200')).data?.users ?? [];
for (const u of await listUsers()) {
  if (QA_RE.test(u.email ?? '')) await gotrue('DELETE', `/auth/v1/admin/users/${u.id}`);
}
// Leftover temp institutions from crashed runs.
await runSql(REF, `delete from public.institutions where id like 'my-qa-trial-%'`).catch(() => undefined);
await runSql(REF, `delete from storage.objects where bucket_id = 'institution-media' and name like 'my-qa-trial-%'`).catch(() => undefined);

const rand = crypto.randomBytes(4).toString('hex');
const mk = async (email, name) => {
  const password = crypto.randomBytes(12).toString('hex');
  const r = await gotrue('POST', '/auth/v1/admin/users', { email, password, email_confirm: true, user_metadata: { name } });
  if (r.status >= 300) { console.error('cannot create', email, r.status, JSON.stringify(r.data).slice(0, 200)); process.exit(1); }
  return { id: r.data.id, email, password };
};
const qaAdmin = await mk(`qa-admin-${rand}@example.com`, 'QA Admin');
const qaUser = await mk(`qa-user-${rand}@example.com`, 'QA User');
await runSql(REF, `insert into public.admin_users (user_id, role) values ('${qaAdmin.id}', 'staff') on conflict do nothing`);

// ---- direct REST evidence (independent of the page) ------------------------
const signIn = async (u) => {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.password }),
  });
  return (await res.json()).access_token;
};
const jwtAdmin = await signIn(qaAdmin);
const rest = (p, jwt) => fetch(`${URL_BASE}/rest/v1/${p}`, { headers: { apikey: anonKey, Authorization: `Bearer ${jwt}` } })
  .then(async (res) => ({ status: res.status, data: await res.json().catch(() => null) }));
const preMsgs = await rest('messages?select=id&limit=5', jwtAdmin);
ok('server: admin JWT reads messages', preMsgs.status === 200 && Array.isArray(preMsgs.data) && preMsgs.data.length > 0,
  `HTTP ${preMsgs.status}, ${Array.isArray(preMsgs.data) ? preMsgs.data.length : JSON.stringify(preMsgs.data).slice(0, 120)} rows`);
const preProf = await rest('profiles?select=id&limit=5', jwtAdmin);
ok('server: admin JWT reads profiles', preProf.status === 200, `HTTP ${preProf.status}`);

// ---- serve admin/ locally ---------------------------------------------------
fs.writeFileSync(path.join(ADMIN_DIR, 'config.js'),
  `window.UB_CONFIG = ${JSON.stringify({ url: URL_BASE, anonKey })};`);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const file = path.join(ADMIN_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  try {
    const body = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('nope');
  }
});
await new Promise((r) => server.listen(8321, '127.0.0.1', r));

// ---- browser trial ----------------------------------------------------------
// Installed by the workflow step right before this script runs.
// eslint-disable-next-line import/no-unresolved
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const failures400 = [];
const consoleErrors = [];

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('response', (r) => {
    if (r.url().includes('supabase.co') && r.status() >= 400) failures400.push(`${r.status()} ${r.url().replace(/\?.*$/, '')}`);
  });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  return page;
}
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const waitFor = async (page, re, tries = 30) => {
  for (let i = 0; i < tries; i++) {
    if (re.test(await bodyText(page))) return true;
    await page.waitForTimeout(500);
  }
  return false;
};

const page = await newPage();
await page.goto('http://127.0.0.1:8321/', { waitUntil: 'domcontentloaded' });
await waitFor(page, /Admin sign-in/);
await page.screenshot({ path: `${SHOTS}/00-signin.png`, fullPage: true });
await page.fill('#email', qaAdmin.email);
await page.fill('#pass', qaAdmin.password);
await page.getByRole('button', { name: 'Sign in', exact: true }).click();
ok('ui: admin signs in and sees the shell', await waitFor(page, /Overview/));

const TABS = [
  ['Overview', /Registered students/, '01-overview.png'],
  ['Students', /QA Admin/, '02-students.png'],
  ['Applications', /No applications yet\.|Stage/, '03-applications.png'],
  ['Rewards', /No redemptions yet\.|Mark fulfilled|fulfilled/, '04-rewards.png'],
  ['Community', /./, '05-community.png'], // asserted separately below
  ['Catalog', /Institutions \(\d+\)/, '06-catalog.png'],
];
for (const [name, marker, shot] of TABS) {
  await page.getByRole('button', { name, exact: true }).click();
  // Wait for the tab's real content marker (up to ~8s) — a fixed sleep made
  // the check flaky on slow loads.
  const target = name === 'Community' ? /Group chats/ : marker;
  const rendered = await waitFor(page, target, 16);
  const text = await bodyText(page);
  const silentFail = /Could not load/.test(text);
  if (name === 'Community') {
    const gRows = await page.locator('#gtb tr').count();
    ok('ui: Community lists group chats with latest-message previews', gRows >= 10 && !silentFail, `${gRows} groups`);
    await page.locator('#gtb tr').first().click();
    await page.waitForTimeout(1500);
    const chatRows = await page.locator('#mtb tr').count();
    ok('ui: opening a group shows its full conversation', chatRows > 0, `${chatRows} messages`);
    await page.screenshot({ path: `${SHOTS}/05c-group-chat.png`, fullPage: false });
    await page.getByRole('button', { name: '← Back' }).click();
    await page.waitForTimeout(1500);
    ok('ui: back arrow returns to the group list', (await page.locator('#gtb tr').count()) >= 10);
    const postImgs = await page.locator('#postsGrid img').count();
    ok('ui: Community shows shared post pictures', postImgs > 0, `${postImgs} post images`);
    const reelImgs = await page.locator('#reelsGrid img').count();
    ok('ui: Community shows short reels with thumbnails', reelImgs > 0, `${reelImgs} reel thumbnails`);
    await page.getByRole('button', { name: /Videos \(/ }).click();
    await page.waitForTimeout(800);
    ok('ui: Videos sub-tab switches to the reels grid', await page.locator('#reelsGrid').isVisible());
    await page.screenshot({ path: `${SHOTS}/05b-community-videos.png`, fullPage: false });
    await page.getByRole('button', { name: /Photos \(/ }).click();
    await page.waitForTimeout(600);
    await page.fill('#pFrom', '2030-01-01');
    await page.locator('#pFrom').dispatchEvent('change');
    await page.waitForTimeout(600);
    ok('ui: posts date filter narrows the grid', /No posts in this date range/.test(await bodyText(page)));
    await page.locator('#pDateClear').click();
    await page.waitForTimeout(600);
    ok('ui: clearing the date filter restores posts', (await page.locator('#postsGrid img').count()) > 0);
  } else {
    ok(`ui: ${name} tab renders`, rendered && !silentFail, silentFail ? 'shows a load error' : rendered ? '' : 'marker never appeared');
  }
  if (name === 'Catalog') {
    const rows = await page.locator('#ctb tr').count();
    ok('ui: Catalog actually renders the institution rows', rows >= 100, `${rows} rows`);
    await page.getByRole('button', { name: /^Filters/ }).click();
    await page.waitForTimeout(800);
    await page.locator('#ftype').selectOption('college');
    await page.waitForTimeout(1200);
    const collegeRows = await page.locator('#ctb tr').count();
    ok('ui: Filters panel narrows the catalog (type=college)',
      collegeRows > 0 && collegeRows < rows && /of \d+/.test(await bodyText(page)), `${collegeRows} of ${rows} rows`);
    await page.screenshot({ path: `${SHOTS}/06b-catalog-filtered.png`, fullPage: false });
    await page.locator('#fclear').click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: `${SHOTS}/${shot}`, fullPage: false });
}

// Mock action: grant the QA USER a VIP plan from the Students tab.
await page.getByRole('button', { name: 'Students', exact: true }).click();
await page.waitForTimeout(1500);
const userRow = page.locator('tr', { hasText: 'QA User' });
if (await userRow.count()) {
  await userRow.locator('select').selectOption('vip');
  await page.waitForTimeout(1800);
  const vipShown = await page.locator('tr', { hasText: 'QA User' }).locator('.pill', { hasText: 'vip' }).count();
  ok('ui: granting VIP from Students tab works', vipShown > 0);
  await page.screenshot({ path: `${SHOTS}/07-vip-granted.png`, fullPage: false });
} else {
  ok('ui: granting VIP from Students tab works', false, 'QA User row not found');
}
// Catalog manager cycle: Add a TEMP institution → upload a photo → delete it.
// Never touches the real catalog rows.
page.on('dialog', (d) => d.accept());
await page.getByRole('button', { name: 'Catalog', exact: true }).click();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: '+ Add institution' }).click();
await page.fill('#f_name', `QA Trial ${rand} University`);
await page.fill('#f_city', 'Kuala Lumpur');
await page.fill('#f_tag', 'Temporary trial entry — auto-deleted');
await page.getByRole('button', { name: 'Create' }).click();
await page.waitForTimeout(1800);
ok('ui: Create lands in the edit screen with photo sections', await waitFor(page, /MAIN PHOTO/i, 10));

// 1x1 PNG — enough to exercise upload, policies and the public URL round-trip.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
await page.setInputFiles('#pfile', { name: 'qa-campus.png', mimeType: 'image/png', buffer: PNG });
await page.getByRole('button', { name: 'Add photo' }).click();
await page.waitForTimeout(2500);
const heroShown = await page.locator('#heroBox img').count();
ok('ui: uploaded photo becomes the MAIN photo', heroShown >= 1, `${heroShown} in hero box`);
await page.screenshot({ path: `${SHOTS}/08-edit-with-photos.png`, fullPage: false });

await page.getByRole('button', { name: 'Back to catalog' }).click();
await page.waitForTimeout(1200);
await page.fill('#cq', `QA Trial ${rand}`);
await page.locator('#cq').press('Enter');
await page.waitForTimeout(1200);
const tmpRow = page.locator('#ctb tr', { hasText: `QA Trial ${rand}` });
ok('ui: Add institution creates a catalog row', (await tmpRow.count()) === 1);
await page.screenshot({ path: `${SHOTS}/09-catalog-added.png`, fullPage: false });
await tmpRow.getByRole('button', { name: 'Delete' }).click();
await page.waitForTimeout(1800);
const stillThere = await page.locator('#ctb tr', { hasText: `QA Trial ${rand}` }).count();
ok('ui: Delete removes the institution', stillThere === 0);
await page.close();

// Non-admin wall.
const page2 = await newPage();
await page2.goto('http://127.0.0.1:8321/', { waitUntil: 'domcontentloaded' });
await waitFor(page2, /Admin sign-in/);
await page2.fill('#email', qaUser.email);
await page2.fill('#pass', qaUser.password);
await page2.getByRole('button', { name: 'Sign in', exact: true }).click();
ok('ui: non-admin hits the "No access" wall', await waitFor(page2, /No access/));
await page2.screenshot({ path: `${SHOTS}/10-non-admin-wall.png`, fullPage: true });
await page2.close();

await browser.close();
server.close();

// ---- cleanup ----------------------------------------------------------------
await runSql(REF, `delete from public.institutions where id like 'my-qa-trial-%'`).catch(() => undefined);
await runSql(REF, `delete from storage.objects where bucket_id = 'institution-media' and name like 'my-qa-trial-%'`).catch(() => undefined);
for (const u of [qaAdmin, qaUser]) await gotrue('DELETE', `/auth/v1/admin/users/${u.id}`);
const gone = await runSql(REF, `select count(*) c from auth.users where email ~ '^qa-(admin|user)-'`);
ok('cleanup: throwaway users removed', Number(gone[0]?.c) === 0);

if (failures400.length) console.log('HTTP >=400 from supabase during the trial:\n  ' + [...new Set(failures400)].join('\n  '));
if (consoleErrors.length) console.log('Console errors during the trial:\n  ' + [...new Set(consoleErrors)].slice(0, 10).join('\n  '));

const fails = results.filter((r) => r.startsWith('FAIL'));
console.log(`\n${results.length - fails.length}/${results.length} back-office trial checks passed`);
process.exit(fails.length ? 1 : 0);
