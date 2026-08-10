/**
 * Supabase-backed data access — the live counterpart of the bundled JSON.
 *
 * Every read here maps Postgres rows (snake_case, normalized into child
 * tables) back into the exact TypeScript models the screens were built on,
 * so api.ts can serve either source through identical signatures. Nothing
 * in this file runs unless `isBackendConfigured` is true — api.ts guards
 * every call and falls back to the bundled JSON on any failure.
 *
 * Row payloads from supabase-js are untyped; mappers take `any` on purpose
 * and are the single place that knows both naming schemes.
 */
import { supabase } from '@/services/supabase';
import type {
  Ambassador, Application, ApplicationStatus, Attraction, CostOfLiving, Course, DocumentTypeId,
  EmbassyEntry, GroupMessage, Institution, IntakeGroup, Scholarship, Short, SupportStaff,
} from '@/types/models';

/** Non-null client for internal use — api.ts only calls in configured mode. */
function sb() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

// ------------------------------------------------------------------ helpers

/** PostgREST caps responses (1000 rows by default) — page until a short page.
 * entry_requirements alone is ~15k rows, so this is not optional. */
async function fetchAllRows(table: string, orderCol = 'id'): Promise<any[]> {
  const PAGE = 1000;
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb().from(table).select('*').order(orderCol).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Session-lifetime read cache. Failed loads are evicted so a flaky network
 * retries next call instead of pinning the JSON fallback forever. */
const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = load();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

async function currentUserId(): Promise<string | null> {
  const { data } = await sb().auth.getSession();
  return data.session?.user?.id ?? null;
}

async function requireUserId(): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new Error('not signed in');
  return uid;
}

// ------------------------------------------------------------------ mappers

function mapInstitution(r: any): Institution {
  return {
    id: r.id,
    name: r.name,
    short: r.short_name ?? r.name,
    country: r.country,
    city: r.city,
    type: r.type,
    verifiedPartner: Boolean(r.is_verified_partner),
    tagline: r.tagline ?? '',
    website: r.website ?? '',
    languages: r.languages ?? [],
    logo: r.logo ?? '',
    wikipedia: r.wikipedia ?? '',
    ranking: r.qs_rank ?? null,
    founded: Number(r.founded ?? 0),
    students: Number(r.students ?? 0),
    images: r.photos ?? [],
    ...(Array.isArray(r.campuses) && r.campuses.length > 0 ? { campuses: r.campuses } : {}),
  };
}

function mapCourse(
  r: any,
  requirements: Course['requirements'],
  recognition: Course['recognition'],
): Course {
  return {
    id: r.id,
    institutionId: r.institution_id,
    field: r.field,
    level: r.level,
    name: r.name,
    campusCity: r.campus_city ?? '',
    country: r.country,
    currency: r.tuition_currency,
    durationYears: Number(r.duration_years ?? 0),
    semestersPerYear: Number(r.semesters_per_year ?? 2),
    intakes: r.intake_dates ?? [],
    tuitionPerYear: Number(r.annual_tuition_local ?? 0),
    tuitionPerSemester: Number(r.tuition_per_semester ?? 0),
    oneOffFees: r.one_off_fees ?? { enrollment: 0 },
    english: r.english_requirement ?? { ielts: 0, toefl: 0 },
    selectivity: Number(r.selectivity ?? 0),
    requirements,
    localRequirementNote: r.local_requirement_note ?? '',
    requiredDocuments: r.required_documents ?? [],
    applicationFee: Number(r.application_fee ?? 0),
    recognition,
    ...(Array.isArray(r.pathway_for) && r.pathway_for.length > 0 ? { pathwayFor: r.pathway_for } : {}),
  };
}

function mapAttraction(r: any): Attraction {
  return {
    id: r.id,
    institutionId: r.institution_id,
    name: r.name,
    type: r.type,
    distanceMinutes: Number(r.distance_minutes ?? 0),
    description: r.description ?? '',
    image: r.image_url ?? '',
    tips: r.tips ?? [],
    ...(r.rating != null ? { rating: Number(r.rating) } : {}),
    ...(r.review_count != null ? { reviewCount: Number(r.review_count) } : {}),
    ...(r.review_snippet ? { reviewSnippet: r.review_snippet } : {}),
    ...(Array.isArray(r.photos) && r.photos.length > 0 ? { photos: r.photos } : {}),
  };
}

function mapScholarship(r: any): Scholarship {
  return {
    id: r.id,
    name: r.name,
    provider: r.provider ?? '',
    destinationCountry: r.destination_country ?? 'any',
    fields: r.fields ?? 'any',
    nationalities: r.eligible_nationalities ?? 'any',
    coverageType: r.coverage_type,
    ...(r.percent_tuition != null ? { percentTuition: Number(r.percent_tuition) } : {}),
    ...(r.amount != null ? { amount: Number(r.amount) } : {}),
    ...(r.currency ? { currency: r.currency } : {}),
    ...(r.stipend_monthly != null ? { stipendMonthly: Number(r.stipend_monthly) } : {}),
    deadline: r.deadline ?? '',
    eligibilityNote: r.eligibility_note ?? '',
    ...(r.link ? { link: r.link } : {}),
  };
}

function mapCostOfLiving(r: any): CostOfLiving {
  return {
    city: r.city,
    country: r.country,
    currency: r.currency,
    verifiedBy: r.verified_by ?? [],
    lastVerified: r.last_verified ?? null,
    rentMonthly: Number(r.rent_monthly),
    rentOptions: r.rent_options,
    foodMonthly: Number(r.food_monthly),
    transportMonthly: Number(r.transport_monthly),
    utilitiesMonthly: Number(r.utilities_monthly ?? 0),
    eatingOutMeal: Number(r.eating_out_meal ?? 0),
    insuranceYearly: Number(r.insurance_yearly ?? 0),
    visaFeeOneOff: Number(r.visa_fee_oneoff ?? 0),
  };
}

function mapAmbassador(r: any, posts: any[]): Ambassador {
  return {
    id: r.id,
    name: r.name,
    homeCountry: r.home_country,
    institutionId: r.institution_id ?? '',
    courseName: r.course ?? '',
    year: Number(r.year ?? 1),
    bio: r.bio ?? '',
    avatar: r.avatar_url ?? '',
    posts: posts.map((p) => ({
      id: p.id,
      text: p.caption ?? '',
      image: (p.media_urls ?? [])[0] ?? '',
      likes: Number(p.likes ?? 0),
      date: p.posted_date ?? '',
    })),
  };
}

function mapIntakeGroup(r: any): IntakeGroup {
  return {
    id: r.id,
    institutionId: r.institution_id,
    intake: r.intake_label,
    name: r.name ?? '',
    members: Number(r.member_count ?? 0),
  };
}

/** Own messages keep the app's `local-` id convention so the chat bubble
 * renders on the right ("mine") without touching the screen's logic. */
function mapGroupMessage(r: any, myUid: string | null): GroupMessage {
  return {
    id: r.sender_id === myUid ? `local-${r.id}` : r.id,
    groupId: r.group_id,
    author: r.sender_name ?? '',
    avatar: r.sender_avatar ?? '',
    text: r.body ?? '',
    time: r.created_at ?? '',
  };
}

function mapShort(r: any): Short {
  return {
    id: r.id,
    title: r.title,
    ambassadorId: r.ambassador_id ?? '',
    duration: Number(r.duration_sec ?? 0),
    views: Number(r.view_count ?? 0),
    thumb: r.thumbnail_url ?? '',
    ...(r.institution_id ? { institutionId: r.institution_id } : {}),
    ...(r.is_reality_check ? { reality: true } : {}),
  };
}

function mapSupportStaff(r: any): SupportStaff {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    avatar: r.avatar_url ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
  };
}

function mapApplication(r: any): Application {
  return {
    id: r.id,
    courseId: r.course_id,
    status: r.status,
    ...(r.intake ? { intake: r.intake } : {}),
    createdAt: r.submitted_at,
    updatedAt: r.decision_at ?? r.submitted_at,
    history: r.history ?? [],
    feeWaived: Boolean(r.fee_waived),
    ...(r.scholarship_id ? { scholarshipId: r.scholarship_id } : {}),
  };
}

// -------------------------------------------------------------------- reads

export function fetchInstitutions(): Promise<Institution[]> {
  return cached('institutions', async () => (await fetchAllRows('institutions')).map(mapInstitution));
}

export function fetchCourses(): Promise<Course[]> {
  return cached('courses', async () => {
    const [courseRows, reqRows, recRows] = await Promise.all([
      fetchAllRows('courses'),
      fetchAllRows('entry_requirements'),
      fetchAllRows('recognition_matrix'),
    ]);
    const reqBy = new Map<string, Course['requirements']>();
    for (const r of reqRows) {
      const bag = reqBy.get(r.course_id) ?? ({} as Course['requirements']);
      bag[r.qualification_system as keyof Course['requirements']] = {
        min: Number(r.min_value ?? 0),
        display: r.requirement_text ?? '',
      };
      reqBy.set(r.course_id, bag);
    }
    const recBy = new Map<string, Course['recognition']>();
    for (const r of recRows) {
      const bag = recBy.get(r.course_id) ?? ({} as Course['recognition']);
      bag[r.home_country as keyof Course['recognition']] = Boolean(r.is_recognized);
      recBy.set(r.course_id, bag);
    }
    return courseRows.map((r) =>
      mapCourse(r, reqBy.get(r.id) ?? ({} as Course['requirements']), recBy.get(r.id) ?? ({} as Course['recognition'])));
  });
}

export function fetchScholarships(): Promise<Scholarship[]> {
  return cached('scholarships', async () => (await fetchAllRows('scholarships')).map(mapScholarship));
}

export function fetchCostOfLiving(): Promise<CostOfLiving[]> {
  return cached('col', async () => (await fetchAllRows('cost_of_living', 'city')).map(mapCostOfLiving));
}

export function fetchAttractions(): Promise<Attraction[]> {
  return cached('attractions', async () => (await fetchAllRows('nearby_attractions')).map(mapAttraction));
}

export function fetchAmbassadors(): Promise<Ambassador[]> {
  return cached('ambassadors', async () => {
    const [ambRows, postRows] = await Promise.all([
      fetchAllRows('ambassadors'),
      fetchAllRows('ambassador_posts'),
    ]);
    const postsBy = new Map<string, any[]>();
    for (const p of postRows) {
      const list = postsBy.get(p.ambassador_id) ?? [];
      list.push(p);
      postsBy.set(p.ambassador_id, list);
    }
    return ambRows.map((r) => mapAmbassador(r, postsBy.get(r.id) ?? []));
  });
}

export function fetchIntakeGroups(): Promise<IntakeGroup[]> {
  return cached('groups', async () => (await fetchAllRows('intake_groups')).map(mapIntakeGroup));
}

export function fetchSupportTeam(): Promise<SupportStaff[]> {
  return cached('team', async () => (await fetchAllRows('support_team')).map(mapSupportStaff));
}

export function fetchShorts(): Promise<Short[]> {
  return cached('shorts', async () => (await fetchAllRows('shorts')).map(mapShort));
}

/** Rows back into the nested embassies[destination][nationality] record the
 * safety screens read. Pairs with no mission simply stay absent (the JSON
 * used explicit nulls; every consumer reads with `?.` so both behave alike). */
export function fetchEmbassies(): Promise<Record<string, Record<string, EmbassyEntry>>> {
  return cached('embassies', async () => {
    const out: Record<string, Record<string, EmbassyEntry>> = {};
    for (const r of await fetchAllRows('embassy_directory')) {
      const dest = (out[r.destination_country] ??= {});
      dest[r.home_country] = {
        name: r.name,
        city: r.city,
        address: r.address ?? '',
        phone: r.phone ?? '',
        ...(r.emergency_phone ? { afterHours: r.emergency_phone } : {}),
      };
    }
    return out;
  });
}

/** Group history. RLS only shows messages of groups you belong to, so when a
 * signed-in student opens a chat we first make sure they are a member —
 * in the prototype, opening a group IS joining it (mirrors the JSON demo,
 * where every group's chatter is visible once you tap in). */
export async function fetchGroupMessages(groupId: string): Promise<GroupMessage[]> {
  const uid = await currentUserId();
  if (uid) await joinGroup(groupId).catch(() => undefined);
  const { data, error } = await sb()
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at')
    .limit(500);
  if (error) throw new Error(`messages: ${error.message}`);
  return (data ?? []).map((r) => mapGroupMessage(r, uid));
}

// ------------------------------------------------------- auth (minimal)

/** Magic-link / OTP sign-in — the only auth flow the prototype needs. */
export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await sb().auth.signInWithOtp({ email });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await sb().auth.signOut();
}

export { currentUserId };

// -------------------------------------------------------------------- writes

/** Idempotent membership upsert (RLS: only as yourself). */
export async function joinGroup(groupId: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await sb()
    .from('intake_group_members')
    .upsert({ group_id: groupId, student_id: uid }, { onConflict: 'group_id,student_id', ignoreDuplicates: true });
  if (error) throw new Error(`joinGroup: ${error.message}`);
}

export async function sendGroupMessage(
  groupId: string,
  text: string,
  senderName: string,
  senderAvatar = '',
): Promise<void> {
  const uid = await requireUserId();
  const { error } = await sb().from('messages').insert({
    group_id: groupId,
    sender_id: uid,
    sender_type: 'student',
    sender_name: senderName,
    sender_avatar: senderAvatar,
    body: text,
  });
  if (error) throw new Error(`sendGroupMessage: ${error.message}`);
}

/** Live INSERT feed for one group chat. Returns the unsubscribe function.
 * Own messages are skipped — the screen already shows them optimistically. */
export function subscribeGroupMessages(
  groupId: string,
  onMessage: (message: GroupMessage) => void,
): () => void {
  const channel = sb()
    .channel(`group-${groupId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
      (payload) => {
        void currentUserId().then((uid) => {
          const row = payload.new as any;
          if (row.sender_id === uid) return;
          onMessage(mapGroupMessage(row, uid));
        });
      },
    )
    .subscribe();
  return () => {
    void sb().removeChannel(channel);
  };
}

export async function submitApplication(input: {
  courseId: string;
  intake?: string;
  scholarshipId?: string;
  feeWaived?: boolean;
}): Promise<Application> {
  const uid = await requireUserId();
  const now = new Date().toISOString();
  const { data, error } = await sb()
    .from('applications')
    .insert({
      student_id: uid,
      course_id: input.courseId,
      status: 'submitted' satisfies ApplicationStatus,
      intake: input.intake ?? null,
      scholarship_id: input.scholarshipId ?? null,
      fee_waived: Boolean(input.feeWaived),
      history: [{ status: 'submitted', date: now }],
    })
    .select()
    .single();
  if (error) throw new Error(`submitApplication: ${error.message}`);
  return mapApplication(data);
}

export async function getApplications(): Promise<Application[]> {
  await requireUserId();
  const { data, error } = await sb().from('applications').select('*').order('submitted_at');
  if (error) throw new Error(`getApplications: ${error.message}`);
  return (data ?? []).map(mapApplication);
}

/** Upload into the PRIVATE documents bucket under the student's own folder
 * (the only prefix storage RLS lets them touch) + register the vault row. */
export async function uploadDocument(input: {
  docType: DocumentTypeId;
  fileName: string;
  file: Blob | ArrayBuffer;
  contentType?: string;
  expiryDate?: string;
}): Promise<{ id: string; storagePath: string }> {
  const uid = await requireUserId();
  const safeName = input.fileName.replace(/[^\w.-]+/g, '_');
  const storagePath = `${uid}/${Date.now()}-${safeName}`;
  const up = await sb().storage.from('documents').upload(storagePath, input.file, {
    contentType: input.contentType,
    upsert: false,
  });
  if (up.error) throw new Error(`upload: ${up.error.message}`);
  const { data, error } = await sb()
    .from('documents')
    .insert({
      student_id: uid,
      doc_type: input.docType,
      storage_path: storagePath,
      expiry_date: input.expiryDate ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(`uploadDocument: ${error.message}`);
  return { id: data.id, storagePath };
}

/** Short-lived signed URL for viewing an own private document. */
export async function getDocumentUrl(storagePath: string): Promise<string> {
  const { data, error } = await sb().storage.from('documents').createSignedUrl(storagePath, 60 * 60);
  if (error) throw new Error(`getDocumentUrl: ${error.message}`);
  return data.signedUrl;
}

// ------------------------------------------------ coins & entitlements

export async function getCoinBalance(): Promise<number> {
  await requireUserId();
  const { data, error } = await sb().from('coin_ledger').select('delta');
  if (error) throw new Error(`coins: ${error.message}`);
  return (data ?? []).reduce((sum, r) => sum + Number(r.delta), 0);
}

/** Positive earns only — the ledger's RLS rejects anything else. */
export async function earnCoins(reason: string, delta: number): Promise<void> {
  if (delta <= 0) throw new Error('earnCoins: delta must be positive');
  const uid = await requireUserId();
  const { error } = await sb().from('coin_ledger').insert({ student_id: uid, delta, reason });
  if (error) throw new Error(`earnCoins: ${error.message}`);
}

/** Atomic spend via the security-definer function (balance check included). */
export async function redeemReward(item: string, cost: number): Promise<string> {
  const { data, error } = await sb().rpc('redeem_reward', { item, cost });
  if (error) throw new Error(`redeemReward: ${error.message}`);
  return data as string;
}

export async function getPlan(): Promise<{ plan: string; passTerm: string | null } | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await sb().from('entitlements').select('plan, pass_term').maybeSingle();
  if (error) throw new Error(`getPlan: ${error.message}`);
  return data ? { plan: data.plan, passTerm: data.pass_term } : { plan: 'free', passTerm: null };
}

/** Ask the sync-entitlement edge function (service role) to grant/downgrade.
 * Clients cannot write entitlements directly — RLS is select-only — so this
 * is the ONLY path, today triggered manually and later by IAP webhooks. */
export async function syncEntitlement(input: {
  plan: 'free' | 'season_pass' | 'vip';
  passTerm?: 'monthly' | 'lifetime' | null;
  receiptReference?: string;
}): Promise<void> {
  const uid = await requireUserId();
  const { error } = await sb().functions.invoke('sync-entitlement', {
    body: {
      student_id: uid,
      plan: input.plan,
      pass_term: input.passTerm ?? null,
      source: 'manual',
      receipt_reference: input.receiptReference ?? null,
    },
  });
  if (error) throw new Error(`syncEntitlement: ${error.message}`);
}
