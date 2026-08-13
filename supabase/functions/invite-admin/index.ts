// invite-admin — lets the MASTER account create staff accounts from the
// back office. The browser never holds admin keys: this function verifies
// the caller's JWT belongs to an OWNER in admin_users, then uses the
// service role to send the invitation email and grant the roster row.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const ADMIN_PAGE = 'https://cheeyuenhow1988.github.io/Unibridge-App/admin/';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  let body: { email?: string; role?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid JSON body' }); }
  const email = (body.email ?? '').trim().toLowerCase();
  const role = body.role === 'owner' ? 'owner' : 'staff';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: 'valid email required' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Caller must be a signed-in OWNER.
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json(401, { error: 'missing authorization' });
  const { data: caller, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !caller.user) return json(401, { error: 'invalid token' });
  const { data: ownerRow } = await admin.from('admin_users')
    .select('role').eq('user_id', caller.user.id).eq('role', 'owner').maybeSingle();
  if (!ownerRow) return json(403, { error: 'only the master account can invite admins' });

  // Existing account → just grant; new account → invitation email.
  let userId: string | null = null;
  let invited = false;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = (list?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email);
  if (existing) {
    userId = existing.id;
  } else {
    const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: ADMIN_PAGE });
    if (invErr || !inv.user) return json(500, { error: `could not invite: ${invErr?.message ?? 'unknown'}` });
    userId = inv.user.id;
    invited = true;
  }

  const { error: grantErr } = await admin.from('admin_users').upsert(
    { user_id: userId, role, email }, { onConflict: 'user_id' });
  if (grantErr) return json(500, { error: grantErr.message });

  return json(200, { ok: true, invited, role });
});
