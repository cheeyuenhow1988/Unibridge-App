// Real student sign-up trial of the LIVE app against the live backend (runs
// in GitHub Actions after the /live web build, when qa_screens is on).
//
// No email is ever sent: the admin API's generate_link mints the exact
// confirmation / reset links an email would carry, and the two calls that
// WOULD send mail from the UI (sign-up, forgot-password) are intercepted —
// their payloads are asserted, then answered locally. Everything else (sign
// in, profile pull/push, confirmation, password reset, sign out) hits the
// real project. Throwaway users are app-qa-<hex>-<role>@example.com and are
// deleted at the end (and by the next deploy if this run crashes).
//
// Exit code 1 on any failed assertion — screenshots are written regardless.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.log('SUPABASE_ACCESS_TOKEN not set — skipping.'); process.exit(0); }
const API = 'https://api.supabase.com';
const DIST = path.resolve(process.env.APP_DIST ?? 'dist');
const SHOTS = 'app-qa-screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

const env = Object.fromEntries(
  (fs.existsSync('live-config.env') ? fs.readFileSync('live-config.env', 'utf8') : '')
    .trim().split('\n').filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
const SITE = (env.EXPO_PUBLIC_SITE_URL ?? 'https://cheeyuenhow1988.github.io/Unibridge-App/live').replace(/\/+$/, '');
const PREFIX = new URL(SITE).pathname.replace(/\/+$/, '');
const PORT = 8331;
const LOCAL = `http://127.0.0.1:${PORT}${PREFIX}`;

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

// ---- throwaway users -------------------------------------------------------
const QA_RE = /^app-qa-[0-9a-f]{8}-\w+@example\.com$/;
const listUsers = async () => (await gotrue('GET', '/auth/v1/admin/users?page=1&per_page=200')).data?.users ?? [];
const sweep = async () => {
  for (const u of await listUsers()) if (QA_RE.test(u.email ?? '')) await gotrue('DELETE', `/auth/v1/admin/users/${u.id}`);
};
await sweep();

const rand = crypto.randomBytes(4).toString('hex');
const mail = (role) => `app-qa-${rand}-${role}@example.com`;
const pw = () => `Qa-${crypto.randomBytes(9).toString('hex')}`;
const mkUser = async (role, name, confirmed = true) => {
  const email = mail(role);
  const password = pw();
  const r = await gotrue('POST', '/auth/v1/admin/users', { email, password, email_confirm: confirmed, user_metadata: { name } });
  if (r.status >= 300) { console.error('cannot create', role, r.status, JSON.stringify(r.data).slice(0, 200)); process.exit(1); }
  return { id: r.data.id, email, password, name };
};
/** The link an email would carry — minted by the admin API, never mailed. */
const linkFor = async (body) => {
  const r = await gotrue('POST', '/auth/v1/admin/generate_link', body);
  return { status: r.status, link: r.data?.action_link ?? r.data?.properties?.action_link, data: r.data };
};
/** Open the link the way a mail client would and read where it sends you. */
const follow = async (link) => {
  const res = await fetch(link, { redirect: 'manual' });
  return res.headers.get('location') ?? '';
};
const toLocal = (location) => (location.startsWith(SITE) ? LOCAL + location.slice(SITE.length) : location);

const returning = await mkUser('returning', 'QA Returning');
await runSql(REF, `update public.profiles set name = 'QA Returning', home_country = 'MY', nationality = 'MY',
    qualification_system = 'spm', intake_year = 2027 where id = '${returning.id}';
  insert into public.grades (student_id, subject, grade_value, qualification_system) values
    ('${returning.id}', 'Mathematics', 'A', 'spm'), ('${returning.id}', 'English', 'A-', 'spm'), ('${returning.id}', 'Physics', 'B+', 'spm');
  insert into public.english_scores (student_id, test_type, score) values ('${returning.id}', 'ielts', 6.5)
    on conflict (student_id) do update set test_type = excluded.test_type, score = excluded.score;`);
const unconfirmed = await mkUser('pending', 'QA Pending', false);
const pusher = await mkUser('pusher', 'QA Pusher');

// ---- static server (GitHub Pages semantics) ---------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!p.startsWith(PREFIX)) { res.writeHead(404); res.end(); return; }
  p = p.slice(PREFIX.length) || '/';
  for (const c of [p, `${p}.html`, path.join(p, 'index.html')]) {
    const f = path.join(DIST, c);
    if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] ?? 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
      return;
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/html' });
  fs.createReadStream(path.join(DIST, '+not-found.html')).pipe(res);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

// Installed by the workflow step right before this script runs.
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fresh browser profile. Only the app and the project are reachable;
 * `intercept` answers the mail-sending endpoints locally. */
async function newPage({ initProfile, intercept } = {}) {
  const context = await browser.newContext({ viewport: { width: 430, height: 900 } });
  if (initProfile) {
    await context.addInitScript((v) => { window.localStorage.setItem('ub-profile', v); }, JSON.stringify({ state: initProfile, version: 0 }));
  }
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (intercept) {
      const handled = await intercept(route, new URL(url));
      if (handled) return undefined;
    }
    if (url.startsWith(URL_BASE) || url.startsWith(`http://127.0.0.1:${PORT}`)) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  return { context, page };
}
const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const waitText = async (page, re, secs = 15) => {
  for (let i = 0; i < secs * 4; i++) { if (re.test(await text(page))) return true; await sleep(250); }
  return false;
};
const waitUrl = async (page, re, secs = 15) => {
  for (let i = 0; i < secs * 4; i++) { if (re.test(page.url())) return true; await sleep(250); }
  return false;
};
const tid = (page, id) => page.locator(`[data-testid="${id}"]`).first();
const fill = (page, id, v) => tid(page, id).fill(v);
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name) });
const signInForm = async (page, email, password) => {
  await page.goto(`${LOCAL}/onboarding/auth?mode=signin`);
  await waitText(page, /Welcome back/);
  await fill(page, 'auth-email', email);
  await fill(page, 'auth-password', password);
  await tid(page, 'auth-submit').click();
};

try {
  // 1. Sign-up form → the real request is built right, the email is not sent.
  {
    let captured = null;
    const { context, page } = await newPage({
      intercept: async (route, u) => {
        if (u.href.startsWith(`${URL_BASE}/auth/v1/signup`)) {
          captured = { search: u.search, body: route.request().postDataJSON() };
          await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ id: crypto.randomUUID(), aud: 'authenticated', email: captured.body.email, confirmation_sent_at: new Date().toISOString(), identities: [{ id: 'x', provider: 'email' }] }),
          });
          return true;
        }
        return false;
      },
    });
    await page.goto(`${LOCAL}/onboarding/welcome`);
    ok('welcome: live app offers "I already have an account"', await waitText(page, /I already have an account/));
    await page.goto(`${LOCAL}/onboarding/auth`);
    await waitText(page, /Create your account/);
    await fill(page, 'auth-name', 'QA Signup');
    await fill(page, 'auth-email', mail('signup'));
    await fill(page, 'auth-password', 'longpassword1');
    await shot(page, '01-create-account.png');
    await tid(page, 'auth-submit').click();
    ok('sign-up: "Check your email" screen', await waitText(page, /Check your email/));
    await shot(page, '02-check-your-email.png');
    const redirect = captured ? new URLSearchParams(captured.search).get('redirect_to') : null;
    ok('sign-up: confirmation link will return to the live app', redirect === `${SITE}/auth/callback`, String(redirect));
    ok('sign-up: name travels with the account', captured?.body?.data?.name === 'QA Signup');
    await context.close();
  }

  // 2. Real confirmation link for a brand-new account.
  {
    const fresh = { email: mail('fresh'), password: pw() };
    const gen = await linkFor({ type: 'signup', email: fresh.email, password: fresh.password, data: { name: 'QA Fresh' }, redirect_to: `${SITE}/auth/callback` });
    ok('confirm: admin minted the signup link (no email sent)', Boolean(gen.link), gen.link ? '' : `HTTP ${gen.status} ${JSON.stringify(gen.data).slice(0, 160)}`);
    const location = gen.link ? await follow(gen.link) : '';
    ok('confirm: server sends the student back to the live app (redirect allow-list)', location.startsWith(`${SITE}/auth/callback#`), location.replace(/#.*/, '#…'));
    const { context, page } = await newPage();
    await page.goto(toLocal(location));
    ok('confirm: "Email confirmed" in the app', await waitText(page, /Email confirmed/));
    await shot(page, '03-email-confirmed.png');
    ok('confirm: tokens scrubbed from the address bar', !/access_token/.test(page.url()));
    await tid(page, 'callback-continue').click();
    ok('confirm: new student continues to onboarding', await waitUrl(page, /\/onboarding\/profile/));
    const row = await runSql(REF, `select email_confirmed_at is not null as confirmed from auth.users where email = '${fresh.email}'`);
    ok('confirm: account marked confirmed on the server (funnel moves)', row[0]?.confirmed === true);
    // The same link again = what a student sees when a link is reused.
    const again = await follow(gen.link);
    await page.goto(toLocal(again));
    ok('confirm: a used link explains itself and offers a fresh one', await waitText(page, /This link has expired/), again.replace(/#.*/, '#…'));
    await shot(page, '04-link-expired.png');
    await context.close();
  }

  // 3. Returning student signs in on a new device → profile comes back.
  {
    const { context, page } = await newPage();
    await signInForm(page, returning.email, 'definitely-wrong-1');
    ok('sign-in: wrong password → friendly error', await waitText(page, /Email or password is incorrect/));
    await shot(page, '05-wrong-password.png');
    await fill(page, 'auth-password', returning.password);
    await tid(page, 'auth-submit').click();
    ok('sign-in: lands in the app, onboarding skipped', await waitUrl(page, /\/match$/), page.url());
    const prof = JSON.parse((await page.evaluate(() => localStorage.getItem('ub-profile'))) ?? '{}')?.state;
    ok('sign-in: profile restored from the server', prof?.onboarded === true && prof?.profile?.qualification === 'spm'
      && prof?.profile?.grades?.subjects?.length === 3 && prof?.profile?.english?.score === 6.5);
    await sleep(2000);
    await shot(page, '06-signed-in.png');
    await page.goto(`${LOCAL}/profile`);
    ok('account: Profile tab shows the real account, signed in', await waitText(page, new RegExp(returning.email.replace(/[.+]/g, '\\$&'))) && /Signed in/.test(await text(page)));
    await tid(page, 'account-email').scrollIntoViewIfNeeded();
    await shot(page, '07-profile-account.png');
    await tid(page, 'account-signout').click();
    ok('sign-out: back to Welcome', await waitUrl(page, /\/onboarding\/welcome/, 20), page.url());
    await sleep(800);
    const left = await page.evaluate(() => ({ keys: Object.keys(localStorage), profile: localStorage.getItem('ub-profile') }));
    const lp = JSON.parse(left.profile ?? '{}')?.state;
    ok('sign-out: device wiped (no profile, no session)', (!lp || lp.profile === null) && !left.keys.some((k) => k.startsWith('sb-')), JSON.stringify(left.keys));
    await context.close();
  }

  // 4. Unconfirmed account.
  {
    const { context, page } = await newPage();
    await signInForm(page, unconfirmed.email, unconfirmed.password);
    ok('unconfirmed: told to confirm first, resend offered', await waitText(page, /confirm your email first/) && (await tid(page, 'auth-resend').count()) === 1);
    await shot(page, '08-not-confirmed.png');
    await context.close();
  }

  // 5. Forgot password → request is right, email not sent.
  {
    let captured = null;
    const { context, page } = await newPage({
      intercept: async (route, u) => {
        if (u.href.startsWith(`${URL_BASE}/auth/v1/recover`)) {
          captured = { search: u.search };
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
          return true;
        }
        return false;
      },
    });
    await page.goto(`${LOCAL}/onboarding/auth?mode=forgot`);
    await waitText(page, /Reset your password/);
    await fill(page, 'auth-email', returning.email);
    await tid(page, 'auth-forgot-submit').click();
    ok('forgot: "reset link is on its way"', await waitText(page, /reset link is on its way/));
    const redirect = captured ? new URLSearchParams(captured.search).get('redirect_to') : null;
    ok('forgot: reset link will return to the live app', redirect === `${SITE}/auth/reset`, String(redirect));
    await shot(page, '09-reset-requested.png');
    await context.close();
  }

  // 6. Real reset link → new password works.
  {
    const gen = await linkFor({ type: 'recovery', email: returning.email, redirect_to: `${SITE}/auth/reset` });
    const location = gen.link ? await follow(gen.link) : '';
    ok('reset: server sends the student to the live reset page', location.startsWith(`${SITE}/auth/reset#`), location.replace(/#.*/, '#…'));
    const { context, page } = await newPage();
    await page.goto(toLocal(location));
    ok('reset: "Choose a new password"', await waitText(page, /Choose a new password/));
    const newPw = pw();
    await fill(page, 'reset-password', newPw);
    await fill(page, 'reset-repeat', newPw);
    await shot(page, '10-new-password.png');
    await tid(page, 'reset-submit').click();
    ok('reset: saved, student lands in the app', await waitUrl(page, /\/match$/), page.url());
    const check = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: returning.email, password: newPw }),
    });
    ok('reset: the new password signs in on the server', check.status === 200, `HTTP ${check.status}`);
    await context.close();
  }

  // 7. Onboarded on this device, then signs in → profile saved to the server.
  {
    const local = {
      profile: { name: 'QA Pusher', homeCountry: 'ID', nationality: 'ID', qualification: 'sma', intakeYear: 2027, grades: { total: 88 }, english: { test: 'ielts', score: 6 } },
      onboarded: true, themePref: 'system', language: 'en', avatarUri: null, travelBuddyOptIn: false, mateVisible: true, mateShowCourse: true, mateLookingFor: [],
    };
    const { context, page } = await newPage({ initProfile: local });
    await signInForm(page, pusher.email, pusher.password);
    ok('push: straight into the app', await waitUrl(page, /\/match$/), page.url());
    let row = null;
    for (let i = 0; i < 20 && !row?.qualification_system; i++) {
      await sleep(500);
      row = (await runSql(REF, `select p.home_country, p.nationality, p.qualification_system, p.intake_year,
          (select grade_value from public.grades g where g.student_id = p.id and g.subject = '__total__') as total,
          (select test_type || ':' || score from public.english_scores e where e.student_id = p.id) as english
        from public.profiles p where p.id = '${pusher.id}'`))[0];
    }
    ok('push: server profile now matches the device (back office sees it)',
      row?.home_country === 'ID' && row?.qualification_system === 'sma' && Number(row?.intake_year) === 2027
      && row?.total === '88' && /^ielts:6(\.0)?$/.test(String(row?.english)), JSON.stringify(row));
    await context.close();
  }
} catch (e) {
  ok('trial ran to completion', false, String(e?.stack ?? e).slice(0, 300));
} finally {
  await browser.close();
  server.close();
  await sweep();
  const left = (await listUsers()).filter((u) => QA_RE.test(u.email ?? '')).length;
  ok('cleanup: throwaway accounts removed', left === 0, `${left} left`);
}

const fails = results.filter((r) => r.startsWith('FAIL'));
console.log(`\n${results.length - fails.length}/${results.length} sign-up trial checks passed`);
process.exit(fails.length ? 1 : 0);
