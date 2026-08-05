export type CountryCode = 'AU' | 'MY' | 'TW' | 'GB' | 'SG' | 'NZ' | 'RU' | 'US' | 'CA' | 'CN';
export type HomeCountryCode =
  | 'MY' | 'TW' | 'SG' | 'ID' | 'VN' | 'CN' | 'MM' | 'KR' | 'JP'
  | 'TH' | 'HK' | 'IN' | 'PH';
export type CurrencyCode =
  | 'AUD' | 'MYR' | 'TWD' | 'GBP' | 'SGD' | 'NZD' | 'RUB'
  | 'IDR' | 'VND' | 'CNY' | 'USD' | 'CAD' | 'MMK' | 'KRW' | 'JPY'
  | 'THB' | 'HKD' | 'INR' | 'PHP';

export type FieldId =
  | 'business' | 'engineering' | 'it' | 'health' | 'hospitality' | 'design' | 'law'
  | 'science' | 'media' | 'architecture' | 'education';

export type CourseLevel = 'foundation' | 'diploma' | 'bachelor';

export type QualificationId =
  | 'spm' | 'stpm' | 'uec' | 'alevels' | 'ib' | 'hkdse' | 'gsat' | 'atar' | 'gpa'
  | 'sma' | 'thpt' | 'matric' | 'krgpa' | 'jpgpa' | 'gaokao' | 'cbse' | 'shs';

export type InstitutionType = 'university' | 'college' | 'institute';

export type DocumentTypeId =
  | 'transcript' | 'certificate' | 'passport' | 'english'
  | 'recommendation' | 'statement' | 'financial' | 'portfolio' | 'health';

export type AttractionType =
  | 'food' | 'nature' | 'shopping' | 'landmark' | 'nightlife' | 'sports';

export interface Institution {
  id: string;
  name: string;
  /** Short display name for group titles and tight layouts, e.g. "Monash". */
  short: string;
  country: CountryCode;
  city: string;
  type: InstitutionType;
  verifiedPartner: boolean;
  tagline: string;
  website: string;
  /** Languages of instruction, e.g. ["Mandarin", "English"]. */
  languages: string[];
  /** Official-domain logo (Clearbit logo service). */
  logo: string;
  /** Wikipedia page title, used to fetch a real campus photo at runtime. */
  wikipedia: string;
  /** Indicative QS-style world ranking; null when unranked. */
  ranking: number | null;
  founded: number;
  students: number;
  images: string[];
  /** Sister/branch campuses of the same brand in other cities or countries. */
  campuses?: { id: string; name: string; city: string; country: CountryCode }[];
}

export interface EntryRequirement {
  /** Threshold on the qualification's score scale (see QualificationSystem.direction). */
  min: number;
  /** Human-readable requirement, e.g. "BBC" or "max 12 points (best 5)". */
  display: string;
}

export interface Course {
  id: string;
  institutionId: string;
  field: FieldId;
  level: CourseLevel;
  name: string;
  campusCity: string;
  country: CountryCode;
  currency: CurrencyCode;
  durationYears: number;
  semestersPerYear: number;
  /** ISO year-month strings, e.g. "2027-02". */
  intakes: string[];
  tuitionPerYear: number;
  tuitionPerSemester: number;
  oneOffFees: { enrollment: number; lab?: number; materials?: number };
  english: { ielts: number; toefl: number };
  /** 1 (open entry) … 5 (highly selective); 0 for pathway programmes. */
  selectivity: number;
  requirements: Record<QualificationId, EntryRequirement>;
  localRequirementNote: string;
  requiredDocuments: DocumentTypeId[];
  applicationFee: number;
  recognition: Record<HomeCountryCode, boolean>;
  /** Set on foundation/diploma courses: the fields this pathway leads into. */
  pathwayFor?: FieldId[];
}

export interface GradeOption {
  label: string;
  points: number;
}

export interface QualificationSystem {
  id: QualificationId;
  name: string;
  region: string;
  mode: 'subjects' | 'total';
  /** Whether a higher or lower score is better (UEC points: lower is better). */
  direction: 'higher' | 'lower';
  unit: string;
  subjectCount?: number;
  maxSubjects?: number;
  grades?: GradeOption[];
  aggregator?: 'sum' | 'mean' | 'credits';
  /** For 'credits': a subject counts as a credit when points >= this value. */
  creditMinPoints?: number;
  /** For 'sum'/'mean': how many best subjects count. */
  bestOf?: number;
  min?: number;
  max?: number;
  decimals?: number;
  borderlineDelta: number;
  subjectOptions?: string[];
}

export interface FxTable {
  base: 'USD';
  asOf: string;
  rates: Record<CurrencyCode, number>;
}

export type StaffRole = 'coach' | 'support' | 'visa';

export interface SupportStaff {
  id: string;
  name: string;
  role: StaffRole;
  avatar: string;
  phone: string;
  email: string;
}

export type MailKind = 'offer' | 'document_request' | 'conditional' | 'interview' | 'event' | 'newsletter';

export interface UniversityMail {
  id: string;
  institutionId: string;
  applicationId: string;
  kind: MailKind;
  subject: string;
  snippet: string;
  date: string;
  read: boolean;
}

export interface Short {
  id: string;
  title: string;
  ambassadorId: string;
  duration: number;
  views: number;
  thumb: string;
  /** Institution the clip is about, for surfacing on course pages. */
  institutionId?: string;
  /** Unscripted "what nobody tells you" clip — raw thumbnail treatment. */
  reality?: boolean;
}

export interface CoinRule {
  id: string;
  coins: number;
}

export interface RedemptionItem {
  id: string;
  coins: number;
}

export interface SupportBundle {
  team: SupportStaff[];
  mails: UniversityMail[];
  shorts: Short[];
  coinRules: CoinRule[];
  redemptions: RedemptionItem[];
  /** Universal free-tier pre-departure list; country lists are pass-only. */
  genericChecklist: PredepartureItem[];
}

export interface LifeSharedBy {
  id: string;
  name: string;
  inst: string;
}

export interface JobListing {
  id: string;
  city: string;
  role: string;
  spot: string | null;
  payHourMin: number;
  payHourMax: number;
  onCampus: boolean;
  sharedBy: LifeSharedBy | null;
  /** Hiring contact — indicative prototype details, never a real employer. */
  contact?: { name: string; email: string; whatsapp: string };
  /** Typical hours per week, e.g. "12-20". */
  hoursNote?: string;
}

export interface HousingListing {
  id: string;
  city: string;
  kind: 'dorm' | 'roomSuburb' | 'roomCentral' | 'studio';
  priceMonthly: number;
  minutesToCampus: number;
  verified: boolean;
  sharedBy: LifeSharedBy | null;
}

export interface CarGuide {
  country: CountryCode;
  currency: CurrencyCode;
  usedCar: [number, number] | null;
  rentalDay: [number, number];
  note: string;
}

export interface StudentLife {
  emergency: Record<CountryCode, string>;
  jobsByCity: Record<string, JobListing[]>;
  housingByCity: Record<string, HousingListing[]>;
  carsByCountry: Record<CountryCode, CarGuide>;
}

export interface FlightFares {
  currency: 'USD';
  roundTrip: boolean;
  /** fares[destinationCountry][homeCountry] = [lowSeason, peakSeason] round-trip economy, USD. */
  fares: Record<CountryCode, Record<HomeCountryCode, [number, number]>>;
}

export interface CityInfo {
  city: string;
  country: CountryCode;
  climate: string;
  safety: string;
}

export interface RentOptions {
  roomSuburb: number;
  roomCbd: number;
  studioSuburb: number;
  studioCbd: number;
  unitSuburb: number;
  unitCbd: number;
}

export interface CostOfLiving {
  city: string;
  country: CountryCode;
  currency: CurrencyCode;
  /** Ambassador IDs who confirmed these figures; empty = show "Estimated". */
  verifiedBy?: string[];
  lastVerified?: string | null;
  /** Budget default used in totals: shared room in a suburb. */
  rentMonthly: number;
  rentOptions: RentOptions;
  foodMonthly: number;
  transportMonthly: number;
  utilitiesMonthly: number;
  /** Typical inexpensive eating-out meal price. */
  eatingOutMeal: number;
  insuranceYearly: number;
  visaFeeOneOff: number;
}

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  destinationCountry: CountryCode | 'any';
  fields: FieldId[] | 'any';
  nationalities: HomeCountryCode[] | 'any';
  coverageType: 'full' | 'partial' | 'stipend';
  percentTuition?: number;
  amount?: number;
  currency?: CurrencyCode;
  stipendMonthly?: number;
  deadline: string;
  eligibilityNote: string;
  /** Official page of the provider — where the student actually applies. */
  link?: string;
}

export interface Attraction {
  id: string;
  institutionId: string;
  name: string;
  type: AttractionType;
  distanceMinutes: number;
  description: string;
  image: string;
  tips: string[];
}

export interface AmbassadorPost {
  id: string;
  text: string;
  image: string;
  likes: number;
  date: string;
}

export interface Ambassador {
  id: string;
  name: string;
  homeCountry: HomeCountryCode;
  institutionId: string;
  courseName: string;
  year: number;
  bio: string;
  avatar: string;
  posts: AmbassadorPost[];
}

export interface IntakeGroup {
  id: string;
  institutionId: string;
  intake: string;
  name: string;
  members: number;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}

export interface Coursemate {
  id: string;
  name: string;
  homeCountry: HomeCountryCode;
  institutionId: string;
  courseName: string;
  intake: string;
  avatar: string;
  /** Planned arrival date for travel-buddy matching. */
  arrivalDate?: string;
  /** Opted in to coordinating travel with coursemates. */
  travelOptIn?: boolean;
  /** Mini-profile shown before connecting. */
  age?: number;
  /** What they hope to find here — keys into community.looking_* strings. */
  lookingFor?: string[];
}

export interface CommunityEvent {
  id: string;
  title: string;
  city: string;
  country: CountryCode;
  date: string;
  venue: string;
  sponsored: boolean;
  kind: 'meetup' | 'expo';
  image: string;
  description: string;
}

export interface WorkRights {
  country: CountryCode;
  hoursPerWeekTerm: number;
  breakRule: string;
  note: string;
}

export interface PredepartureItem {
  id: string;
  label: string;
  category: 'visa' | 'money' | 'insurance' | 'housing' | 'sim' | 'banking' | 'other';
}

// ----------------------------------------------------------------- reviews

export interface SchoolReview {
  author: string;
  homeCountry: HomeCountryCode;
  stars: number;
  text: string;
  date: string;
  /** Campus thumbnails from the school's verified photo pool (sample data). */
  photos?: string[];
}

export interface SchoolReviews {
  /** Indicative average rating (sample data; live Google feed at launch). */
  rating: number;
  count: number;
  reviews: SchoolReview[];
}

// ------------------------------------------------------------------ safety

export interface EmergencyLines {
  police: string;
  ambulance: string;
  fire: string;
}

export interface EmbassyEntry {
  name: string;
  city: string;
  address: string;
  phone: string;
  afterHours?: string;
}

export interface SafetyBundle {
  emergencyLines: Record<CountryCode, EmergencyLines>;
  /** embassies[destination][nationality]; null = studying in home country. */
  embassies: Record<CountryCode, Record<HomeCountryCode, EmbassyEntry | null>>;
}

// ---------- Student-side models (stores) ----------

export interface SubjectGrade {
  subject: string;
  grade: string;
}

export interface GradesInput {
  subjects?: SubjectGrade[];
  total?: number;
}

export type EnglishTest = 'ielts' | 'toefl' | 'none';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface StudentProfile {
  name: string;
  homeCountry: HomeCountryCode;
  nationality: HomeCountryCode;
  qualification: QualificationId;
  intakeYear: number;
  grades: GradesInput;
  english: { test: EnglishTest; score?: number };
  /** Explicit display currency; defaults to the home country's currency. */
  currency?: CurrencyCode;
  /** Parent/guardian reachable in an emergency — required before the first application. */
  emergencyContact?: EmergencyContact;
}

export type ApplicationStatus =
  | 'submitted' | 'under_review' | 'conditional_offer' | 'offer' | 'accepted' | 'coe_issued';

export const APPLICATION_TIMELINE: ApplicationStatus[] = [
  'submitted', 'under_review', 'conditional_offer', 'offer', 'accepted', 'coe_issued',
];

export interface Application {
  id: string;
  courseId: string;
  status: ApplicationStatus;
  /** ISO year-month of the intake applied for, e.g. "2027-02". */
  intake?: string;
  createdAt: string;
  updatedAt: string;
  history: { status: ApplicationStatus; date: string }[];
  feeWaived: boolean;
  scholarshipId?: string;
  depositPaid?: boolean;
  pickup?: { name: string; phone: string; flight: string };
}

export interface VaultDocument {
  id: string;
  type: DocumentTypeId;
  name: string;
  uri: string;
  uploadedAt: string;
  expiryDate?: string;
}

export type MatchStatus = 'eligible' | 'borderline' | 'pathway';

export interface MatchReason {
  key: string;
  params?: Record<string, string | number>;
}

export interface MatchResult {
  course: Course;
  institution: Institution;
  status: MatchStatus;
  academicOk: boolean;
  academicBorderline: boolean;
  englishOk: boolean;
  englishMissing: boolean;
  isLocal: boolean;
  score: number;
  requirement: EntryRequirement;
  reasons: MatchReason[];
  recognizedAtHome: boolean;
}
