// sync-entitlement — the ONLY path that writes the entitlements table.
// Clients cannot self-upgrade: RLS on entitlements is select-only, so every
// grant/downgrade flows through this service-role function.
//
// Two callers, two auth modes:
//  1. The app (manual dev trigger today: mock purchase / plan toggle) —
//     authenticated by the student's own JWT; the row written is ALWAYS the
//     caller's, whatever student_id the body claims.
//  2. Store servers (future) — Apple/Google server notifications carry no
//     user JWT; they authenticate with the ENTITLEMENT_WEBHOOK_SECRET header
//     and may set any student_id (the receipt tells us whose purchase it is).
//
// TODO: replace the manual trigger with the real Apple App Store /
// Google Play server-notification handlers once the developer accounts are
// live — parse their signed payloads, map product ids to plans
// (ub_season_pass_monthly / ub_season_pass_lifetime / ub_vip_bundle, see
// STACK.md), verify receipts, and delete the manual path.
//
// Deploy: npx supabase functions deploy sync-entitlement
// Secret:  npx supabase secrets set ENTITLEMENT_WEBHOOK_SECRET=<random>
import { createClient } from 'npm:@supabase/supabase-js@2';

type Plan = 'free' | 'season_pass' | 'vip';
type PassTerm = 'monthly' | 'lifetime' | null;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  let body: {
    student_id?: string;
    plan?: Plan;
    pass_term?: PassTerm;
    source?: 'iap_apple' | 'iap_google' | 'manual';
    receipt_reference?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid JSON body' });
  }

  const plan = body.plan;
  if (plan !== 'free' && plan !== 'season_pass' && plan !== 'vip') {
    return json(400, { error: 'plan must be free | season_pass | vip' });
  }
  const passTerm: PassTerm = body.pass_term ?? null;
  if (passTerm !== null && passTerm !== 'monthly' && passTerm !== 'lifetime') {
    return json(400, { error: 'pass_term must be monthly | lifetime | null' });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // --- Resolve WHO this grant is for --------------------------------------
  let studentId: string;
  let source = body.source ?? 'manual';
  const secret = Deno.env.get('ENTITLEMENT_WEBHOOK_SECRET');
  const givenSecret = req.headers.get('x-webhook-secret');

  if (secret && givenSecret && givenSecret === secret) {
    // Store-server path: the receipt names the student.
    if (!body.student_id) return json(400, { error: 'student_id required' });
    studentId = body.student_id;
  } else {
    // App path: trust only the JWT, never the body.
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return json(401, { error: 'missing authorization' });
    const { data, error } = await admin.auth.getUser(jwt);
    if (error || !data.user) return json(401, { error: 'invalid token' });
    if (body.student_id && body.student_id !== data.user.id) {
      return json(403, { error: 'cannot set another student\'s entitlement' });
    }
    studentId = data.user.id;
    source = 'manual';
  }

  const { error } = await admin.from('entitlements').upsert(
    {
      student_id: studentId,
      plan,
      pass_term: plan === 'season_pass' ? passTerm : null,
      source,
      receipt_reference: body.receipt_reference ?? null,
      granted_at: new Date().toISOString(),
    },
    { onConflict: 'student_id' },
  );
  if (error) return json(500, { error: error.message });

  return json(200, { ok: true, student_id: studentId, plan, pass_term: passTerm });
});
