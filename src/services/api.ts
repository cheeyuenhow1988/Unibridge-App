/**
 * Data access layer. Every screen talks to these async, typed functions and
 * nothing else — swap the JSON imports for Supabase queries later without
 * touching UI code.
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
import type {
  Ambassador, Application, Attraction, CityInfo, CommunityEvent, CostOfLiving, CountryCode, Course,
  Coursemate, DocumentTypeId, FlightFares, GroupMessage, Institution, IntakeGroup, PredepartureItem,
  QualificationSystem, SafetyBundle, Scholarship, SchoolReviews, StudentLife, StudentProfile, SupportBundle, WorkRights,
} from '@/types/models';

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

export async function listInstitutions(): Promise<Institution[]> {
  return simulate(institutions);
}

export async function getInstitution(id: string): Promise<Institution | undefined> {
  return simulate(institutions.find((i) => i.id === id), 200);
}

export async function listCourses(): Promise<Course[]> {
  return simulate(courses);
}

export async function listCoursesByInstitution(institutionId: string): Promise<Course[]> {
  return simulate(courses.filter((c) => c.institutionId === institutionId), 250);
}

export async function getCourse(id: string): Promise<Course | undefined> {
  return simulate(courses.find((c) => c.id === id), 200);
}

export async function getQualificationSystems(): Promise<QualificationSystem[]> {
  return simulate(qualificationsData as unknown as QualificationSystem[], 150);
}

export async function listCostOfLiving(): Promise<CostOfLiving[]> {
  return simulate(costOfLiving, 150);
}

export async function getCostOfLiving(city: string): Promise<CostOfLiving | undefined> {
  return simulate(costOfLiving.find((c) => c.city === city), 150);
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
  return simulate(supportData as unknown as SupportBundle, 120);
}

export async function getSafety(): Promise<SafetyBundle> {
  return simulate(safetyData as unknown as SafetyBundle, 100);
}

export async function getSchoolReviews(institutionId: string): Promise<SchoolReviews | undefined> {
  return simulate((reviewsData as unknown as Record<string, SchoolReviews>)[institutionId], 120);
}

export async function listScholarships(): Promise<Scholarship[]> {
  return simulate(scholarships);
}

/** Food spots around this school's city (deduped, own campus first, max 3) —
 * powers the "Cafés & food nearby" card with its sample ratings. */
export async function listFoodNearby(institutionId: string): Promise<Attraction[]> {
  const inst = institutions.find((i) => i.id === institutionId);
  if (!inst) return simulate([], 150);
  const cityIds = new Set(institutions.filter((i) => i.city === inst.city).map((i) => i.id));
  const seen = new Set<string>();
  const out: Attraction[] = [];
  for (const a of attractions) {
    if (a.type !== 'food' || !cityIds.has(a.institutionId) || seen.has(a.name)) continue;
    seen.add(a.name);
    out.push(a);
  }
  out.sort((a, b) => (a.institutionId === institutionId ? -1 : b.institutionId === institutionId ? 1 : 0));
  return simulate(out.slice(0, 3), 200);
}

export async function listAttractions(institutionId: string): Promise<Attraction[]> {
  return simulate(attractions.filter((a) => a.institutionId === institutionId), 250);
}

export async function listAmbassadors(): Promise<Ambassador[]> {
  return simulate(ambassadors);
}

export async function listAmbassadorsByInstitution(institutionId: string): Promise<Ambassador[]> {
  return simulate(ambassadors.filter((a) => a.institutionId === institutionId), 250);
}

export async function getAmbassador(id: string): Promise<Ambassador | undefined> {
  return simulate(ambassadors.find((a) => a.id === id), 200);
}

export async function listIntakeGroups(): Promise<IntakeGroup[]> {
  return simulate(community.intakeGroups);
}

export async function getIntakeGroup(id: string): Promise<IntakeGroup | undefined> {
  return simulate(community.intakeGroups.find((g) => g.id === id), 200);
}

export async function listGroupMessages(groupId: string): Promise<GroupMessage[]> {
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
