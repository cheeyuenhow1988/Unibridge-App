/**
 * Data access layer. Every screen talks to these async, typed functions and
 * nothing else. Each function serves one of two sources through the SAME
 * signature — screens cannot tell the difference:
 *
 *  - Bundled JSON (default): the mode every QA pass and the GitHub Pages
 *    demo run in. Zero network, simulated latency for loading skeletons.
 *  - Supabase (when EXPO_PUBLIC_SUPABASE_URL + _ANON_KEY are set): reads go
 *    to Postgres via services/backendApi.ts. Any backend failure logs a
 *    warning and serves the bundled JSON instead — the app never breaks
 *    because the backend is down.
 *
 * Datasets that stay bundled-only for now (no backend table yet, by design —
 * see supabase/README.md): qualifications, cityInfo, flights, studentLife,
 * reviews, coursemates, events, predeparture checklists/work rights,
 * document types, the demo seed, support mails/coin rules/redemption
 * catalog, and emergency phone lines.
 */
import institutionsData from '@/data/institutions.json';
import coursesData from '@/data/courses.json';
import qualificationsData from '@/data/qualifications.json';
import cityInfoData from '@/data/cityInfo.json';
import costOfLivingData from '@/data/costOfLiving.json';
import scholarshipsData from '@/data/scholarships.json';
import attractionsData from '@/data/attractions.json';
import ambassadorsData from '@/data/ambassadors.json';
import communityData from '@/data/community.json';
import predepartureData from '@/data/predeparture.json';
import documentsData from '@/data/documents.json';
import seedData from '@/data/seed.json';
import flightsData from '@/data/flights.json';
import studentLifeData from '@/data/studentLife.json';
import supportData from '@/data/support.json';
import safetyData from '@/data/safety.json';
import reviewsData from '@/data/reviews.json';
import * as backend from '@/services/backendApi';
import { isBackendConfigured } from '@/services/supabase';
import type {
  Ambassador, Application, Attraction, CityInfo, CommunityEvent, CostOfLiving, CountryCode, Course,
  Coursemate, DocumentTypeId, FlightFares, GroupMessage, Institution, IntakeGroup, PredepartureItem,
  QualificationSystem, SafetyBundle, Scholarship, SchoolReviews, StudentLife, StudentProfile, SupportBundle, WorkRights,
} from '@/types/models';

export { isBackendConfigured };

const institutions = institutionsData as Institution[];
const courses = coursesData as unknown as Course[];
const costOfLiving = costOfLivingData as CostOfLiving[];
const scholarships = scholarshipsData as unknown as Scholarship[];
const attractions = attractionsData as Attraction[];
const ambassadors = ambassadorsData as unknown as Ambassador[];
const community = communityData as unknown as {
  intakeGroups: IntakeGroup[];
  groupMessages: GroupMessage[];
  coursemates: Coursemate[];
  events: CommunityEvent[];
};
const predeparture = predepartureData as unknown as {
  checklists: Record<CountryCode, PredepartureItem[]>;
  workRights: Record<CountryCode, WorkRights>;
};

/** Simulated network latency so loading skeletons are visible in the prototype. */
function simulate<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms + Math.random() * 250));
}

const warn = (name: string, e: unknown) =>
  console.warn(`[api] ${name}: backend read failed — serving bundled data`, e);

/** JSON mode keeps its simulated latency; backend mode has real latency. */
const deliver = <T>(value: T, ms?: number): Promise<T> =>
  isBackendConfigured ? Promise.resolve(value) : simulate(value, ms);

// --- Per-dataset sources: backend when configured (JSON on failure) --------

async function srcInstitutions(): Promise<Institution[]> {
  if (isBackendConfigured) {
    try { return await backend.fetchInstitutions(); } catch (e) { warn('institutions', e); }
  }
  return institutions;
}

async function srcCourses(): Promise<Course[]> {
  if (isBackendConfigured) {
    try { return await backend.fetchCourses(); } catch (e) { warn('courses', e); }
  }
  return courses;
}

async function srcCostOfLiving(): Promise<CostOfLiving[]> {
  if (isBackendConfigured) {
    try { return await backend.fetchCostOfLiving(); } catch (e) { warn('costOfLiving', e); }
  }
  return costOfLiving;
}

async function srcScholarships(): Promise<Scholarship[]> {
  if (isBackendConfigured) {
    try { return await backend.fetchScholarships(); } catch (e) { warn('scholarships', e); }
  }
  return scholarships;
}

async function srcAttractions(): Promise<Attraction[]> {
  if (isBackendConfigured) {
    try { return await backend.fetchAttractions(); } catch (e) { warn('attractions', e); }
  }
  return attractions;
}

async function srcAmbassadors(): Promise<Ambassador[]> {
  if (isBackendConfigured) {
    try { return await backend.fetchAmbassadors(); } catch (e) { warn('ambassadors', e); }
  }
  return ambassadors;
}

async function srcIntakeGroups(): Promise<IntakeGroup[]> {
  if (isBackendConfigured) {
    try { return await backend.fetchIntakeGroups(); } catch (e) { warn('intakeGroups', e); }
  }
  return community.intakeGroups;
}

// ------------------------------------------------------------------- reads

export async function listInstitutions(): Promise<Institution[]> {
  return deliver(await srcInstitutions());
}

export async function getInstitution(id: string): Promise<Institution | undefined> {
  return deliver((await srcInstitutions()).find((i) => i.id === id), 200);
}

export async function listCourses(): Promise<Course[]> {
  return deliver(await srcCourses());
}

export async function listCoursesByInstitution(institutionId: string): Promise<Course[]> {
  return deliver((await srcCourses()).filter((c) => c.institutionId === institutionId), 250);
}

export async function getCourse(id: string): Promise<Course | undefined> {
  return deliver((await srcCourses()).find((c) => c.id === id), 200);
}

export async function getQualificationSystems(): Promise<QualificationSystem[]> {
  return simulate(qualificationsData as unknown as QualificationSystem[], 150);
}

export async function listCostOfLiving(): Promise<CostOfLiving[]> {
  return deliver(await srcCostOfLiving(), 150);
}

export async function getCostOfLiving(city: string): Promise<CostOfLiving | undefined> {
  return deliver((await srcCostOfLiving()).find((c) => c.city === city), 150);
}

export async function listCityInfo(): Promise<CityInfo[]> {
  return simulate(cityInfoData as CityInfo[], 150);
}

export async function getFlightFares(): Promise<FlightFares> {
  return simulate(flightsData as unknown as FlightFares, 100);
}

export async function getStudentLife(): Promise<StudentLife> {
  return simulate(studentLifeData as unknown as StudentLife, 150);
}

export async function getSupportBundle(): Promise<SupportBundle> {
  const bundle = supportData as unknown as SupportBundle;
  if (isBackendConfigured) {
    // Hybrid: team + shorts live in Postgres; mails, coin rules, redemption
    // catalog and the generic checklist stay bundled (no tables yet).
    try {
      const [team, shorts] = await Promise.all([backend.fetchSupportTeam(), backend.fetchShorts()]);
      return { ...bundle, team, shorts };
    } catch (e) { warn('support', e); }
  }
  return simulate(bundle, 120);
}

export async function getSafety(): Promise<SafetyBundle> {
  const bundle = safetyData as unknown as SafetyBundle;
  if (isBackendConfigured) {
    // Hybrid: the embassy directory lives in Postgres; emergency phone lines
    // stay bundled. Absent pairs behave like the JSON's explicit nulls.
    try {
      const embassies = (await backend.fetchEmbassies()) as SafetyBundle['embassies'];
      return { ...bundle, embassies };
    } catch (e) { warn('safety', e); }
  }
  return simulate(bundle, 100);
}

export async function getSchoolReviews(institutionId: string): Promise<SchoolReviews | undefined> {
  return simulate((reviewsData as unknown as Record<string, SchoolReviews>)[institutionId], 120);
}

export async function listScholarships(): Promise<Scholarship[]> {
  return deliver(await srcScholarships());
}

/** Food spots around this school's city (deduped, own campus first, max 3) —
 * powers the "Cafés & food nearby" card with its sample ratings. */
export async function listFoodNearby(institutionId: string): Promise<Attraction[]> {
  const [allInstitutions, allAttractions] = await Promise.all([srcInstitutions(), srcAttractions()]);
  const inst = allInstitutions.find((i) => i.id === institutionId);
  if (!inst) return deliver([], 150);
  const cityIds = new Set(allInstitutions.filter((i) => i.city === inst.city).map((i) => i.id));
  const seen = new Set<string>();
  const out: Attraction[] = [];
  for (const a of allAttractions) {
    if (a.type !== 'food' || !cityIds.has(a.institutionId) || seen.has(a.name)) continue;
    seen.add(a.name);
    out.push(a);
  }
  out.sort((a, b) => (a.institutionId === institutionId ? -1 : b.institutionId === institutionId ? 1 : 0));
  return deliver(out.slice(0, 3), 200);
}

export async function listAttractions(institutionId: string): Promise<Attraction[]> {
  return deliver((await srcAttractions()).filter((a) => a.institutionId === institutionId), 250);
}

export async function listAmbassadors(): Promise<Ambassador[]> {
  return deliver(await srcAmbassadors());
}

export async function listAmbassadorsByInstitution(institutionId: string): Promise<Ambassador[]> {
  return deliver((await srcAmbassadors()).filter((a) => a.institutionId === institutionId), 250);
}

export async function getAmbassador(id: string): Promise<Ambassador | undefined> {
  return deliver((await srcAmbassadors()).find((a) => a.id === id), 200);
}

export async function listIntakeGroups(): Promise<IntakeGroup[]> {
  return deliver(await srcIntakeGroups());
}

export async function getIntakeGroup(id: string): Promise<IntakeGroup | undefined> {
  return deliver((await srcIntakeGroups()).find((g) => g.id === id), 200);
}

export async function listGroupMessages(groupId: string): Promise<GroupMessage[]> {
  if (isBackendConfigured) {
    try { return await backend.fetchGroupMessages(groupId); } catch (e) { warn('groupMessages', e); }
  }
  return simulate(community.groupMessages.filter((m) => m.groupId === groupId), 300);
}

export async function listCoursemates(): Promise<Coursemate[]> {
  return simulate(community.coursemates);
}

export async function listEvents(): Promise<CommunityEvent[]> {
  return simulate(community.events);
}

export async function getPredepartureChecklist(country: CountryCode): Promise<PredepartureItem[]> {
  return simulate(predeparture.checklists[country] ?? [], 200);
}

export async function getWorkRights(country: CountryCode): Promise<WorkRights | undefined> {
  return simulate(predeparture.workRights[country], 150);
}

export async function getDocumentTypes(): Promise<{ id: DocumentTypeId; hasExpiry: boolean }[]> {
  return simulate(documentsData as { id: DocumentTypeId; hasExpiry: boolean }[], 100);
}

export interface DemoSeed {
  profile: StudentProfile;
  savedCourseIds: string[];
  applications: Application[];
  joinedGroupIds: string[];
  notifications: { id: string; applicationId: string; status: Application['status']; date: string }[];
}

export async function getDemoSeed(): Promise<DemoSeed> {
  return simulate(seedData as unknown as DemoSeed, 100);
}

// --- Backend writes --------------------------------------------------------
// Fire-and-forget mirrors called from the Zustand stores and the group chat.
// In JSON mode (and on any backend failure) they are safe no-ops: local
// state is authoritative in the prototype, so the demo never changes
// behavior. Production flips authority to the server (see supabase/README.md).

/** Deliver a chat message into the group's Postgres history. */
export async function sendGroupMessage(
  groupId: string,
  text: string,
  senderName: string,
  senderAvatar = '',
): Promise<void> {
  if (!isBackendConfigured) return;
  try {
    await backend.sendGroupMessage(groupId, text, senderName, senderAvatar);
  } catch (e) {
    console.warn('[api] sendGroupMessage: not delivered to backend', e);
  }
}

/** Live feed of other members' messages. No-op unsubscribe in JSON mode. */
export function subscribeGroupMessages(
  groupId: string,
  onMessage: (message: GroupMessage) => void,
): () => void {
  if (!isBackendConfigured) return () => undefined;
  try {
    return backend.subscribeGroupMessages(groupId, onMessage);
  } catch (e) {
    console.warn('[api] subscribeGroupMessages failed', e);
    return () => undefined;
  }
}

/** Record group membership (reads of members-only chats depend on it). */
export async function joinIntakeGroup(groupId: string): Promise<void> {
  if (!isBackendConfigured) return;
  try {
    await backend.joinGroup(groupId);
  } catch (e) {
    console.warn('[api] joinIntakeGroup: not recorded on backend', e);
  }
}

/** Mirror a coin earn into the append-only ledger (positive deltas only). */
export async function recordCoinEarn(labelId: string, delta: number): Promise<void> {
  if (!isBackendConfigured || delta <= 0) return;
  try {
    await backend.earnCoins(labelId, delta);
  } catch (e) {
    console.warn('[api] recordCoinEarn: not recorded on backend', e);
  }
}

/** Mirror a redemption through the atomic redeem_reward() function. */
export async function recordRedemption(itemId: string, cost: number): Promise<void> {
  if (!isBackendConfigured) return;
  try {
    await backend.redeemReward(itemId, cost);
  } catch (e) {
    console.warn('[api] recordRedemption: not recorded on backend', e);
  }
}

/** Ask the sync-entitlement edge function to set this student's plan.
 * Clients cannot write the entitlements table (RLS is select-only), so the
 * service-role function is the ONLY grant path — today triggered by the
 * prototype's mock purchases, later by Apple/Google IAP webhooks. */
export async function syncPlanEntitlement(
  plan: 'free' | 'season_pass' | 'vip',
  passTerm?: 'monthly' | 'lifetime' | null,
): Promise<void> {
  if (!isBackendConfigured) return;
  try {
    await backend.syncEntitlement({ plan, passTerm });
  } catch (e) {
    console.warn('[api] syncPlanEntitlement: not synced to backend', e);
  }
}
