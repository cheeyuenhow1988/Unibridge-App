/**
 * UniBridge mock-data generator.
 *
 * Deterministic (seeded PRNG, fixed reference date) so the emitted JSON under
 * src/data/ is stable across runs. All institutions are fictional; cities and
 * attractions are real for flavour. Run with: npm run generate-data
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'data');
mkdirSync(OUT, { recursive: true });

// Extra facility/surroundings photos harvested from each school's Commons
// category (scripts/harvest pipeline); merged after the curated hero shot.
let PHOTO_EXTRA = {};
try {
  PHOTO_EXTRA = JSON.parse(readFileSync(join(HERE, 'inst-photo-extra.json'), 'utf8'));
} catch {
  /* optional file — heroes alone are fine */
}

// Fixed "today" for intake/deadline computation — keeps output deterministic.
const NOW = { year: 2026, month: 8 };

let seed = 42;
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const jitter = (n, pct) => Math.round(n * (1 + (rand() * 2 - 1) * pct));
const round50 = (n) => Math.round(n / 50) * 50;

// ---------------------------------------------------------------- countries
const COUNTRIES = {
  AU: { currency: 'AUD', intakeMonths: [2, 7], visaFee: 1600, insuranceYearly: 650, enrolFee: 500, appFee: 100 },
  MY: { currency: 'MYR', intakeMonths: [1, 5, 9], visaFee: 2000, insuranceYearly: 600, enrolFee: 1000, appFee: 300 },
  TW: { currency: 'TWD', intakeMonths: [2, 9], visaFee: 3000, insuranceYearly: 10000, enrolFee: 5000, appFee: 1500 },
  GB: { currency: 'GBP', intakeMonths: [1, 9], visaFee: 490, insuranceYearly: 776, enrolFee: 200, appFee: 25 },
  SG: { currency: 'SGD', intakeMonths: [1, 8], visaFee: 90, insuranceYearly: 500, enrolFee: 400, appFee: 100 },
  NZ: { currency: 'NZD', intakeMonths: [2, 7], visaFee: 750, insuranceYearly: 700, enrolFee: 300, appFee: 75 },
  RU: { currency: 'RUB', intakeMonths: [2, 9], visaFee: 6000, insuranceYearly: 15000, enrolFee: 8000, appFee: 3000 },
  US: { currency: 'USD', intakeMonths: [1, 8], visaFee: 535, insuranceYearly: 2000, enrolFee: 400, appFee: 80 },
  CA: { currency: 'CAD', intakeMonths: [1, 9], visaFee: 235, insuranceYearly: 900, enrolFee: 350, appFee: 130 },
  CN: { currency: 'CNY', intakeMonths: [3, 9], visaFee: 800, insuranceYearly: 800, enrolFee: 400, appFee: 600 },
};

const FX = {
  base: 'USD',
  asOf: '2026-07-15',
  rates: {
    USD: 1, AUD: 1.53, MYR: 4.42, TWD: 31.9, GBP: 0.79, SGD: 1.34,
    NZD: 1.68, RUB: 92.5, IDR: 15850, VND: 25300, CNY: 7.18, CAD: 1.36,
    MMK: 4500, KRW: 1360, JPY: 152,
  },
};

// ------------------------------------------------------------ qualifications
const QUALIFICATIONS = [
  {
    id: 'spm', name: 'SPM', region: 'Malaysia', mode: 'subjects', direction: 'higher',
    unit: 'credits', subjectCount: 6, maxSubjects: 10, aggregator: 'credits', creditMinPoints: 3,
    grades: [['A+', 9], ['A', 8], ['A-', 7], ['B+', 6], ['B', 5], ['C+', 4], ['C', 3], ['D', 2], ['E', 1], ['G', 0]],
    borderlineDelta: 1,
    subjectOptions: ['Bahasa Melayu', 'English', 'Mathematics', 'Additional Mathematics', 'Physics', 'Chemistry', 'Biology', 'Sejarah', 'Ekonomi', 'Prinsip Perakaunan', 'Pendidikan Seni'],
  },
  {
    id: 'stpm', name: 'STPM', region: 'Malaysia', mode: 'subjects', direction: 'higher',
    unit: 'cgpa', subjectCount: 4, maxSubjects: 5, aggregator: 'mean', bestOf: 3,
    grades: [['A', 4.0], ['A-', 3.67], ['B+', 3.33], ['B', 3.0], ['B-', 2.67], ['C+', 2.33], ['C', 2.0], ['C-', 1.67], ['D+', 1.33], ['D', 1.0], ['F', 0]],
    borderlineDelta: 0.34,
    subjectOptions: ['Pengajian Am', 'Mathematics (T)', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Business Studies', 'Accounting', 'Sejarah', 'Geografi'],
  },
  {
    id: 'uec', name: 'UEC', region: 'Malaysia (Chinese independent schools)', mode: 'subjects', direction: 'lower',
    unit: 'points', subjectCount: 5, maxSubjects: 9, aggregator: 'sum', bestOf: 5,
    grades: [['A1', 1], ['A2', 2], ['B3', 3], ['B4', 4], ['B5', 5], ['B6', 6], ['C7', 7], ['C8', 8]],
    borderlineDelta: 2,
    subjectOptions: ['Chinese', 'English', 'Mathematics', 'Advanced Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Bookkeeping & Accounts'],
  },
  {
    id: 'alevels', name: 'A-Levels', region: 'UK / International', mode: 'subjects', direction: 'higher',
    unit: 'points', subjectCount: 3, maxSubjects: 4, aggregator: 'sum', bestOf: 3,
    grades: [['A*', 6], ['A', 5], ['B', 4], ['C', 3], ['D', 2], ['E', 1]],
    borderlineDelta: 2,
    subjectOptions: ['Mathematics', 'Further Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Business', 'Computer Science', 'History', 'Geography', 'English Literature', 'Psychology', 'Art & Design', 'Accounting'],
  },
  {
    id: 'ib', name: 'IB Diploma', region: 'International', mode: 'total', direction: 'higher',
    unit: 'points', min: 24, max: 45, decimals: 0, borderlineDelta: 2,
  },
  {
    id: 'hkdse', name: 'HKDSE', region: 'Hong Kong', mode: 'subjects', direction: 'higher',
    unit: 'points', subjectCount: 5, maxSubjects: 7, aggregator: 'sum', bestOf: 5,
    grades: [['5**', 7], ['5*', 6], ['5', 5], ['4', 4], ['3', 3], ['2', 2], ['1', 1]],
    borderlineDelta: 2,
    subjectOptions: ['Chinese Language', 'English Language', 'Mathematics', 'Citizenship & Social Development', 'Physics', 'Chemistry', 'Biology', 'Economics', 'BAFS', 'ICT', 'Geography', 'History'],
  },
  {
    id: 'gsat', name: 'Taiwan GSAT', region: 'Taiwan', mode: 'total', direction: 'higher',
    unit: 'points', min: 20, max: 60, decimals: 0, borderlineDelta: 4,
  },
  {
    id: 'atar', name: 'ATAR', region: 'Australia', mode: 'total', direction: 'higher',
    unit: 'rank', min: 30, max: 99.95, decimals: 2, borderlineDelta: 5,
  },
  {
    id: 'gpa', name: 'High School GPA', region: 'Generic (4.0 scale)', mode: 'total', direction: 'higher',
    unit: 'gpa', min: 0, max: 4, decimals: 2, borderlineDelta: 0.25,
  },
  {
    id: 'sma', name: 'SMA / Ijazah', region: 'Indonesia', mode: 'total', direction: 'higher',
    unit: 'average (0-100)', min: 0, max: 100, decimals: 0, borderlineDelta: 3,
  },
  {
    id: 'thpt', name: 'THPT GPA', region: 'Vietnam', mode: 'total', direction: 'higher',
    unit: 'GPA (0-10)', min: 0, max: 10, decimals: 1, borderlineDelta: 0.3,
  },
  {
    id: 'matric', name: 'Matriculation', region: 'Myanmar', mode: 'total', direction: 'higher',
    unit: 'marks (0-600)', min: 0, max: 600, decimals: 0, borderlineDelta: 20,
  },
  {
    id: 'krgpa', name: 'High School GPA (내신)', region: 'South Korea (4.5 scale)', mode: 'total', direction: 'higher',
    unit: 'GPA (0-4.5)', min: 0, max: 4.5, decimals: 1, borderlineDelta: 0.2,
  },
  {
    id: 'jpgpa', name: 'Hyōtei Heikin 評定平均', region: 'Japan (5.0 scale)', mode: 'total', direction: 'higher',
    unit: 'average (0-5.0)', min: 0, max: 5, decimals: 1, borderlineDelta: 0.2,
  },
].map((q) => ({ ...q, grades: q.grades?.map(([label, points]) => ({ label, points })) }));

// Thresholds per band (index 0 = pathway programmes, 1–5 = selectivity).
const REQ_BANDS = {
  spm: { t: [3, 3, 4, 5, 6, 7], d: (n) => `${n} credits` },
  stpm: { t: [2.0, 2.0, 2.33, 2.67, 3.0, 3.33], d: (n) => `CGPA ${n.toFixed(2)} (best 3)` },
  uec: { t: [24, 20, 16, 12, 10, 8], d: (n) => `max ${n} points (best 5)` },
  alevels: { t: [6, 7, 9, 11, 13, 15], disp: ['DDD', 'CDD', 'CCC', 'BBC', 'ABB', 'AAA'] },
  ib: { t: [24, 24, 26, 29, 32, 36], d: (n) => `${n} points` },
  hkdse: { t: [8, 10, 12, 15, 18, 21], d: (n) => `best 5 total ${n}` },
  gsat: { t: [26, 30, 36, 42, 48, 53], d: (n) => `${n} / 60` },
  atar: { t: [50, 55, 65, 75, 85, 93], d: (n) => `ATAR ${n}` },
  gpa: { t: [2.0, 2.3, 2.6, 3.0, 3.3, 3.6], d: (n) => `GPA ${n.toFixed(1)} / 4.0` },
  sma: { t: [65, 70, 75, 80, 85, 90], d: (n) => `SMA avg ${n}` },
  thpt: { t: [6.0, 6.5, 7.0, 7.5, 8.0, 8.6], d: (n) => `THPT ${n.toFixed(1)} / 10` },
  matric: { t: [280, 300, 360, 420, 480, 520], d: (n) => `${n} / 600 marks` },
  krgpa: { t: [2.3, 2.5, 3.0, 3.4, 3.8, 4.2], d: (n) => `GPA ${n.toFixed(1)} / 4.5` },
  jpgpa: { t: [2.8, 3.0, 3.4, 3.8, 4.2, 4.6], d: (n) => `評定 ${n.toFixed(1)} / 5.0` },
};

function requirementsForBand(band) {
  const out = {};
  for (const [qid, cfg] of Object.entries(REQ_BANDS)) {
    const min = cfg.t[band];
    out[qid] = { min, display: cfg.disp ? cfg.disp[band] : cfg.d(min) };
  }
  return out;
}

// ------------------------------------------------------------------- tuition
const TUITION = {
  AU: { business: 34000, engineering: 38000, it: 37000, health: 42000, hospitality: 28000, design: 30000, law: 40000, science: 36000, media: 33000, architecture: 39000, education: 30000, med: 68000 },
  MY: { business: 26000, engineering: 32000, it: 30000, health: 42000, hospitality: 24000, design: 26000, law: 33000, science: 30000, media: 26000, architecture: 33000, education: 24000, med: 110000 },
  TW: { business: 110000, engineering: 130000, it: 125000, health: 150000, hospitality: 100000, design: 105000, law: 120000, science: 120000, media: 105000, architecture: 130000, education: 100000, med: 220000 },
  GB: { business: 16500, engineering: 22000, it: 21000, health: 25000, hospitality: 14500, design: 16500, law: 19000, science: 21000, media: 17500, architecture: 23000, education: 16000, med: 42000 },
  SG: { business: 32000, engineering: 36000, it: 35000, health: 45000, hospitality: 26000, design: 28000, law: 38000, science: 34000, media: 30000, architecture: 37000, education: 27000, med: 78000 },
  NZ: { business: 30000, engineering: 36000, it: 34000, health: 38000, hospitality: 26000, design: 28000, law: 33000, science: 33000, media: 29000, architecture: 36000, education: 28000, med: 62000 },
  RU: { business: 320000, engineering: 380000, it: 360000, health: 420000, hospitality: 260000, design: 280000, law: 340000, science: 350000, media: 300000, architecture: 380000, education: 260000, med: 620000 },
  US: { business: 45000, engineering: 48000, it: 47000, health: 50000, hospitality: 35000, design: 40000, law: 48000, science: 45000, media: 40000, architecture: 46000, education: 36000, med: 70000 },
  CA: { business: 40000, engineering: 48000, it: 46000, health: 50000, hospitality: 32000, design: 36000, law: 45000, science: 42000, media: 36000, architecture: 45000, education: 34000, med: 90000 },
  CN: { business: 26000, engineering: 30000, it: 29000, health: 34000, hospitality: 22000, design: 24000, law: 28000, science: 27000, media: 24000, architecture: 29000, education: 21000, med: 45000 },
};

const COURSE_NAMES = {
  business: ['Bachelor of Business Administration', 'Bachelor of Commerce (Finance)', 'Bachelor of International Business', 'Bachelor of Accounting', 'Bachelor of Marketing', 'Bachelor of Human Resource Management', 'Bachelor of Banking & Finance', 'Bachelor of Supply Chain & Logistics', 'Bachelor of Entrepreneurship', 'Bachelor of Economics'],
  engineering: ['Bachelor of Engineering (Civil)', 'Bachelor of Engineering (Mechanical)', 'Bachelor of Engineering (Electrical)', 'Bachelor of Engineering (Mechatronics)', 'Bachelor of Engineering (Chemical)', 'Bachelor of Engineering (Aerospace)', 'Bachelor of Engineering (Biomedical)', 'Bachelor of Engineering (Environmental)'],
  it: ['Bachelor of Computer Science', 'Bachelor of Software Engineering', 'Bachelor of IT (Data Analytics)', 'Bachelor of Cybersecurity', 'Bachelor of Artificial Intelligence', 'Bachelor of Game Development', 'Bachelor of Information Systems', 'Bachelor of Networking & Cloud Computing'],
  health: ['Bachelor of Nursing', 'Bachelor of Medicine, Bachelor of Surgery (MBBS)', 'Bachelor of Pharmacy', 'Bachelor of Biomedical Science', 'Bachelor of Physiotherapy', 'Bachelor of Psychology', 'Bachelor of Nutrition & Dietetics', 'Bachelor of Dental Surgery'],
  hospitality: ['Bachelor of Hospitality Management', 'Bachelor of Culinary Arts Management', 'Bachelor of Tourism & Event Management', 'Bachelor of International Hotel & Resort Management', 'Bachelor of Aviation Management', 'Bachelor of Baking & Pastry Arts', 'Bachelor of Food Business Management'],
  design: ['Bachelor of Design (Visual Communication)', 'Bachelor of Interior Architecture', 'Bachelor of Fashion Design', 'Bachelor of Digital Media Design', 'Bachelor of Graphic Design', 'Bachelor of Industrial & Product Design', 'Bachelor of Animation & Visual Effects'],
  law: ['Bachelor of Laws (LLB)', 'Bachelor of Criminology & Justice', 'Bachelor of Legal Studies', 'Bachelor of Commercial Law'],
  science: ['Bachelor of Science (Mathematics & Statistics)', 'Bachelor of Environmental Science', 'Bachelor of Science (Physics)', 'Bachelor of Data Science', 'Bachelor of Biotechnology', 'Bachelor of Actuarial Science', 'Bachelor of Chemistry'],
  media: ['Bachelor of Communication & Media', 'Bachelor of Journalism', 'Bachelor of Film & Television', 'Bachelor of Advertising & Brand Management', 'Bachelor of Public Relations', 'Bachelor of Broadcasting & Digital Media'],
  architecture: ['Bachelor of Architecture', 'Bachelor of Urban & Regional Planning', 'Bachelor of Quantity Surveying', 'Bachelor of Construction Management'],
  education: ['Bachelor of Education (Primary)', 'Bachelor of Early Childhood Education', 'Bachelor of Education (TESL)', 'Bachelor of Sports Science & Physical Education', 'Bachelor of Special Education'],
};
const PATHWAY_NAMES = {
  foundation: { business: 'Foundation in Business', it: 'Foundation in Computing', engineering: 'Foundation in Engineering & Science', design: 'Foundation in Art & Design', health: 'Foundation in Health Science', law: 'Foundation in Law & Social Science', hospitality: 'Foundation in Hospitality & Culinary Arts' },
  diploma: { it: 'Diploma in Information Technology', business: 'Diploma in Business Management', hospitality: 'Diploma in Culinary Arts & Hotel Operations', engineering: 'Diploma in Engineering Technology', media: 'Diploma in Media & Communication' },
};

const ENGLISH_BY_FIELD = { business: 6.0, engineering: 6.0, it: 6.0, health: 6.5, hospitality: 5.5, design: 6.0, law: 6.5, science: 6.0, media: 6.5, architecture: 6.0, education: 6.5 };
const TOEFL = { 5.0: 45, 5.5: 55, 6.0: 72, 6.5: 85, 7.0: 95 };

// ------------------------------------------------------------- institutions
// Real institutions (names, cities, official websites). All figures shown in
// the app (tuition, requirements, recognition) remain INDICATIVE mock data.
// tuple: [id, name, short, country, city, type, verifiedPartner, tagline, founded, students, website, courseSpecs]
// spec per course: [field, nameIdx, level(b|f|d), selectivity]
const INSTITUTIONS = [
  ['au-monash', 'Monash University', 'Monash', 'AU', 'Melbourne', 'university', true, 'Public research university in Melbourne', 1958, 86000, 'https://www.monash.edu',
    [['business', 0, 'b', 3], ['health', 1, 'b', 5], ['it', 0, 'b', 4], ['education', 0, 'b', 3], ['business', 0, 'f', 0]]],
  ['au-sydney', 'University of Sydney', 'USyd', 'AU', 'Sydney', 'university', false, "Australia's first university, established 1850", 1850, 70000, 'https://www.sydney.edu.au',
    [['law', 0, 'b', 5], ['business', 1, 'b', 4], ['media', 0, 'b', 4]]],
  ['au-uq', 'University of Queensland', 'UQ', 'AU', 'Brisbane', 'university', false, 'Research-intensive university in Brisbane', 1909, 55000, 'https://www.uq.edu.au',
    [['engineering', 1, 'b', 4], ['science', 1, 'b', 3], ['hospitality', 2, 'b', 3]]],
  ['au-unsw', 'UNSW Sydney', 'UNSW', 'AU', 'Sydney', 'university', true, 'Engineering and business powerhouse in Sydney', 1949, 65000, 'https://www.unsw.edu.au',
    [['engineering', 0, 'b', 4], ['it', 3, 'b', 4], ['architecture', 0, 'b', 4], ['engineering', 0, 'f', 0]]],
  ['au-unimelb', 'University of Melbourne', 'UniMelb', 'AU', 'Melbourne', 'university', false, "Australia's top-ranked university", 1853, 54000, 'https://www.unimelb.edu.au',
    [['science', 0, 'b', 5], ['design', 0, 'b', 4], ['law', 0, 'b', 5]]],
  ['au-rmit', 'RMIT University', 'RMIT', 'AU', 'Melbourne', 'university', true, 'Technology and design university in Melbourne', 1887, 87000, 'https://www.rmit.edu.au',
    [['design', 3, 'b', 3], ['it', 1, 'b', 3], ['media', 2, 'b', 3], ['it', 0, 'd', 0]]],

  ['my-um', 'Universiti Malaya', 'UM', 'MY', 'Kuala Lumpur', 'university', false, "Malaysia's oldest research university", 1905, 27000, 'https://um.edu.my',
    [['health', 1, 'b', 5], ['law', 0, 'b', 4], ['science', 0, 'b', 3]]],
  ['my-taylors', "Taylor's University", "Taylor's", 'MY', 'Kuala Lumpur', 'university', true, 'Leading private university for hospitality and business', 1969, 12000, 'https://university.taylors.edu.my',
    [['hospitality', 0, 'b', 3], ['business', 0, 'b', 3], ['design', 0, 'b', 3], ['business', 0, 'f', 0]]],
  ['my-sunway', 'Sunway University', 'Sunway', 'MY', 'Kuala Lumpur', 'university', true, 'Private university in Sunway City', 1987, 10000, 'https://sunwayuniversity.edu.my',
    [['business', 2, 'b', 3], ['it', 2, 'b', 3], ['hospitality', 1, 'b', 2], ['it', 0, 'd', 0]]],
  ['my-mmu', 'Multimedia University', 'MMU', 'MY', 'Cyberjaya', 'university', true, "Malaysia's pioneer digital-technology university", 1996, 20000, 'https://www.mmu.edu.my',
    [['it', 1, 'b', 3], ['media', 2, 'b', 3], ['engineering', 3, 'b', 3]]],
  ['my-usm', 'Universiti Sains Malaysia', 'USM', 'MY', 'Penang', 'university', false, 'APEX research university in Penang', 1969, 30000, 'https://www.usm.my',
    [['science', 1, 'b', 3], ['health', 2, 'b', 4], ['education', 0, 'b', 2]]],
  ['my-utm', 'Universiti Teknologi Malaysia', 'UTM', 'MY', 'Johor Bahru', 'university', false, 'Engineering-focused university in Johor', 1972, 25000, 'https://www.utm.my',
    [['engineering', 0, 'b', 3], ['architecture', 0, 'b', 3], ['it', 0, 'b', 3]]],

  ['tw-ntu', 'National Taiwan University', 'NTU', 'TW', 'Taipei', 'university', true, "Taiwan's most prestigious university", 1928, 32000, 'https://www.ntu.edu.tw',
    [['health', 1, 'b', 5], ['it', 0, 'b', 5], ['law', 0, 'b', 4], ['business', 1, 'b', 4]]],
  ['tw-nthu', 'National Tsing Hua University', 'NTHU', 'TW', 'Hsinchu', 'university', false, 'Elite STEM university beside the science park', 1911, 16000, 'https://www.nthu.edu.tw',
    [['engineering', 3, 'b', 4], ['science', 2, 'b', 4], ['it', 4, 'b', 4]]],
  ['tw-fcu', 'Feng Chia University', 'FCU', 'TW', 'Taichung', 'university', true, 'Private comprehensive university in Taichung', 1961, 20000, 'https://www.fcu.edu.tw',
    [['business', 0, 'b', 2], ['architecture', 1, 'b', 2], ['hospitality', 0, 'b', 2], ['it', 0, 'd', 0]]],
  ['tw-nsysu', 'National Sun Yat-sen University', 'NSYSU', 'TW', 'Kaohsiung', 'university', false, 'Harbourside national university', 1980, 9500, 'https://www.nsysu.edu.tw',
    [['business', 1, 'b', 3], ['engineering', 2, 'b', 3], ['media', 0, 'b', 3]]],

  ['gb-manchester', 'University of Manchester', 'Manchester', 'GB', 'Manchester', 'university', true, 'Russell Group university in the north', 1824, 46000, 'https://www.manchester.ac.uk',
    [['it', 2, 'b', 4], ['engineering', 1, 'b', 4], ['business', 0, 'b', 4], ['business', 0, 'f', 0]]],
  ['gb-leeds', 'University of Leeds', 'Leeds', 'GB', 'Leeds', 'university', true, 'Campus university in a student city', 1904, 39000, 'https://www.leeds.ac.uk',
    [['media', 1, 'b', 3], ['business', 3, 'b', 3], ['science', 1, 'b', 3]]],
  ['gb-birmingham', 'University of Birmingham', 'Birmingham', 'GB', 'Birmingham', 'university', false, "England's first civic university", 1900, 38000, 'https://www.birmingham.ac.uk',
    [['engineering', 0, 'b', 3], ['education', 0, 'b', 3], ['law', 2, 'b', 3]]],
  ['gb-ucl', 'UCL', 'UCL', 'GB', 'London', 'university', false, 'Multidisciplinary research university in Bloomsbury', 1826, 51000, 'https://www.ucl.ac.uk',
    [['health', 1, 'b', 5], ['architecture', 0, 'b', 5], ['science', 0, 'b', 5]]],
  ['gb-kcl', "King's College London", 'KCL', 'GB', 'London', 'university', false, 'Historic university on the Thames', 1829, 41000, 'https://www.kcl.ac.uk',
    [['law', 0, 'b', 5], ['health', 3, 'b', 4], ['media', 0, 'b', 4]]],
  ['gb-edinburgh', 'University of Edinburgh', 'Edinburgh', 'GB', 'Edinburgh', 'university', false, "Scotland's ancient global university", 1583, 45000, 'https://www.ed.ac.uk',
    [['it', 0, 'b', 5], ['science', 2, 'b', 4], ['design', 0, 'b', 4]]],

  ['sg-nus', 'National University of Singapore', 'NUS', 'SG', 'Singapore', 'university', true, "Asia's leading global university", 1905, 38000, 'https://nus.edu.sg',
    [['business', 1, 'b', 5], ['it', 0, 'b', 5], ['law', 0, 'b', 5], ['science', 3, 'b', 4]]],
  ['sg-ntusg', 'Nanyang Technological University', 'NTU Singapore', 'SG', 'Singapore', 'university', false, 'Young, research-intensive and green', 1991, 33000, 'https://www.ntu.edu.sg',
    [['engineering', 2, 'b', 5], ['media', 0, 'b', 4], ['education', 1, 'b', 4]]],
  ['sg-smu', 'Singapore Management University', 'SMU', 'SG', 'Singapore', 'university', false, 'City-campus university for business and law', 2000, 10000, 'https://www.smu.edu.sg',
    [['business', 2, 'b', 4], ['law', 2, 'b', 4], ['it', 2, 'b', 4]]],
  ['sg-sim', 'Singapore Institute of Management', 'SIM', 'SG', 'Singapore', 'institute', true, 'Private institute with global degree pathways', 1964, 16000, 'https://www.sim.edu.sg',
    [['business', 0, 'b', 2], ['it', 1, 'b', 2], ['business', 0, 'd', 0], ['business', 0, 'f', 0]]],

  ['nz-auckland', 'University of Auckland', 'Auckland', 'NZ', 'Auckland', 'university', true, "New Zealand's largest university", 1883, 40000, 'https://www.auckland.ac.nz',
    [['business', 0, 'b', 4], ['health', 0, 'b', 3], ['it', 0, 'b', 4], ['business', 0, 'f', 0]]],
  ['nz-vuw', 'Victoria University of Wellington', 'Vic Wellington', 'NZ', 'Wellington', 'university', false, 'Capital-city university strong in law and design', 1897, 22000, 'https://www.wgtn.ac.nz',
    [['design', 0, 'b', 3], ['law', 0, 'b', 3], ['media', 1, 'b', 3]]],
  ['nz-canterbury', 'University of Canterbury', 'UC', 'NZ', 'Christchurch', 'university', false, 'Engineering heritage since 1873', 1873, 17000, 'https://www.canterbury.ac.nz',
    [['engineering', 0, 'b', 3], ['engineering', 4, 'b', 3], ['science', 0, 'b', 2]]],
  ['nz-otago', 'University of Otago', 'Otago', 'NZ', 'Dunedin', 'university', false, "New Zealand's first university", 1869, 21000, 'https://www.otago.ac.nz',
    [['health', 2, 'b', 4], ['science', 1, 'b', 2], ['hospitality', 0, 'b', 1]]],

  ['ru-msu', 'Lomonosov Moscow State University', 'MSU', 'RU', 'Moscow', 'university', true, "Russia's flagship university", 1755, 40000, 'https://www.msu.ru',
    [['health', 1, 'b', 4], ['science', 0, 'b', 4], ['it', 0, 'b', 3]]],
  ['ru-itmo', 'ITMO University', 'ITMO', 'RU', 'Saint Petersburg', 'university', true, 'IT-first university famed for programming wins', 1900, 14000, 'https://itmo.ru',
    [['it', 1, 'b', 3], ['it', 4, 'b', 3], ['engineering', 2, 'b', 3]]],
  ['ru-kfu', 'Kazan Federal University', 'KFU', 'RU', 'Kazan', 'university', false, "One of Russia's oldest universities", 1804, 45000, 'https://kpfu.ru',
    [['it', 3, 'b', 2], ['business', 0, 'b', 2], ['education', 0, 'b', 2], ['it', 0, 'd', 0]]],
  ['ru-nsu', 'Novosibirsk State University', 'NSU', 'RU', 'Novosibirsk', 'university', false, 'Science-city university in Akademgorodok', 1958, 8000, 'https://www.nsu.ru',
    [['health', 1, 'b', 4], ['science', 2, 'b', 3], ['engineering', 1, 'b', 2]]],

  ['us-mit', 'Massachusetts Institute of Technology', 'MIT', 'US', 'Boston', 'institute', false, 'World-leading institute for science and engineering', 1861, 11900, 'https://www.mit.edu',
    [['engineering', 5, 'b', 5], ['it', 0, 'b', 5], ['science', 0, 'b', 5], ['architecture', 0, 'b', 5]]],
  ['us-bu', 'Boston University', 'BU', 'US', 'Boston', 'university', true, 'Private research university on the Charles River', 1839, 37000, 'https://www.bu.edu',
    [['business', 4, 'b', 4], ['media', 0, 'b', 4], ['health', 5, 'b', 4], ['business', 0, 'f', 0]]],
  ['us-nyu', 'New York University', 'NYU', 'US', 'New York', 'university', true, 'Global university in the heart of Manhattan', 1831, 59000, 'https://www.nyu.edu',
    [['business', 6, 'b', 5], ['media', 2, 'b', 4], ['design', 3, 'b', 4], ['law', 2, 'b', 4]]],
  ['us-ucla', 'University of California, Los Angeles', 'UCLA', 'US', 'Los Angeles', 'university', false, 'Top public university in sunny Los Angeles', 1919, 46000, 'https://www.ucla.edu',
    [['science', 3, 'b', 5], ['media', 3, 'b', 4], ['engineering', 2, 'b', 5]]],
  ['us-uchicago', 'University of Chicago', 'UChicago', 'US', 'Chicago', 'university', false, 'Rigorous research university on the South Side', 1890, 18000, 'https://www.uchicago.edu',
    [['business', 9, 'b', 5], ['science', 0, 'b', 5], ['law', 2, 'b', 5]]],
  ['us-smc', 'Santa Monica College', 'SMC', 'US', 'Los Angeles', 'college', false, 'California community college with top university-transfer rates', 1929, 26000, 'https://www.smc.edu',
    [['business', 0, 'd', 0], ['it', 0, 'd', 0], ['media', 0, 'd', 0]]],
  ['us-ice', 'Institute of Culinary Education', 'ICE', 'US', 'New York', 'institute', false, 'Award-winning culinary school in Lower Manhattan', 1975, 3000, 'https://www.ice.edu',
    [['hospitality', 0, 'd', 0], ['hospitality', 0, 'f', 0]]],

  ['ca-utoronto', 'University of Toronto', 'UofT', 'CA', 'Toronto', 'university', true, "Canada's top-ranked research university", 1827, 97000, 'https://www.utoronto.ca',
    [['business', 1, 'b', 5], ['it', 0, 'b', 5], ['health', 5, 'b', 4], ['business', 0, 'f', 0]]],
  ['ca-ubc', 'University of British Columbia', 'UBC', 'CA', 'Vancouver', 'university', false, 'Pacific-rim research university in Vancouver', 1908, 66000, 'https://www.ubc.ca',
    [['science', 1, 'b', 4], ['engineering', 7, 'b', 4], ['media', 0, 'b', 4]]],
  ['ca-mcgill', 'McGill University', 'McGill', 'CA', 'Montreal', 'university', true, 'Historic English-language university in Montreal', 1821, 39000, 'https://www.mcgill.ca',
    [['health', 3, 'b', 5], ['science', 6, 'b', 4], ['business', 0, 'b', 4]]],
  ['ca-york', 'York University', 'York U', 'CA', 'Toronto', 'university', false, 'Large comprehensive university in northern Toronto', 1959, 55000, 'https://www.yorku.ca',
    [['business', 5, 'b', 3], ['it', 6, 'b', 3], ['education', 1, 'b', 3], ['business', 0, 'd', 0]]],
  ['ca-georgebrown', 'George Brown College', 'George Brown', 'CA', 'Toronto', 'college', true, "Toronto's downtown college for culinary and creative careers", 1967, 32000, 'https://www.georgebrown.ca',
    [['hospitality', 1, 'b', 1], ['design', 4, 'b', 1], ['business', 0, 'd', 0], ['hospitality', 0, 'd', 0]]],

  ['cn-tsinghua', 'Tsinghua University', 'Tsinghua', 'CN', 'Beijing', 'university', true, "China's leading engineering and science university", 1911, 50000, 'https://www.tsinghua.edu.cn',
    [['engineering', 2, 'b', 5], ['it', 4, 'b', 5], ['architecture', 0, 'b', 5], ['business', 0, 'b', 5]]],
  ['cn-pku', 'Peking University', 'PKU', 'CN', 'Beijing', 'university', false, "China's oldest modern national university", 1898, 48000, 'https://www.pku.edu.cn',
    [['law', 0, 'b', 5], ['science', 0, 'b', 5], ['business', 9, 'b', 5]]],
  ['cn-fudan', 'Fudan University', 'Fudan', 'CN', 'Shanghai', 'university', true, 'Comprehensive research university in Shanghai', 1905, 32000, 'https://www.fudan.edu.cn',
    [['health', 1, 'b', 5], ['business', 1, 'b', 4], ['media', 0, 'b', 4], ['business', 0, 'f', 0]]],
  ['cn-sysu', 'Sun Yat-sen University', 'SYSU', 'CN', 'Guangzhou', 'university', false, 'Research university across Guangdong campuses', 1924, 66000, 'https://www.sysu.edu.cn',
    [['business', 0, 'b', 3], ['it', 1, 'b', 3], ['hospitality', 3, 'b', 3], ['it', 0, 'd', 0]]],
  ['cn-bhi', 'Beijing Hospitality Institute', 'BHI', 'CN', 'Beijing', 'institute', false, 'Swiss-style hospitality management institute', 2010, 5000, 'https://www.bhi.edu.cn',
    [['hospitality', 3, 'b', 1], ['hospitality', 1, 'b', 1], ['hospitality', 0, 'd', 0]]],

  ['au-angliss', 'William Angliss Institute', 'Angliss', 'AU', 'Melbourne', 'institute', true, 'Specialist institute for foods, tourism and hospitality', 1940, 23000, 'https://www.angliss.edu.au',
    [['hospitality', 1, 'b', 1], ['hospitality', 2, 'b', 1], ['hospitality', 0, 'd', 0], ['business', 0, 'd', 0]]],
  ['my-berjaya', 'BERJAYA University College', 'BERJAYA UC', 'MY', 'Kuala Lumpur', 'college', true, 'Culinary and hospitality specialist in the city centre', 2009, 3500, 'https://www.berjaya.edu.my',
    [['hospitality', 1, 'b', 1], ['hospitality', 3, 'b', 1], ['business', 0, 'b', 1], ['hospitality', 0, 'd', 0]]],
  ['tw-nkuht', 'National Kaohsiung University of Hospitality and Tourism', 'NKUHT', 'TW', 'Kaohsiung', 'university', false, "Taiwan's national school for hospitality and culinary arts", 1995, 8000, 'https://www.nkuht.edu.tw',
    [['hospitality', 1, 'b', 1], ['hospitality', 2, 'b', 2], ['hospitality', 0, 'd', 0]]],
  ['gb-lcb', 'Le Cordon Bleu London', 'Le Cordon Bleu', 'GB', 'London', 'institute', false, 'The famous French culinary arts institute in Bloomsbury', 1933, 1000, 'https://www.cordonbleu.edu/london',
    [['hospitality', 1, 'b', 1], ['hospitality', 0, 'd', 0]]],
  ['nz-lcb', 'Le Cordon Bleu Wellington', 'LCB Wellington', 'NZ', 'Wellington', 'institute', false, 'French culinary arts school in the capital', 2012, 400, 'https://www.cordonbleu.edu/wellington',
    [['hospitality', 1, 'b', 1], ['hospitality', 0, 'd', 0]]],
  ['sg-shatec', 'SHATEC', 'SHATEC', 'SG', 'Singapore', 'institute', false, "Singapore's hotel and culinary school built by the industry", 1983, 1200, 'https://www.shatec.sg',
    [['hospitality', 1, 'b', 1], ['hospitality', 0, 'd', 0]]],

  // Branch campuses — same brand, different country, different fees.
  ['my-monash', 'Monash University Malaysia', 'Monash MY', 'MY', 'Kuala Lumpur', 'university', true, "Monash's Malaysian campus — same degree, Malaysian fees", 1998, 10000, 'https://www.monash.edu.my',
    [['business', 0, 'b', 3], ['it', 0, 'b', 3], ['engineering', 3, 'b', 3], ['media', 0, 'b', 3]]],
  ['cn-nyush', 'NYU Shanghai', 'NYU Shanghai', 'CN', 'Shanghai', 'university', false, "NYU's degree-granting campus in Pudong", 2012, 2000, 'https://shanghai.nyu.edu',
    [['business', 1, 'b', 4], ['it', 0, 'b', 4], ['media', 0, 'b', 3]]],

  ['gb-imperial', 'Imperial College London', 'Imperial', 'GB', 'London', 'university', false, 'Science, engineering, medicine and business in South Kensington', 1907, 22000, 'https://www.imperial.ac.uk',
    [['engineering', 5, 'b', 5], ['science', 0, 'b', 5], ['it', 0, 'b', 5]]],
  ['au-uts', 'University of Technology Sydney', 'UTS', 'AU', 'Sydney', 'university', true, 'Innovation-driven tech university in central Sydney', 1988, 45000, 'https://www.uts.edu.au',
    [['it', 3, 'b', 4], ['design', 3, 'b', 3], ['business', 0, 'b', 3], ['it', 0, 'd', 0]]],
  ['my-ucsi', 'UCSI University', 'UCSI', 'MY', 'Kuala Lumpur', 'university', true, 'Private university famed for music, culinary and health sciences', 1986, 12000, 'https://www.ucsiuniversity.edu.my',
    [['hospitality', 1, 'b', 2], ['health', 2, 'b', 3], ['business', 0, 'b', 2], ['hospitality', 0, 'd', 0]]],
  ['tw-ntust', 'National Taiwan University of Science and Technology', 'Taiwan Tech', 'TW', 'Taipei', 'university', false, "Taiwan's leading technological university", 1974, 10000, 'https://www.ntust.edu.tw',
    [['engineering', 2, 'b', 3], ['design', 5, 'b', 3], ['it', 7, 'b', 3]]],
  ['sg-tp', 'Temasek Polytechnic', 'TP', 'SG', 'Singapore', 'college', false, 'Polytechnic diplomas that pathway into every Singapore university', 1990, 13000, 'https://www.tp.edu.sg',
    [['it', 0, 'd', 0], ['business', 0, 'd', 0], ['hospitality', 0, 'd', 0]]],
  ['nz-aut', 'Auckland University of Technology', 'AUT', 'NZ', 'Auckland', 'university', false, "New Zealand's newest and fastest-growing university", 2000, 29000, 'https://www.aut.ac.nz',
    [['hospitality', 0, 'b', 2], ['media', 5, 'b', 3], ['it', 1, 'b', 3], ['business', 0, 'd', 0]]],
  ['ru-hse', 'HSE University', 'HSE', 'RU', 'Moscow', 'university', false, "Russia's top school for economics and data science", 1992, 45000, 'https://www.hse.ru',
    [['business', 9, 'b', 4], ['it', 2, 'b', 4], ['media', 4, 'b', 3]]],
  ['us-columbia', 'Columbia University', 'Columbia', 'US', 'New York', 'university', false, 'Ivy League university in Upper Manhattan', 1754, 33000, 'https://www.columbia.edu',
    [['law', 2, 'b', 5], ['media', 1, 'b', 5], ['science', 0, 'b', 5]]],
  ['us-northeastern', 'Northeastern University', 'Northeastern', 'US', 'Boston', 'university', true, 'Co-op pioneer — paid work terms built into every degree', 1898, 28000, 'https://www.northeastern.edu',
    [['business', 7, 'b', 3], ['it', 6, 'b', 3], ['engineering', 6, 'b', 3], ['business', 0, 'd', 0]]],
  ['us-fit', 'Fashion Institute of Technology', 'FIT', 'US', 'New York', 'institute', false, "New York's public college of fashion and design", 1944, 8000, 'https://www.fitnyc.edu',
    [['design', 2, 'b', 2], ['design', 4, 'b', 2], ['business', 4, 'b', 2]]],
  ['us-iit', 'Illinois Institute of Technology', 'Illinois Tech', 'US', 'Chicago', 'institute', false, 'Chicago tech university on a Mies van der Rohe campus', 1890, 7000, 'https://www.iit.edu',
    [['engineering', 2, 'b', 3], ['architecture', 0, 'b', 3], ['it', 3, 'b', 3]]],
  ['ca-tmu', 'Toronto Metropolitan University', 'TMU', 'CA', 'Toronto', 'university', false, 'City-builder university on Yonge Street', 1948, 45000, 'https://www.torontomu.ca',
    [['media', 0, 'b', 3], ['business', 0, 'b', 3], ['engineering', 0, 'b', 3]]],
  ['ca-sfu', 'Simon Fraser University', 'SFU', 'CA', 'Vancouver', 'university', false, 'Mountain-top campus above metro Vancouver', 1965, 37000, 'https://www.sfu.ca',
    [['it', 2, 'b', 3], ['business', 8, 'b', 3], ['science', 3, 'b', 3]]],
  ['ca-concordia', 'Concordia University', 'Concordia', 'CA', 'Montreal', 'university', true, 'Next-generation urban university in Montreal', 1974, 50000, 'https://www.concordia.ca',
    [['business', 6, 'b', 3], ['design', 0, 'b', 3], ['it', 1, 'b', 3], ['business', 0, 'f', 0]]],
  ['ca-vcc', 'Vancouver Community College', 'VCC', 'CA', 'Vancouver', 'college', false, 'Downtown college for culinary, baking and trades', 1965, 14000, 'https://www.vcc.ca',
    [['hospitality', 0, 'd', 0], ['business', 0, 'd', 0]]],
  ['cn-sjtu', 'Shanghai Jiao Tong University', 'SJTU', 'CN', 'Shanghai', 'university', false, 'Elite C9 engineering university in Shanghai', 1896, 46000, 'https://www.sjtu.edu.cn',
    [['engineering', 1, 'b', 5], ['it', 0, 'b', 5], ['business', 1, 'b', 4]]],
  ['cn-tongji', 'Tongji University', 'Tongji', 'CN', 'Shanghai', 'university', false, 'Architecture and engineering powerhouse', 1907, 36000, 'https://www.tongji.edu.cn',
    [['architecture', 0, 'b', 4], ['engineering', 0, 'b', 4], ['design', 5, 'b', 3]]],
  ['cn-bnu', 'Beijing Normal University', 'BNU', 'CN', 'Beijing', 'university', false, "China's leading university for education", 1902, 27000, 'https://www.bnu.edu.cn',
    [['education', 0, 'b', 4], ['education', 1, 'b', 3], ['science', 0, 'b', 3]]],
  ['cn-jnu', 'Jinan University', 'JNU', 'CN', 'Guangzhou', 'university', true, 'The overseas-Chinese university — most international student body in China', 1906, 40000, 'https://www.jnu.edu.cn',
    [['business', 0, 'b', 2], ['media', 0, 'b', 2], ['health', 3, 'b', 2], ['business', 0, 'f', 0]]],

  ['au-deakin', 'Deakin University', 'Deakin', 'AU', 'Melbourne', 'university', true, 'Practical degrees with strong industry placements', 1974, 61000, 'https://www.deakin.edu.au',
    [['health', 0, 'b', 3], ['business', 5, 'b', 3], ['education', 3, 'b', 3], ['business', 0, 'd', 0]]],
  ['au-macquarie', 'Macquarie University', 'Macquarie', 'AU', 'Sydney', 'university', false, "Home of Australia's first actuarial programme", 1964, 45000, 'https://www.mq.edu.au',
    [['science', 5, 'b', 3], ['business', 6, 'b', 3], ['media', 4, 'b', 3]]],
  ['au-griffith', 'Griffith University', 'Griffith', 'AU', 'Brisbane', 'university', true, 'Hotel-school heritage and health strength in Brisbane', 1971, 55000, 'https://www.griffith.edu.au',
    [['hospitality', 2, 'b', 2], ['health', 6, 'b', 3], ['media', 5, 'b', 3], ['business', 0, 'f', 0]]],
  ['au-holmesglen', 'Holmesglen Institute', 'Holmesglen', 'AU', 'Melbourne', 'institute', false, "One of Victoria's largest TAFE institutes", 1982, 30000, 'https://holmesglen.edu.au',
    [['hospitality', 0, 'd', 0], ['business', 0, 'd', 0], ['it', 0, 'd', 0]]],
  ['my-apu', 'Asia Pacific University of Technology & Innovation', 'APU', 'MY', 'Kuala Lumpur', 'university', true, "Tech-first campus with one of Malaysia's most international student bodies", 1993, 13000, 'https://www.apu.edu.my',
    [['it', 4, 'b', 2], ['it', 3, 'b', 2], ['business', 8, 'b', 2], ['it', 0, 'd', 0]]],
  ['my-help', 'HELP University', 'HELP', 'MY', 'Kuala Lumpur', 'university', false, 'Psychology and business pioneer in KL', 1986, 8000, 'https://university.help.edu.my',
    [['health', 5, 'b', 2], ['business', 0, 'b', 2], ['law', 2, 'b', 2], ['business', 0, 'f', 0]]],
  ['my-inti', 'INTI International University', 'INTI', 'MY', 'Kuala Lumpur', 'college', false, 'Transfer pathways to partner universities worldwide', 1986, 13000, 'https://newinti.edu.my',
    [['business', 0, 'd', 0], ['it', 0, 'd', 0], ['hospitality', 0, 'd', 0]]],
  ['tw-nccu', 'National Chengchi University', 'NCCU', 'TW', 'Taipei', 'university', false, "Taiwan's home of social sciences, business and media", 1927, 16000, 'https://www.nccu.edu.tw',
    [['business', 1, 'b', 3], ['media', 0, 'b', 3], ['law', 0, 'b', 3]]],
  ['tw-tku', 'Tamkang University', 'TKU', 'TW', 'Taipei', 'university', false, 'Long-established private university by the Tamsui river', 1950, 24000, 'https://www.tku.edu.tw',
    [['business', 0, 'b', 2], ['engineering', 0, 'b', 2], ['media', 5, 'b', 2], ['it', 0, 'd', 0]]],
  ['gb-lse', 'London School of Economics', 'LSE', 'GB', 'London', 'university', false, 'The social-science powerhouse on Houghton Street', 1895, 12000, 'https://www.lse.ac.uk',
    [['business', 9, 'b', 5], ['law', 0, 'b', 5], ['science', 0, 'b', 5]]],
  ['gb-kingston', 'Kingston University', 'Kingston', 'GB', 'London', 'university', false, 'London design school with famous fashion alumni', 1899, 16000, 'https://www.kingston.ac.uk',
    [['design', 2, 'b', 2], ['design', 4, 'b', 2], ['business', 0, 'b', 2], ['business', 0, 'f', 0]]],
  ['sg-sit', 'Singapore Institute of Technology', 'SIT', 'SG', 'Singapore', 'university', false, "Singapore's university of applied learning", 2009, 12000, 'https://www.singaporetech.edu.sg',
    [['engineering', 6, 'b', 3], ['it', 7, 'b', 3], ['hospitality', 3, 'b', 2]]],
  ['sg-np', 'Ngee Ann Polytechnic', 'NP', 'SG', 'Singapore', 'college', false, 'Polytechnic diplomas with strong industry links', 1963, 14000, 'https://www.np.edu.sg',
    [['business', 0, 'd', 0], ['media', 0, 'd', 0], ['it', 0, 'd', 0]]],
  ['nz-massey', 'Massey University', 'Massey', 'NZ', 'Wellington', 'university', false, 'Design, agriculture and distance-learning pioneer', 1927, 27000, 'https://www.massey.ac.nz',
    [['design', 0, 'b', 3], ['business', 0, 'b', 2], ['science', 4, 'b', 2], ['business', 0, 'd', 0]]],
  ['nz-lincoln', 'Lincoln University', 'Lincoln', 'NZ', 'Christchurch', 'university', false, "New Zealand's specialist land-based university", 1878, 3500, 'https://www.lincoln.ac.nz',
    [['science', 1, 'b', 2], ['business', 7, 'b', 2], ['hospitality', 2, 'b', 2]]],
  ['ru-spbu', 'Saint Petersburg State University', 'SPbU', 'RU', 'Saint Petersburg', 'university', false, "Russia's first university, on the Neva embankment", 1724, 30000, 'https://english.spbu.ru',
    [['science', 0, 'b', 4], ['law', 0, 'b', 3], ['media', 1, 'b', 3]]],
  ['ru-mipt', 'Moscow Institute of Physics and Technology', 'MIPT', 'RU', 'Moscow', 'institute', false, 'The legendary Phystech — physics olympiad royalty', 1946, 7000, 'https://mipt.ru',
    [['science', 2, 'b', 5], ['engineering', 5, 'b', 5], ['it', 4, 'b', 5]]],
  ['us-depaul', 'DePaul University', 'DePaul', 'US', 'Chicago', 'university', false, "America's largest Catholic university, in the Loop", 1898, 21000, 'https://www.depaul.edu',
    [['business', 0, 'b', 2], ['media', 2, 'b', 2], ['it', 5, 'b', 2], ['business', 0, 'd', 0]]],
  ['us-pace', 'Pace University', 'Pace', 'US', 'New York', 'university', false, 'Opposite City Hall, steps from Wall Street internships', 1906, 13000, 'https://www.pace.edu',
    [['business', 0, 'b', 2], ['law', 1, 'b', 2], ['it', 6, 'b', 2]]],
  ['us-umb', 'University of Massachusetts Boston', 'UMass Boston', 'US', 'Boston', 'university', false, 'Harbour-side public research university', 1964, 16000, 'https://www.umb.edu',
    [['business', 3, 'b', 2], ['health', 0, 'b', 2], ['science', 3, 'b', 2]]],
  ['ca-seneca', 'Seneca Polytechnic', 'Seneca', 'CA', 'Toronto', 'college', true, "Canada's largest college — big on co-op work terms", 1967, 45000, 'https://www.senecapolytechnic.ca',
    [['business', 0, 'd', 0], ['it', 0, 'd', 0], ['media', 0, 'd', 0]]],
  ['ca-langara', 'Langara College', 'Langara', 'CA', 'Vancouver', 'college', false, 'The famous university-transfer college of Vancouver', 1965, 21000, 'https://langara.ca',
    [['business', 0, 'd', 0], ['it', 0, 'd', 0], ['hospitality', 0, 'd', 0]]],
  ['cn-ecnu', 'East China Normal University', 'ECNU', 'CN', 'Shanghai', 'university', false, "China's leading teacher-training university in Shanghai", 1951, 35000, 'https://www.ecnu.edu.cn',
    [['education', 0, 'b', 3], ['education', 4, 'b', 3], ['science', 6, 'b', 3]]],
  ['cn-scut', 'South China University of Technology', 'SCUT', 'CN', 'Guangzhou', 'university', false, 'Engineering and architecture flagship of the south', 1952, 46000, 'https://www.scut.edu.cn',
    [['engineering', 0, 'b', 3], ['architecture', 0, 'b', 3], ['it', 1, 'b', 3]]],
];

// Branch-campus links (both directions get a "same family" cross-reference).
const BRANCHES = [
  ['au-monash', 'my-monash'],
  ['us-nyu', 'cn-nyush'],
  ['gb-lcb', 'nz-lcb'],
];

// Per-institution tuition calibration against published 2026 fee ranges
// (branch campuses and specialist schools price differently from the
// country baseline: NYU Shanghai ≈ ¥200k, Monash MY ≈ RM48k, community
// colleges far below university rates).
const TUITION_MULT = {
  'my-monash': 1.6, 'cn-nyush': 6, 'cn-bhi': 3, 'us-smc': 0.35,
};

// ------------------------------------------------------------------- cities
const CITY_COL = {
  Sydney: ['AU', 1900, 700, 180], Melbourne: ['AU', 1650, 650, 170], Brisbane: ['AU', 1500, 620, 160], Perth: ['AU', 1400, 600, 150],
  'Kuala Lumpur': ['MY', 1500, 900, 200], Penang: ['MY', 1100, 800, 150], Cyberjaya: ['MY', 1200, 850, 180], 'Johor Bahru': ['MY', 1000, 750, 150],
  Taipei: ['TW', 12000, 8000, 1280], Hsinchu: ['TW', 9500, 7000, 1000], Taichung: ['TW', 8500, 7000, 1000], Kaohsiung: ['TW', 8000, 6500, 900],
  London: ['GB', 1200, 450, 180], Manchester: ['GB', 850, 380, 95], Edinburgh: ['GB', 900, 380, 70], Birmingham: ['GB', 800, 360, 85], Leeds: ['GB', 750, 350, 80],
  Singapore: ['SG', 1500, 600, 120],
  Auckland: ['NZ', 1300, 600, 170], Wellington: ['NZ', 1200, 580, 150], Christchurch: ['NZ', 1050, 550, 120], Dunedin: ['NZ', 950, 520, 90],
  Moscow: ['RU', 45000, 25000, 2500], 'Saint Petersburg': ['RU', 35000, 22000, 2000], Kazan: ['RU', 25000, 18000, 1500], Novosibirsk: ['RU', 22000, 17000, 1400],
  Boston: ['US', 1100, 550, 90], 'New York': ['US', 1300, 600, 132], 'Los Angeles': ['US', 1100, 520, 100], Chicago: ['US', 900, 500, 75],
  Toronto: ['CA', 1000, 520, 156], Vancouver: ['CA', 1050, 520, 120], Montreal: ['CA', 700, 480, 94],
  Beijing: ['CN', 3000, 1800, 200], Shanghai: ['CN', 3200, 1900, 200], Guangzhou: ['CN', 2200, 1600, 150],
};

const CITY_ATTRACTIONS = {
  Sydney: [['Bondi Beach', 'nature', 35, 'Iconic surf beach at the start of the coastal walk'], ['Sydney Opera House', 'landmark', 12, 'The sails everyone flies here to see'], ['Spice Alley', 'food', 10, 'Lantern-lit laneway of Asian hawker eateries'], ['The Rocks Markets', 'shopping', 15, 'Weekend stalls under the Harbour Bridge'], ['Royal Botanic Garden', 'nature', 15, 'Harbourside lawns ten minutes from downtown']],
  Melbourne: [['Queen Victoria Market', 'food', 10, 'Historic sheds of produce, doughnuts and bratwurst'], ['Hosier Lane', 'landmark', 8, 'Ever-changing street-art laneway'], ['St Kilda Beach', 'nature', 25, 'Sunset pier with a resident penguin colony'], ['Melbourne Cricket Ground', 'sports', 15, 'The MCG — sport is a religion here'], ['Lygon Street', 'food', 12, "Melbourne's original Little Italy"]],
  Brisbane: [['South Bank Parklands', 'nature', 10, 'City beach, lagoon and free BBQs'], ['Eat Street Northshore', 'food', 25, 'Container-village night market'], ['Story Bridge', 'landmark', 15, 'Climb it or picnic under it'], ['Queen Street Mall', 'shopping', 10, 'Open-air retail heart of the city'], ['Suncorp Stadium', 'sports', 15, 'Rugby league nights are electric']],
  Perth: [['Cottesloe Beach', 'nature', 25, 'Indian Ocean sunsets and Norfolk pines'], ['Kings Park', 'nature', 10, 'One of the largest inner-city parks in the world'], ['Fremantle Markets', 'shopping', 30, 'Victorian-era market hall by the port'], ['Elizabeth Quay', 'landmark', 12, 'Riverfront promenade and public art'], ['Optus Stadium', 'sports', 20, 'AFL derbies under lights']],
  'Kuala Lumpur': [['Petronas Twin Towers', 'landmark', 15, 'The skyline shot of Malaysia'], ['Jalan Alor', 'food', 12, 'Late-night satay and char kuey teow street'], ['Batu Caves', 'nature', 40, 'Rainbow steps to a limestone temple cave'], ['Pavilion KL', 'shopping', 10, 'Glitzy mall in Bukit Bintang'], ['Changkat Bukit Bintang', 'nightlife', 12, 'Bar street that wakes after dark']],
  Penang: [['George Town Street Art', 'landmark', 15, 'Hunt the famous wrought-iron murals'], ['Gurney Drive Hawker Centre', 'food', 10, 'Assam laksa by the seafront'], ['Penang Hill', 'nature', 30, 'Funicular ride above the heritage city'], ['Gurney Plaza', 'shopping', 12, 'Seafront mall with everything'], ['Batu Ferringhi', 'nature', 35, 'Beach strip with a night market']],
  Cyberjaya: [['Cyberjaya Lake Gardens', 'nature', 10, 'Morning-run loop around the lake'], ['Tamarind Square', 'food', 8, 'Cafés and a famous 24-hour bookshop'], ['IOI City Mall', 'shopping', 20, 'Mega-mall with an indoor ice rink'], ['Putra Mosque', 'landmark', 20, 'Rose-pink mosque on Putrajaya lake'], ['Putrajaya Wetlands Park', 'nature', 18, 'Kayaks and flamingo sightings']],
  'Johor Bahru': [['Legoland Malaysia', 'landmark', 30, 'Theme park a bus ride from campus'], ['Jalan Dhoby', 'food', 10, 'Heritage shophouse cafés and banana cake'], ['Danga Bay', 'nature', 15, 'Waterfront promenade facing Singapore'], ['Johor Premium Outlets', 'shopping', 35, 'Discount designer runs'], ['Arulmigu Sri Rajakaliamman', 'landmark', 12, 'The glass temple of JB']],
  Taipei: [['Shilin Night Market', 'food', 20, 'Fried chicken bigger than your face'], ['Taipei 101', 'landmark', 15, 'Bamboo-shaped icon with a summit view'], ['Elephant Mountain', 'nature', 20, 'Short hike, best skyline photo in town'], ['Ximending', 'shopping', 15, 'Neon street fashion district'], ['Beitou Hot Springs', 'nature', 35, 'Steaming public baths on the MRT line']],
  Hsinchu: [['East Gate (Yingxi Gate)', 'landmark', 10, 'City gate ringed by a moat park'], ['Beipu Old Street', 'food', 30, 'Hakka lei cha and persimmon cakes'], ['Big City Mall', 'shopping', 8, 'Everything mall next to the station'], ['Hsinchu Park', 'nature', 12, 'Cherry blossoms and a glass museum'], ['17km Coastline Bikeway', 'sports', 20, 'Flat seaside ride past wind turbines']],
  Taichung: [['Fengjia Night Market', 'food', 15, "Taiwan's biggest night market"], ['Rainbow Village', 'landmark', 25, 'A settlement saved by paint'], ['Gaomei Wetlands', 'nature', 45, 'Windmill boardwalk at golden hour'], ['Miyahara', 'shopping', 12, 'Ophthalmology hall turned ice-cream palace'], ['Taichung Park', 'nature', 10, 'Lake pavilion from 1908']],
  Kaohsiung: [['Liuhe Night Market', 'food', 12, 'Seafood skewers by the harbour'], ['Pier-2 Art Center', 'landmark', 15, 'Warehouses full of installations'], ['Lotus Pond', 'nature', 20, 'Dragon and Tiger pagodas'], ['Dream Mall', 'shopping', 15, 'Rooftop ferris wheel views'], ['Cijin Island', 'nature', 25, 'Ferry, seafood street, black-sand beach']],
  London: [['Borough Market', 'food', 15, 'A thousand years of market eating'], ['British Museum', 'landmark', 12, 'The world under one roof, free entry'], ['Hyde Park', 'nature', 15, 'Rowboats, deck chairs, speakers corner'], ['Oxford Street', 'shopping', 10, 'A mile and a half of flagship stores'], ['Shoreditch', 'nightlife', 20, 'Street art by day, bars by night']],
  Manchester: [['Old Trafford', 'sports', 20, 'The Theatre of Dreams'], ['Northern Quarter', 'nightlife', 8, 'Indie bars and record shops'], ['Curry Mile', 'food', 10, 'A mile of South Asian flavour in Rusholme'], ['Manchester Arndale', 'shopping', 5, 'City-centre retail giant'], ['Heaton Park', 'nature', 25, 'Six hundred acres of green escape']],
  Edinburgh: [["Arthur's Seat", 'nature', 20, 'An extinct volcano in the city'], ['Royal Mile', 'landmark', 8, 'Castle to palace through the Old Town'], ['Princes Street', 'shopping', 10, 'Shopping with a castle backdrop'], ['Grassmarket', 'nightlife', 8, 'Historic square of pubs and folk music'], ['Portobello Beach', 'nature', 30, 'Seaside promenade and saunas']],
  Birmingham: [['Bullring & Grand Central', 'shopping', 8, 'The famous Selfridges discs'], ['Digbeth', 'food', 12, 'Street food yards in the creative quarter'], ['Cadbury World', 'landmark', 30, 'Chocolate heritage in Bournville'], ['Cannon Hill Park', 'nature', 15, 'Boating lake and the MAC arts centre'], ['Broad Street', 'nightlife', 10, 'Clubs along the canal side']],
  Leeds: [['Trinity Leeds', 'shopping', 5, 'Glass-roofed shopping quarter'], ['Kirkgate Market', 'food', 8, 'One of the largest indoor markets in Europe'], ['Roundhay Park', 'nature', 20, 'Lakes, gorges and Tropical World'], ['Headingley Stadium', 'sports', 15, 'Cricket and rugby league history'], ['Call Lane', 'nightlife', 8, 'Bar-hopping central']],
  Singapore: [['Gardens by the Bay', 'nature', 20, 'Supertrees and cooled conservatories'], ['Maxwell Food Centre', 'food', 15, 'Hainanese chicken rice pilgrimage'], ['Orchard Road', 'shopping', 15, 'Air-conditioned retail canyon'], ['Marina Bay Sands', 'landmark', 20, 'The boat-topped skyline icon'], ['Sentosa', 'nature', 30, 'Beaches, luge and cable cars'], ['Clarke Quay', 'nightlife', 15, 'Riverside bars and bumboats']],
  Auckland: [['Sky Tower', 'landmark', 10, 'Bungy off it or dine up it'], ['Mission Bay', 'nature', 20, 'Beach promenade with volcano views'], ['Ponsonby Road', 'food', 12, 'Brunch strip of the city'], ['Queen Street', 'shopping', 8, 'Main street from harbour to K-Road'], ['Eden Park', 'sports', 15, 'All Blacks home turf']],
  Wellington: [['Te Papa', 'landmark', 10, 'The national museum on the waterfront'], ['Cuba Street', 'food', 8, 'Bucket fountain, cafés and buskers'], ['Mount Victoria Lookout', 'nature', 15, '360° of harbour and hills'], ['Oriental Bay', 'nature', 12, 'City beach five minutes from downtown'], ['Sky Stadium', 'sports', 10, 'Concerts and rugby by the quays']],
  Christchurch: [['Hagley Park', 'nature', 10, 'Vast central park and botanic gardens'], ['Riverside Market', 'food', 8, 'Artisan hall on the Avon'], ['New Regent Street', 'shopping', 8, 'Pastel Spanish-mission arcade'], ['Port Hills', 'nature', 25, 'Mountain-bike trails above the city'], ['Apollo Projects Stadium', 'sports', 15, 'Crusaders match days']],
  Dunedin: [['St Clair Beach', 'nature', 15, 'Surf breaks and a hot salt-water pool'], ['Otago Farmers Market', 'food', 10, 'Saturday morning ritual at the station'], ['Baldwin Street', 'landmark', 12, 'The steepest street in the world'], ['George Street', 'shopping', 5, 'Student-town main street'], ['Forsyth Barr Stadium', 'sports', 10, 'The glasshouse of southern rugby']],
  Moscow: [['Red Square', 'landmark', 15, "St Basil's domes and the Kremlin walls"], ['Gorky Park', 'nature', 20, 'Skates in winter, lawns in summer'], ['GUM', 'shopping', 15, 'Tsarist-era gallery of shops and ice cream'], ['Arbat Street', 'food', 12, 'Pedestrian street of cafés and buskers'], ['Vorobyovy Gory', 'nature', 25, 'Sparrow Hills viewpoint over the city']],
  'Saint Petersburg': [['The Hermitage', 'landmark', 12, 'Three million artworks in the Winter Palace'], ['Nevsky Prospekt', 'shopping', 8, 'The grand avenue of the city'], ['Summer Garden', 'nature', 15, 'Marble statues and fountain alleys'], ['Rubinstein Street', 'food', 10, 'Bar-and-bistro street of the city'], ['New Holland Island', 'nature', 12, 'Island park with pop-ups and lawns']],
  Kazan: [['Kazan Kremlin', 'landmark', 10, 'White-walled fortress with a turquoise mosque'], ['Bauman Street', 'food', 8, 'Pedestrian mile of chak-chak and cafés'], ['Kaban Lake', 'nature', 12, 'Boardwalk embankment downtown'], ['Koltso Mall', 'shopping', 8, 'Central mall on the ring'], ['Kazan Arena', 'sports', 20, 'World-Cup stadium on the river']],
  Novosibirsk: [['Opera & Ballet Theatre', 'landmark', 10, 'The largest theatre building in Russia'], ['Ob River Embankment', 'nature', 15, "Sunset walks along Siberia's great river"], ['Central Park', 'nature', 10, 'Ferris wheel and winter ice town'], ['Aura Mall', 'shopping', 12, 'Warm refuge with 200 stores'], ['Akademgorodok', 'landmark', 30, 'The famous forest science city']],
  Boston: [['Freedom Trail', 'landmark', 15, 'Red-brick line through 16 revolutionary sites'], ['Fenway Park', 'sports', 15, 'Oldest ballpark in America — catch a Red Sox night'], ['Quincy Market', 'food', 12, 'Food-hall colonnade beside Faneuil Hall'], ['Charles River Esplanade', 'nature', 10, 'Riverside runs with skyline views'], ['Newbury Street', 'shopping', 12, 'Brownstone mile of shops and cafés']],
  'New York': [['Central Park', 'nature', 15, '843 acres of lawns, lakes and squirrels'], ['Times Square', 'landmark', 12, 'The neon crossroads of the world'], ['Chelsea Market', 'food', 15, 'Indoor market under the High Line'], ['Fifth Avenue', 'shopping', 10, 'Flagship-store canyon'], ['Madison Square Garden', 'sports', 12, 'Knicks nights and mega concerts']],
  'Los Angeles': [['Santa Monica Pier', 'nature', 30, 'Ferris wheel over the Pacific'], ['Hollywood Sign', 'landmark', 35, 'Hike Griffith Park for the classic shot'], ['Grand Central Market', 'food', 20, 'Century-old downtown food hall'], ['The Grove', 'shopping', 20, 'Open-air mall beside the Farmers Market'], ['Crypto.com Arena', 'sports', 20, 'Lakers, Kings and arena-tour days']],
  Chicago: [['Millennium Park', 'landmark', 10, 'Selfie with The Bean, concerts on the lawn'], ['Navy Pier', 'nature', 15, 'Lakefront wheel and summer fireworks'], ['West Loop', 'food', 12, 'Restaurant row on Randolph Street'], ['Magnificent Mile', 'shopping', 10, 'Michigan Avenue retail stretch'], ['Wrigley Field', 'sports', 25, 'Ivy-walled home of the Cubs']],
  Toronto: [['CN Tower', 'landmark', 12, 'Glass-floor views from 553 metres'], ['St. Lawrence Market', 'food', 10, 'Peameal bacon sandwiches since 1803'], ['High Park', 'nature', 20, 'Cherry blossoms and lakeside trails'], ['CF Toronto Eaton Centre', 'shopping', 8, 'Glass-galleria mega mall'], ['Scotiabank Arena', 'sports', 12, 'Raptors and Maple Leafs under one roof']],
  Vancouver: [['Stanley Park', 'nature', 15, 'Seawall cycling loop around the peninsula'], ['Granville Island', 'food', 15, 'Public market under the bridge'], ['Gastown', 'landmark', 10, 'Steam clock and cobbled brunch streets'], ['Robson Street', 'shopping', 8, 'Downtown fashion strip'], ['Rogers Arena', 'sports', 10, 'Canucks hockey nights']],
  Montreal: [['Old Montreal', 'landmark', 12, 'Cobblestones and Notre-Dame Basilica'], ['Mount Royal', 'nature', 15, 'The lookout above the city'], ['Jean-Talon Market', 'food', 20, 'Open-air market in Little Italy'], ['Sainte-Catherine Street', 'shopping', 8, 'The longest shopping street in Canada'], ['Bell Centre', 'sports', 10, 'Canadiens hockey is a religion here']],
  Beijing: [['Forbidden City', 'landmark', 25, 'Six hundred years of imperial halls'], ['Summer Palace', 'nature', 30, 'Lakeside temples northwest of the city'], ['Wangfujing Street', 'food', 20, 'Snack street and night stalls'], ['Sanlitun', 'nightlife', 25, 'Bar street and flagship stores'], ["Workers' Stadium", 'sports', 20, 'Beijing Guoan football nights']],
  Shanghai: [['The Bund', 'landmark', 15, 'Colonial riverfront facing the Pudong skyline'], ['Yu Garden', 'nature', 15, 'Ming-dynasty rockeries and koi ponds'], ['Tianzifang', 'shopping', 15, 'Lane-house maze of craft shops'], ['City God Temple food street', 'food', 15, 'Soup dumplings at the source'], ['Found 158', 'nightlife', 15, 'Sunken courtyard of bars and gyms']],
  Guangzhou: [['Canton Tower', 'landmark', 15, 'Twisting tower over the Pearl River'], ['Shamian Island', 'nature', 15, 'Banyan-lined colonial island'], ['Beijing Road', 'shopping', 12, 'Pedestrian shopping since the Song dynasty'], ['Taotaoju dim sum', 'food', 12, 'Yum cha institution since 1880'], ['Tianhe Stadium', 'sports', 15, 'Football nights in the new town']],
};

// City knowledge for the in-app assistant: [climate, safety]. Indicative,
// general-knowledge summaries — not live data.
const CITY_INFO = {
  Sydney: ['Warm summers 19–27°C, mild winters 8–17°C; beach weather Oct–Apr.', 'Very safe overall; usual big-city awareness late at night around nightlife strips.'],
  Melbourne: ['Famous "four seasons in a day": summers 14–26°C, winters 6–14°C; pack layers.', 'Very safe and walkable; keep an eye on belongings on late-night trams.'],
  Brisbane: ['Subtropical: hot humid summers 21–30°C, dry mild winters 10–22°C.', 'Relaxed and safe; sun protection matters more than street crime.'],
  Perth: ['Sunniest capital: dry hot summers 18–32°C, mild wet winters 8–19°C.', 'Low crime; standard care in the CBD late at night.'],
  'Kuala Lumpur': ['Hot and humid year-round 24–33°C with afternoon downpours; everything is air-conditioned.', 'Generally safe; watch for bag-snatching on quiet roadsides, use Grab at night.'],
  Penang: ['Tropical 24–32°C all year; sea breeze evenings, monsoon showers Sep–Nov.', 'Laid-back and safe; usual scooter-traffic caution.'],
  Cyberjaya: ['Hot and humid 24–33°C; planned green township with lake breezes.', 'Quiet, planned and safe; very low street crime.'],
  'Johor Bahru': ['Tropical 24–32°C year-round with quick storms.', 'Fine in main areas; keep phones off the roadside kerb and use Grab late.'],
  Taipei: ['Humid subtropical: muggy summers 26–34°C, damp cool winters 13–18°C; typhoon season Jul–Sep.', 'Among the safest cities in Asia; lost wallets famously come back.'],
  Hsinchu: ['Windy city: warm summers, mild winters 12–18°C; less rain than Taipei.', 'Very safe science-park town.'],
  Taichung: ['Mildest big-city climate in Taiwan, 16–30°C, less rain.', 'Very safe; usual scooter awareness.'],
  Kaohsiung: ['Tropical harbour city 20–32°C; warm even in winter.', 'Safe and friendly; typhoon prep matters more than crime.'],
  London: ['Mild and grey: summers 14–23°C, winters 3–9°C; light rain anytime.', 'Safe for a mega-city; watch phones near road edges and on the Tube late.'],
  Manchester: ['Cool and famously drizzly: summers 12–20°C, winters 2–8°C.', 'Student-friendly; standard UK city-centre awareness at night.'],
  Edinburgh: ['Cool and breezy: summers 11–19°C, winters 1–7°C; bring a windproof coat.', "One of the UK's safest cities."],
  Birmingham: ['Similar to London but cooler: summers 13–21°C, winters 2–8°C.', 'Fine in the centre and campus areas; usual night-time care.'],
  Leeds: ['Cool Yorkshire weather: summers 12–20°C, winters 1–7°C.', 'Big student city; stick to lit routes after nights out.'],
  Singapore: ['Hot and humid 25–32°C every single day; daily short downpours.', 'One of the safest cities in the world, day or night.'],
  Auckland: ['Oceanic: summers 15–24°C, mild winters 8–15°C; four seasons in a day.', 'Safe and easy-going; standard CBD late-night awareness.'],
  Wellington: ['Windy capital: summers 13–20°C, winters 6–12°C.', 'Compact and safe; the wind is the biggest hazard.'],
  Christchurch: ['Dry and sunny: summers 12–23°C, crisp winters 2–12°C.', 'Safe, flat, cycle-friendly.'],
  Dunedin: ['Coolest of the four: summers 10–19°C, winters 2–10°C; flats can be cold — check heating.', 'Small, safe student city.'],
  Moscow: ['Real winters: −10 to −4°C Dec–Feb with snow; pleasant summers 14–24°C.', 'Central areas are orderly and well-policed; carry your documents.'],
  'Saint Petersburg': ['White nights in June; winters −8 to −2°C, summers 13–23°C.', 'Tourist centre is safe; standard care in transit hubs late.'],
  Kazan: ['Continental: snowy winters −12 to −5°C, warm summers 15–25°C.', 'Calm, student-heavy city.'],
  Novosibirsk: ['Siberian: winters −20 to −12°C (dress seriously), summers 15–26°C.', 'Safe university districts; winter cold is the main risk.'],
  Boston: ['Four proper seasons: snowy winters −6 to 4°C, warm summers 17–28°C; fall is spectacular.', 'Safe student city; usual late-night awareness downtown.'],
  'New York': ['Hot summers 20–29°C, cold winters −3 to 6°C; every season has a mood.', 'Much safer than the movies suggest; stay aware on late-night subways.'],
  'Los Angeles': ['Sunny and dry 14–29°C nearly all year; cool ocean-breeze evenings.', 'Neighbourhood-dependent; campus areas are safe, plan rides home at night.'],
  Chicago: ['Windy city: icy winters −8 to 0°C, pleasant summers 17–29°C.', 'Downtown and campus areas are fine; research neighbourhoods before renting.'],
  Toronto: ['Cold snowy winters −7 to 0°C, warm summers 15–27°C; the PATH keeps downtown walkable.', 'Consistently ranked among the safest big cities in North America.'],
  Vancouver: ['Mildest in Canada: rainy winters 1–8°C, dry sunny summers 13–22°C.', 'Very safe; standard awareness around the Downtown Eastside.'],
  Montreal: ['Real winters −13 to −5°C with lots of snow; joyful summers 16–26°C.', 'Safe, walkable and student-filled; icy sidewalks are the real hazard.'],
  Beijing: ['Dry continental: cold winters −8 to 3°C, hot summers 22–31°C.', 'Very low street crime; campuses are gated and patrolled.'],
  Shanghai: ['Humid subtropical: chilly damp winters 1–9°C, hot muggy summers 25–33°C.', 'Extremely safe at all hours; mind silent e-scooters when crossing.'],
  Guangzhou: ['Subtropical: warm and humid 14–33°C, long summers with downpours.', 'Safe and orderly; typhoon season brings heavy rain, not trouble.'],
};

// ---------------------------------------------------------------- build data
// Language of instruction by country; public Malaysian universities also
// teach in Malay, Chinese-medium contexts noted where relevant.
const TEACHING_LANGUAGES = {
  AU: ['English'], GB: ['English'], NZ: ['English'], SG: ['English'],
  MY: ['English'], TW: ['Mandarin', 'English'], RU: ['Russian', 'English'],
  US: ['English'], CA: ['English'], CN: ['Mandarin', 'English'],
};
const MY_MALAY_ALSO = new Set(['my-um', 'my-usm', 'my-utm']);

// Wikipedia page title (for live campus imagery) + indicative QS-style world
// ranking (approximate recent values; null = not ranked).
const INST_META = {
  'au-monash': ['Monash University', 37], 'au-sydney': ['University of Sydney', 18],
  'au-uq': ['University of Queensland', 40], 'au-unsw': ['University of New South Wales', 19],
  'au-unimelb': ['University of Melbourne', 13], 'au-rmit': ['RMIT University', 123],
  'my-um': ['University of Malaya', 60], 'my-taylors': ["Taylor's University", 251],
  'my-sunway': ['Sunway University', 539], 'my-mmu': ['Multimedia University', null],
  'my-usm': ['Universiti Sains Malaysia', 146], 'my-utm': ['Universiti Teknologi Malaysia', 181],
  'tw-ntu': ['National Taiwan University', 68], 'tw-nthu': ['National Tsing Hua University', 210],
  'tw-fcu': ['Feng Chia University', null], 'tw-nsysu': ['National Sun Yat-sen University', 427],
  'gb-manchester': ['University of Manchester', 34], 'gb-leeds': ['University of Leeds', 82],
  'gb-birmingham': ['University of Birmingham', 80], 'gb-ucl': ['University College London', 9],
  'gb-kcl': ["King's College London", 40], 'gb-edinburgh': ['University of Edinburgh', 27],
  'sg-nus': ['National University of Singapore', 8], 'sg-ntusg': ['Nanyang Technological University', 15],
  'sg-smu': ['Singapore Management University', 511], 'sg-sim': ['Singapore Institute of Management', null],
  'nz-auckland': ['University of Auckland', 65], 'nz-vuw': ['Victoria University of Wellington', 244],
  'nz-canterbury': ['University of Canterbury', 261], 'nz-otago': ['University of Otago', 214],
  'ru-msu': ['Moscow State University', 94], 'ru-itmo': ['ITMO University', 360],
  'ru-kfu': ['Kazan Federal University', 396], 'ru-nsu': ['Novosibirsk State University', 225],
  'us-mit': ['Massachusetts Institute of Technology', 1], 'us-bu': ['Boston University', 108],
  'us-nyu': ['New York University', 43], 'us-ucla': ['University of California, Los Angeles', 42],
  'us-uchicago': ['University of Chicago', 21], 'us-smc': ['Santa Monica College', null],
  'us-ice': ['Institute of Culinary Education', null],
  'ca-utoronto': ['University of Toronto', 25], 'ca-ubc': ['University of British Columbia', 38],
  'ca-mcgill': ['McGill University', 29], 'ca-york': ['York University', 353],
  'ca-georgebrown': ['George Brown College', null],
  'cn-tsinghua': ['Tsinghua University', 20], 'cn-pku': ['Peking University', 14],
  'cn-fudan': ['Fudan University', 39], 'cn-sysu': ['Sun Yat-sen University', 319],
  'cn-bhi': ['Beijing Hospitality Institute', null],
  'au-angliss': ['William Angliss Institute', null], 'my-berjaya': ['Berjaya University College', null],
  'tw-nkuht': ['National Kaohsiung University of Hospitality and Tourism', null],
  'gb-lcb': ['Le Cordon Bleu', null], 'nz-lcb': ['Le Cordon Bleu', null],
  'sg-shatec': ['SHATEC', null],
  'my-monash': ['Monash University Malaysia Campus', null], 'cn-nyush': ['New York University Shanghai', null],
  'gb-imperial': ['Imperial College London', 2], 'au-uts': ['University of Technology Sydney', 96],
  'my-ucsi': ['UCSI University', 265], 'tw-ntust': ['National Taiwan University of Science and Technology', 397],
  'sg-tp': ['Temasek Polytechnic', null], 'nz-aut': ['Auckland University of Technology', 412],
  'ru-hse': ['Higher School of Economics', 399], 'us-columbia': ['Columbia University', 34],
  'us-northeastern': ['Northeastern University', 344], 'us-fit': ['Fashion Institute of Technology', null],
  'us-iit': ['Illinois Institute of Technology', 437], 'ca-tmu': ['Toronto Metropolitan University', null],
  'ca-sfu': ['Simon Fraser University', 318], 'ca-concordia': ['Concordia University', 387],
  'ca-vcc': ['Vancouver Community College', null], 'cn-sjtu': ['Shanghai Jiao Tong University', 45],
  'cn-tongji': ['Tongji University', 192], 'cn-bnu': ['Beijing Normal University', 271],
  'cn-jnu': ['Jinan University', 606],
  'au-deakin': ['Deakin University', 197], 'au-macquarie': ['Macquarie University', 133],
  'au-griffith': ['Griffith University', 239], 'au-holmesglen': ['Holmesglen Institute', null],
  'my-apu': ['Asia Pacific University of Technology & Innovation', 621], 'my-help': ['HELP University', null],
  'my-inti': ['INTI International University', null], 'tw-nccu': ['National Chengchi University', 587],
  'tw-tku': ['Tamkang University', null], 'gb-lse': ['London School of Economics', 50],
  'gb-kingston': ['Kingston University', null], 'sg-sit': ['Singapore Institute of Technology', null],
  'sg-np': ['Ngee Ann Polytechnic', null], 'nz-massey': ['Massey University', 239],
  'nz-lincoln': ['Lincoln University (New Zealand)', 362], 'ru-spbu': ['Saint Petersburg State University', 365],
  'ru-mipt': ['Moscow Institute of Physics and Technology', 302], 'us-depaul': ['DePaul University', null],
  'us-pace': ['Pace University', null], 'us-umb': ['University of Massachusetts Boston', null],
  'ca-seneca': ['Seneca Polytechnic', null], 'ca-langara': ['Langara College', null],
  'cn-ecnu': ['East China Normal University', 501], 'cn-scut': ['South China University of Technology', 437],
};

// Verified real campus photos (Wikimedia Commons filenames) resolved from each
// institution's Wikidata "image" claim (P18) — the human-curated photo of the
// subject, never its coat of arms/logo — or, where no P18 exists, a manually
// checked photo from the article's media list. Verified 2026-08-03.
// Institutions absent here have no usable free photo → abstract placeholder.
const INST_PHOTO = {
  'au-monash': 'Monash Learning and Teaching Building (43797320625).jpg',
  'au-sydney': 'University of Sydney Main Quadrangle.jpg',
  'au-uq': 'UQ-SteeleBldg800.jpg',
  'au-unsw': 'Main Walkway, Lower campus UNSW.jpg',
  'au-unimelb': 'Baillieu Library.JPG',
  'au-rmit': 'RMIT University Building 01.jpg',
  'my-um': 'Universiti Malaya KL gate.jpg',
  'my-taylors': 'Taylors Lakeside Campus.jpg',
  'my-sunway': 'Sunway University (New Building) - 2015.jpg',
  'my-mmu': 'Multimedia University.JPG',
  'my-usm': 'Main gate at the Universiti Sains Malaysia.jpg',
  'tw-ntu': 'National Taiwan University Library 20060802.jpg',
  'tw-nthu': 'NTHU entrance.JPG',
  'tw-fcu': 'Feng Chia University in Central Taiwan Science Park.JPG',
  'tw-nsysu': '2017 NSYSU maingate.jpg',
  'gb-manchester': 'Whitworth Hall.jpg',
  'gb-leeds': 'Parkinson Building, Leeds University, England-12Sept2010.jpg',
  'gb-birmingham': 'Aston Webb buildings in snow, The University of Birmingham, Dec 2009.jpg',
  'gb-ucl': 'Wilkins Building 1, UCL, London - Diliff.jpg',
  'gb-kcl': "King's College London Bush House Building 3.jpg",
  'gb-edinburgh': 'Old College Quad.jpg',
  'sg-nus': 'NUS, University Cultural Centre 3, Nov 06.JPG',
  'sg-ntusg': 'NTU Administration Building.JPG',
  'sg-smu': 'Singapore Management University, Jan 06.JPG',
  'nz-auckland': 'Faculty of Medical and Health Sciences, University of Auckland.jpg',
  'nz-vuw': 'VUW-Kelburn.jpg',
  'nz-canterbury': 'UC CentralLibrary01 gobeirne.jpg',
  'nz-otago': 'University of Otago.jpg',
  'ru-msu': 'МГУ, вид с воздуха.jpg',
  'ru-itmo': "ITMO University's main building, August 2016.jpg",
  'ru-kfu': 'Kazan State University from the 2 Korpus.jpg',
  'ru-nsu': 'Akademgorodok NSU Interweek.jpg',
  'us-mit': 'MIT Dome night1 Edit.jpg',
  'us-bu': 'BU College of Communication.jpg',
  'us-nyu': 'NYU07.JPG',
  'us-ucla': 'Royce Hall, University of California, Los Angeles (23-09-2003).jpg',
  'us-uchicago': 'Harper Library from the Midway Plaisance.JPG',
  'us-smc': 'Smctheaterartsbuilding.JPG',
  'ca-utoronto': 'UofTConvocationHall.jpg',
  'ca-ubc': 'Irving K. Barber Library.jpg',
  'ca-mcgill': 'Arts Building, McGill University, Aug 31 2022.jpg',
  'ca-york': 'YorkUComputerScienceAndEngineeringBuilding.jpg',
  'ca-georgebrown': 'GBC Casa Loma 02.jpg',
  'cn-tsinghua': 'Thu gate.JPG',
  'cn-pku': 'PekingUniversityPic6.jpg',
  'cn-fudan': 'Fudan-xianghuitang.jpg',
  'cn-sysu': 'Zhongda ZH3.jpg',
  'my-berjaya': 'Berjaya Times Square (211030).jpg',
  'gb-lcb': 'Paris 06 2012 Cordon Bleu 3149.jpg',
  'nz-lcb': 'Paris 06 2012 Cordon Bleu 3149.jpg',
  'my-monash': 'Cmglee Sunway Monash University.jpg',
  'cn-nyush': 'NYUSH Lujiazui Building.jpg',
  'gb-imperial': 'Imperial College London down Exhibition Road.jpg',
  'au-uts': 'Ultimo UTS Tower.JPG',
  'tw-ntust': '國立台灣科技大學研揚大樓.JPG',
  'nz-aut': 'Auckland University of Technology.jpg',
  'ru-hse': 'Moscow Durasov Palace asv2018-08.jpg',
  'us-columbia': 'Columbia University - Low Memorial Library (48170370506).jpg',
  'us-northeastern': 'Northeastern University.jpg',
  'us-fit': 'The Museum at FIT (48206542922).jpg',
  'us-iit': 'IIT Main Building.jpg',
  'ca-tmu': 'Toronto Met Student Learning Centre at night 2022.jpg',
  'ca-sfu': 'Academic quad at sfu.jpg',
  'ca-concordia': 'JMSB.jpg',
  'cn-tongji': 'Tongjidaxue Tushuguan.JPG',
  'cn-bnu': 'BNU Gate.jpg',
  'cn-jnu': 'Jnu gate.jpg',
  'cn-sjtu': 'Shanghai Jiao Tong University 1.jpg',
  'au-deakin': 'Deakin University Burwood Campus.jpg',
  'au-macquarie': 'Macquarie University New Library 2011.jpg',
  'au-griffith': 'Griffith University.jpg',
  'my-apu': 'UCTI Interior.jpg',
  'my-inti': 'INTI Nilai Student Centre.png',
  'tw-nccu': 'NCCU Shiwei Hall 20220815.jpg',
  'tw-tku': 'Lanyang Campus, Tamkang University 20060322.jpg',
  'gb-lse': 'LondonSchoolofEconomics cford.jpg',
  'gb-kingston': 'Knights Park Campus.jpg',
  'sg-np': 'NPcampus.JPG',
  'nz-massey': 'Masseyalbany2005.JPG',
  'nz-lincoln': 'Ivey Hall, Lincoln University, New Zealand.jpg',
  'ru-spbu': 'Spb 06-2012 University Embankment 06.jpg',
  'ru-mipt': 'Mipt phystech.jpg',
  'us-depaul': 'StudentCenterDePaul.jpg',
  'us-pace': 'PaceUniversity.JPG',
  'us-umb': 'UMass Boston campus.jpg',
  'ca-seneca': 'Seneca CITE Building K - front exterior view.jpg',
  'ca-langara': 'LangaraCollege2007-small.jpg',
  'cn-ecnu': '华东师范大学思群堂.jpg',
  'cn-scut': 'South China University of Technology South Gate.jpg',
  // Batch verified 2026-08-05 — every remaining school got a real photo.
  'my-ucsi': 'UCSI main gate Taman Connaught (231105).jpg',
  'ca-vcc': 'VCC Broadway Campus Building.jpg',
  'sg-sit': 'SIT Punggol Campus-Dec 2025 03.jpg',
  'sg-sim': 'SIM HQ.jpg',
  'sg-tp': 'Temasek Polytechnic, Singapore, March 2026.jpg',
  'au-holmesglen': 'Holmesglen Tafe Moorabbin b.jpg',
  'cn-bhi': [
    'South gate of Beijing Hospitality Institute (20230303124903).jpg',
    'Academic and administrative building of Beijing Hospitality Institute (20230303125821).jpg',
    'West gate of Beijing Hospitality Institute (20230303125303).jpg',
  ],
  'my-utm': 'Universiti Teknologi Malaysia.jpg',
  'au-angliss': 'Graduation - William Angliss May 2012.jpg',
  'tw-nkuht': '110年學生會成果展-國立高雄餐旅大學合照.jpg',
  // ICE teaches inside Brookfield Place; SHATEC and HELP have no photos on
  // Commons, so their heroes are verified photos of their home cities.
  'us-ice': 'Brookfield Place New York August 2017 003.jpg',
  'sg-shatec': 'Singapore (SG), Marina Bay -- 2019 -- 4439-48.jpg',
  'my-help': 'Kuala Lumpur Malaysia Skyline-03.jpg',
};
const commonsPhoto = (name) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name.replace(/ /g, '_'))}?width=1000`;

// Official logos, resolved and fetch-verified per institution on 2026-08-04.
// Preferred source is the school's Wikipedia/Wikidata logo file (rendered
// PNG thumb), then the school's own published favicon/touch-icon; everyone
// else uses the official site favicon via Google's s2 service. Clearbit —
// the previous source — sunset its free logo API, which broke every logo.
// BHI, BERJAYA UC and SHATEC publish no fetchable mark: they intentionally
// fall through to the app's initial-letter tile.
const LOGO_URL = {
  'au-rmit': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/RMIT_University_Logo.svg/330px-RMIT_University_Logo.svg.png',
  'my-um': 'https://www.google.com/s2/favicons?domain=um.edu.my&sz=128',
  'my-taylors': 'https://upload.wikimedia.org/wikipedia/commons/6/69/Logo-Taylors-University.png',
  'my-mmu': 'https://www.mmu.edu.my/favicon.ico',
  'my-usm': 'https://www.usm.my/images/favicon/favicon.png',
  'tw-ntu': 'https://www.ntu.edu.tw/images/favicon/apple-touch-icon.png',
  'tw-nthu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/NTHU_Round_Seal.svg/330px-NTHU_Round_Seal.svg.png',
  'tw-fcu': 'https://www.fcu.edu.tw/favicon.ico',
  'tw-nsysu': 'https://www.nsysu.edu.tw/var/file/0/1000/img/84/touch-icon-iphone.png',
  'tw-nkuht': 'https://www.nkuht.edu.tw/var/file/0/1000/msys_1000_2891624_61864.ico',
  'gb-manchester': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Manchester_University_Logo_%282%29.png/330px-Manchester_University_Logo_%282%29.png',
  'gb-kcl': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Kcl-logo.svg/330px-Kcl-logo.svg.png',
  'gb-edinburgh': 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/University_of_Edinburgh_ceremonial_roundel.svg/330px-University_of_Edinburgh_ceremonial_roundel.svg.png',
  'nz-otago': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/University_of_Otago_Logo.jpg/330px-University_of_Otago_Logo.jpg',
  'nz-vuw': 'https://icons.duckduckgo.com/ip3/wgtn.ac.nz.ico',
  'us-mit': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/MIT_2023_red_logo.svg/330px-MIT_2023_red_logo.svg.png',
  'us-nyu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Nyu_short_color.svg/330px-Nyu_short_color.svg.png',
  'us-ucla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/University_of_California%2C_Los_Angeles_logo.svg/330px-University_of_California%2C_Los_Angeles_logo.svg.png',
  'ca-ubc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/British_columbia_ca_univ_logo.svg/330px-British_columbia_ca_univ_logo.svg.png',
  'ca-mcgill': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Mcgill_univ_ca_logo.png/330px-Mcgill_univ_ca_logo.png',
  'ca-york': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Logo_York_University.svg/330px-Logo_York_University.svg.png',
  'ca-georgebrown': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/George_Brown_College_logo.svg/330px-George_Brown_College_logo.svg.png',
  'cn-tsinghua': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Tsinghua_University_Logo.svg/330px-Tsinghua_University_Logo.svg.png',
  'cn-fudan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Fudan_University_Logo.svg/330px-Fudan_University_Logo.svg.png',
  'cn-sysu': 'https://upload.wikimedia.org/wikipedia/en/f/fb/Sun_Yat-sen_University_Logo.png',
  'cn-nyush': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Nyu_short_color.svg/330px-Nyu_short_color.svg.png',
  'us-ice': 'https://www.google.com/s2/favicons?domain=ice.edu&sz=128',
  'us-iit': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Illinois_tech_logo.png/330px-Illinois_tech_logo.png',
  'ca-tmu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/TMU_logo.svg/330px-TMU_logo.svg.png',
  'ca-sfu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/SFU-block-logo.svg/330px-SFU-block-logo.svg.png',
  'ca-concordia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Concordia_univ_montreal_textlogo.png/330px-Concordia_univ_montreal_textlogo.png',
  'ca-vcc': 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Vancouver_Community_College_logo.png',
  'nz-aut': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Logo_of_Auckland_University_of_Technology.svg/330px-Logo_of_Auckland_University_of_Technology.svg.png',
  'gb-imperial': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Imperial_College_London_new_logo.png/330px-Imperial_College_London_new_logo.png',
  'au-deakin': 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Deakin_Worldly_Strip_Logo.jpg',
  'au-macquarie': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Macquarie_University_International_brandmark_%E2%80%93_Horizontal_configuration.svg/330px-Macquarie_University_International_brandmark_%E2%80%93_Horizontal_configuration.svg.png',
  'gb-lse': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/London_school_of_economics_logo_with_name.svg/330px-London_school_of_economics_logo_with_name.svg.png',
  'gb-kingston': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Kingston_University_logo.svg/330px-Kingston_University_logo.svg.png',
  'nz-lincoln': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/LU_logo.jpg/330px-LU_logo.jpg',
  'us-pace': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Pace_University_Logo.svg/330px-Pace_University_Logo.svg.png',
  // Batch verified 2026-08-05 (s2-favicon fallbacks that returned Google's
  // default globe were hunted down individually).
  'cn-sjtu': 'https://upload.wikimedia.org/wikipedia/en/d/da/Sjtu-logo-standard-red.png',
  'cn-tongji': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Tongji_Uni_logo.svg/330px-Tongji_Uni_logo.svg.png',
  'cn-ecnu': 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/East_China_Normal_University_logo.svg/330px-East_China_Normal_University_logo.svg.png',
  'cn-bnu': 'https://commons.wikimedia.org/wiki/Special:FilePath/%E5%8C%97%E5%B8%88%E5%A4%A7LOGO.jpg?width=256',
  'tw-ntust': 'https://upload.wikimedia.org/wikipedia/en/1/18/Taiwan_Tech_logo.png',
  'tw-tku': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/TKU_logo.png/330px-TKU_logo.png',
  'tw-nccu': 'https://icons.duckduckgo.com/ip3/nccu.edu.tw.ico',
};
// No fetchable mark anywhere (site favicons are HTML pages, nothing on any
// wiki): the app renders its initial-letter tile instead of Google's globe.
const NO_LOGO = new Set(['cn-bhi', 'my-berjaya', 'sg-shatec', 'tw-nkuht']);
const logoFor = (id, website) => {
  if (LOGO_URL[id]) return LOGO_URL[id];
  if (NO_LOGO.has(id)) return 'initials';
  const domain = new URL(website).hostname.replace(/^www\./, '');
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

const institutions = INSTITUTIONS.map(([id, name, short, country, city, type, verified, tagline, founded, students, website]) => ({
  id, name, short, country, city, type,
  verifiedPartner: verified, tagline, founded, students, website,
  languages: MY_MALAY_ALSO.has(id) ? ['English', 'Bahasa Melayu'] : TEACHING_LANGUAGES[country],
  logo: logoFor(id, website),
  wikipedia: INST_META[id][0],
  ranking: INST_META[id][1],
  // Real, byte-verified photos only — no random placeholder imagery.
  // Curated hero first, then harvested facility/surroundings shots.
  images: [...new Set([].concat(INST_PHOTO[id]).concat(PHOTO_EXTRA[id] ?? []))].map(commonsPhoto),
}));
{
  const missing = institutions.filter((i) => i.images.length === 0).map((i) => i.id);
  if (missing.length) throw new Error(`institutions without a real photo: ${missing.join(', ')}`);
}

// Cross-link branch campuses (denormalised so the UI needs no extra lookup).
for (const pair of BRANCHES) {
  for (const id of pair) {
    const self = institutions.find((x) => x.id === id);
    self.campuses = pair
      .filter((other) => other !== id)
      .map((other) => {
        const o = institutions.find((x) => x.id === other);
        return { id: o.id, name: o.name, city: o.city, country: o.country };
      });
  }
}

function nextIntakes(country, count = 4) {
  const months = COUNTRIES[country].intakeMonths;
  const out = [];
  let y = NOW.year;
  while (out.length < count && y <= NOW.year + 2) {
    for (const m of months) {
      if ((y > NOW.year || m > NOW.month) && out.length < count) {
        out.push(`${y}-${String(m).padStart(2, '0')}`);
      }
    }
    y += 1;
  }
  return out;
}

const MED_RECOGNITION = {
  MY: ['AU', 'GB', 'NZ', 'MY', 'US', 'CA'], SG: ['AU', 'GB', 'NZ', 'SG', 'US', 'CA'], TW: ['AU', 'GB', 'TW', 'US'],
  CN: ['GB', 'AU', 'RU', 'CN', 'US'], ID: ['AU', 'GB', 'MY', 'US'], VN: ['AU', 'GB', 'RU', 'US'],
  MM: ['AU', 'GB', 'MY', 'US'], KR: ['US', 'AU', 'GB'], JP: ['US', 'GB', 'AU'],
};
const COMMON_LAW = ['GB', 'AU', 'NZ', 'SG', 'MY', 'US', 'CA'];

function recognitionFor(field, isMed, dest) {
  const out = {};
  for (const home of ['MY', 'TW', 'SG', 'ID', 'VN', 'CN', 'MM', 'KR', 'JP']) {
    let ok = true;
    if (isMed) ok = MED_RECOGNITION[home].includes(dest);
    else if (field === 'law') ok = ['MY', 'SG'].includes(home) && COMMON_LAW.includes(dest);
    else if (dest === 'RU') ok = ['CN', 'VN'].includes(home) || ['engineering', 'it', 'health'].includes(field);
    out[home] = ok;
  }
  return out;
}

const courses = [];
for (const [rowIndex, row] of INSTITUTIONS.entries()) {
  const [instId, , , country, city] = row;
  const explicit = row[11];
  const c = COUNTRIES[country];

  // Densify each institution's catalogue with extra specializations: for the
  // first two bachelor fields it teaches, add the next unused programme name
  // (never auto-adding MBBS — medicine only exists where explicitly placed).
  const specs = [...explicit];
  const seenFields = [];
  for (const [field, , level, band] of explicit) {
    if (level !== 'b' || seenFields.includes(field)) continue;
    seenFields.push(field);
    const used = new Set(explicit.filter(([f, , l]) => f === field && l === 'b').map(([, i]) => i));
    const names = COURSE_NAMES[field];
    let added = 0;
    // Offset by institution so different universities surface different
    // specializations (HR at one, Banking at the next, …).
    for (let k = 0; k < names.length && added < 2; k += 1) {
      const idx = (rowIndex + k) % names.length;
      if (used.has(idx)) continue;
      if (field === 'health' && idx === 1) continue;
      // No undergraduate LLB in the US/Canada — law there is a graduate degree.
      if (field === 'law' && idx === 0 && ['US', 'CA'].includes(country)) continue;
      specs.push([field, idx, 'b', Math.max(1, band)]);
      used.add(idx);
      added += 1;
    }
  }
  specs.forEach(([field, nameIdx, levelCode, band], i) => {
    const level = levelCode === 'b' ? 'bachelor' : levelCode === 'f' ? 'foundation' : 'diploma';
    const isMed = level === 'bachelor' && field === 'health' && nameIdx === 1;
    const name = level === 'bachelor' ? COURSE_NAMES[field][nameIdx] : PATHWAY_NAMES[level === 'foundation' ? 'foundation' : 'diploma'][field] ?? `${level === 'foundation' ? 'Foundation' : 'Diploma'} in ${field}`;
    const base = (isMed ? TUITION[country].med : TUITION[country][field]) * (TUITION_MULT[instId] ?? 1);
    const levelMult = level === 'foundation' ? 0.55 : level === 'diploma' ? 0.65 : 1;
    const selMult = level === 'bachelor' ? 0.85 + 0.09 * band : 1;
    const tuitionPerYear = round50(base * levelMult * selMult);
    const durationYears = level === 'foundation' ? 1 : level === 'diploma' ? 2
      : isMed ? (['TW', 'RU', 'CN'].includes(country) ? 6 : 5)
      : field === 'engineering' ? 4
      : ['TW', 'RU', 'US', 'CA', 'CN'].includes(country) ? 4 : 3;
    const ielts = level === 'foundation' ? 5.0 : level === 'diploma' ? 5.5 : isMed ? 7.0 : ENGLISH_BY_FIELD[field];
    const requiredDocuments = ['transcript', 'certificate', 'passport', 'english', 'statement', 'financial'];
    if (field === 'law' || field === 'education' || isMed) requiredDocuments.push('recommendation');
    if (isMed) requiredDocuments.push('health');
    if ((field === 'design' || field === 'architecture') && level === 'bachelor') requiredDocuments.push('portfolio');
    courses.push({
      id: `${instId}-c${i + 1}`,
      institutionId: instId,
      field, level, name,
      campusCity: city, country, currency: c.currency,
      durationYears, semestersPerYear: 2,
      intakes: nextIntakes(country),
      tuitionPerYear,
      tuitionPerSemester: round50(tuitionPerYear / 2),
      oneOffFees: {
        enrollment: c.enrolFee,
        ...(['engineering', 'it', 'health'].includes(field) ? { lab: Math.round(c.enrolFee * 1.5) } : {}),
        ...(['design', 'hospitality'].includes(field) ? { materials: c.enrolFee } : {}),
      },
      english: { ielts, toefl: TOEFL[ielts] },
      selectivity: band,
      requirements: requirementsForBand(band),
      localRequirementNote: level === 'bachelor'
        ? 'Local applicants: national matriculation or equivalent senior-secondary certificate; English requirement waived.'
        : 'Local applicants: completed secondary schooling; open entry with counselling session.',
      requiredDocuments,
      applicationFee: c.appFee,
      recognition: recognitionFor(field, isMed, country),
      ...(level !== 'bachelor' ? { pathwayFor: [field, ...(field === 'it' ? ['engineering', 'business'] : field === 'business' ? ['law', 'hospitality'] : field === 'engineering' ? ['it'] : field === 'health' ? [] : field === 'law' ? ['business'] : ['design'])] } : {}),
    });
  });
}

// Monthly rent by option, calibrated against early-2026 public rental data
// (SpareRoom/uhomes for UK, Australian student-housing guides, ohmyhome/cove
// for SG, bambooroutes for KL, findawayabroad for Taipei; other cities scaled
// from those anchors). [roomSuburb, roomCbd, studioSuburb, studioCbd, unitSuburb, unitCbd]
const RENT_DETAIL = {
  Sydney: [1200, 1700, 2100, 2600, 2300, 3000],
  Melbourne: [1000, 1500, 1900, 2400, 2100, 2700],
  Brisbane: [950, 1350, 1700, 2100, 1900, 2400],
  Perth: [900, 1250, 1550, 1950, 1800, 2200],
  'Kuala Lumpur': [800, 1300, 1500, 2300, 1800, 2800],
  Penang: [650, 1000, 1200, 1800, 1400, 2200],
  Cyberjaya: [700, 1000, 1300, 1800, 1500, 2100],
  'Johor Bahru': [600, 900, 1100, 1600, 1300, 1900],
  Taipei: [9000, 14000, 15000, 21000, 22000, 30000],
  Hsinchu: [7000, 10000, 11000, 15000, 16000, 22000],
  Taichung: [6500, 9500, 10000, 14000, 14000, 20000],
  Kaohsiung: [6000, 9000, 9500, 13000, 13000, 18000],
  London: [800, 1200, 1400, 1800, 1700, 2400],
  Manchester: [550, 750, 900, 1200, 1050, 1400],
  Edinburgh: [600, 800, 950, 1250, 1100, 1500],
  Birmingham: [500, 700, 850, 1100, 1000, 1300],
  Leeds: [480, 650, 800, 1050, 950, 1250],
  Singapore: [1100, 1600, 2100, 2800, 3100, 4000],
  Auckland: [950, 1300, 1650, 2100, 1900, 2400],
  Wellington: [850, 1150, 1500, 1900, 1750, 2200],
  Christchurch: [750, 1000, 1300, 1650, 1500, 1900],
  Dunedin: [650, 850, 1100, 1400, 1300, 1650],
  Moscow: [30000, 45000, 50000, 75000, 65000, 95000],
  'Saint Petersburg': [22000, 32000, 38000, 55000, 48000, 70000],
  Kazan: [15000, 22000, 26000, 38000, 33000, 48000],
  Novosibirsk: [13000, 19000, 23000, 33000, 30000, 43000],
  Boston: [1100, 1500, 2400, 3000, 2800, 3600],
  'New York': [1300, 1800, 2800, 3800, 3200, 4500],
  'Los Angeles': [1100, 1500, 2200, 2900, 2600, 3400],
  Chicago: [900, 1200, 1800, 2400, 2100, 2900],
  Toronto: [1000, 1400, 1900, 2400, 2200, 2900],
  Vancouver: [1050, 1450, 2000, 2500, 2300, 3000],
  Montreal: [700, 950, 1300, 1700, 1500, 2000],
  Beijing: [3000, 4500, 5500, 8000, 7000, 11000],
  Shanghai: [3200, 5000, 6000, 8500, 7500, 12000],
  Guangzhou: [2200, 3200, 4000, 6000, 5000, 8000],
};
// [utilities+internet+mobile per person / month, cheap eating-out meal]
const LIVING_EXTRA = {
  AU: [220, 22], MY: [250, 12], TW: [2200, 120], GB: [160, 14],
  SG: [180, 9], NZ: [200, 20], RU: [6000, 500],
  US: [180, 18], CA: [150, 17], CN: [400, 25],
};

const cityInfo = Object.entries(CITY_INFO).map(([city, [climate, safety]]) => ({
  city,
  country: CITY_COL[city][0],
  climate,
  safety,
}));

const costOfLiving = Object.entries(CITY_COL).map(([city, [country, , food, transport]]) => {
  const [roomSuburb, roomCbd, studioSuburb, studioCbd, unitSuburb, unitCbd] = RENT_DETAIL[city];
  const [utilitiesMonthly, eatingOutMeal] = LIVING_EXTRA[country];
  return {
    city, country, currency: COUNTRIES[country].currency,
    // Budget default used in every total: a shared room in a suburb.
    rentMonthly: roomSuburb,
    rentOptions: { roomSuburb, roomCbd, studioSuburb, studioCbd, unitSuburb, unitCbd },
    foodMonthly: food, transportMonthly: transport,
    utilitiesMonthly, eatingOutMeal,
    insuranceYearly: COUNTRIES[country].insuranceYearly,
    visaFeeOneOff: COUNTRIES[country].visaFee,
  };
});

const TYPE_TIPS = {
  food: ['Go hungry and stall-hop — split dishes so you can try more', 'Weeknights are cheaper and less crowded than weekends'],
  nature: ['Golden hour is the photo moment — arrive an hour before sunset', 'Wear real shoes; the best viewpoints need a short walk'],
  shopping: ['Student discounts are common — always show your student ID', 'Weekday mornings are the quietest time to browse'],
  landmark: ['Book tickets online to skip the queue', 'Free walking tours usually start nearby — check the schedule'],
  nightlife: ['Go with your intake group and split the ride home', 'Many venues run student nights early in the week'],
  sports: ["Match-day atmosphere is worth it even if you don't follow the sport", 'Student tickets are usually the cheapest way in'],
};

const attractions = [];
for (const inst of institutions) {
  const pool = CITY_ATTRACTIONS[inst.city];
  pool.forEach(([name, type, mins, description], i) => {
    attractions.push({
      id: `${inst.id}-a${i + 1}`,
      institutionId: inst.id,
      name, type,
      distanceMinutes: Math.max(4, mins + Math.floor(rand() * 11) - 5),
      description,
      image: `https://picsum.photos/seed/${inst.id}-a${i}/400/300`,
      tips: TYPE_TIPS[type],
    });
  });
}

// -------------------------------------------------------------- scholarships
// Real, well-known scholarship programmes from the real institutions and
// governments in the app (providers match Institution.name exactly so each
// school page can list its own awards). Amounts/terms are indicative — the
// link opens the provider's official site to apply. Sector awards from
// fictional sponsors stay clearly labelled (mock) and carry no link.
const scholarships = [
  ['sch-01', 'UniBridge Global Merit Scholarship', 'UniBridge Partners', 'any', 'any', 'any', 'partial', { percentTuition: 25 }, '2026-11-30', 'Automatic consideration with any application through UniBridge; awarded on academic merit.', null],
  ['sch-02', 'Monash International Merit Scholarship', 'Monash University', 'AU', 'any', 'any', 'partial', { amount: 10000, currency: 'AUD' }, '2026-10-31', 'Indicative A$10,000/yr for high-achieving international students; apply via the official page.', 'https://www.monash.edu'],
  ['sch-03', 'Sydney International Student Award', 'University of Sydney', 'AU', 'any', 'any', 'partial', { percentTuition: 20 }, '2026-09-30', 'Faculty-based awards for incoming internationals; automatic with course application.', 'https://www.sydney.edu.au'],
  ['sch-04', 'Destination Australia Scholarship', 'Australian Government', 'AU', 'any', 'any', 'partial', { amount: 15000, currency: 'AUD' }, '2027-01-15', 'For study at regional campuses; one year, renewable. Check participating campuses.', 'https://www.education.gov.au'],
  ['sch-05', 'Melbourne International Undergraduate Scholarship', 'University of Melbourne', 'AU', 'any', 'any', 'partial', { percentTuition: 50 }, '2026-12-15', 'Indicative 50% fee remission for top-ranked international applicants; automatic consideration.', 'https://www.unimelb.edu.au'],
  ["sch-06", "Taylor's World Class Scholarship", "Taylor's University", 'MY', 'any', 'any', 'full', { percentTuition: 100 }, '2026-11-01', 'Flagship award for outstanding results and leadership; separate application and interview.', 'https://university.taylors.edu.my'],
  ['sch-07', 'Taiwan Scholarship (MOE)', 'Taiwan Ministry of Education', 'TW', 'any', 'any', 'full', { percentTuition: 100, stipendMonthly: 15000 }, '2026-10-15', 'Government award: tuition plus NT$15,000/month stipend; apply via your local Taipei mission.', 'https://www.studyintaiwan.org'],
  ['sch-08', 'Jeffrey Cheah Entrance Scholarship', 'Sunway University', 'MY', 'any', 'any', 'partial', { percentTuition: 60 }, '2027-01-31', 'Merit entrance award administered by the Jeffrey Cheah Foundation.', 'https://sunwayuniversity.edu.my'],
  ['sch-09', 'UCL Global Undergraduate Scholarship', 'UCL', 'GB', 'any', 'any', 'full', { percentTuition: 100 }, '2026-12-01', 'Need-based full fees plus living support for internationals; separate online application.', 'https://www.ucl.ac.uk'],
  ['sch-10', 'Global Futures Scholarship', 'University of Manchester', 'GB', 'any', 'any', 'partial', { amount: 8000, currency: 'GBP' }, '2027-02-28', 'Indicative £8,000 tuition discount for selected international undergraduates.', 'https://www.manchester.ac.uk'],
  ['sch-11', 'LSE Undergraduate Support Scheme', 'London School of Economics', 'GB', 'any', 'any', 'partial', { percentTuition: 50 }, '2026-11-30', 'Means-tested support for overseas undergraduates; apply after receiving an offer.', 'https://www.lse.ac.uk'],
  ['sch-12', 'ASEAN Undergraduate Scholarship', 'National University of Singapore', 'SG', 'any', ['MY', 'ID', 'VN'], 'full', { percentTuition: 100, stipendMonthly: 800 }, '2026-10-01', 'Bond-free full scholarship with annual allowance for ASEAN nationals.', 'https://www.nus.edu.sg'],
  ['sch-13', 'SMU Global Impact Scholarship', 'Singapore Management University', 'SG', 'any', 'any', 'full', { percentTuition: 100 }, '2027-03-15', 'Full-term award for changemakers; essays and interview required.', 'https://www.smu.edu.sg'],
  ['sch-14', 'University of Otago International Entrance Scholarship', 'University of Otago', 'NZ', 'any', 'any', 'partial', { amount: 10000, currency: 'NZD' }, '2026-12-20', 'Indicative NZ$10,000 first-year credit, awarded on academic merit.', 'https://www.otago.ac.nz'],
  ['sch-15', 'International Student Excellence Scholarship', 'University of Auckland', 'NZ', 'any', 'any', 'partial', { amount: 10000, currency: 'NZD' }, '2027-01-10', 'Merit award for new international undergraduates; automatic consideration.', 'https://www.auckland.ac.nz'],
  ['sch-16', 'Open Doors Russian Scholarship Project', 'Open Doors (Russian Government)', 'RU', 'any', 'any', 'full', { percentTuition: 100 }, '2026-12-10', 'Olympiad-style selection; covers full tuition at participating universities.', 'https://od.globaluni.ru'],
  ['sch-17', 'Russian Government Quota Scholarship', 'Russian Government', 'RU', ['engineering', 'it'], 'any', 'full', { percentTuition: 100 }, '2027-02-01', 'State-funded places with dormitory; apply through your country quota.', 'https://education-in-russia.com'],
  ['sch-18', 'ASEAN Future Leaders Fund', 'ASEAN Foundation (mock)', 'any', 'any', ['MY', 'SG', 'ID', 'VN'], 'partial', { amount: 5000, currency: 'USD' }, '2026-11-15', 'Community-leadership track record required.', null],
  ['sch-19', 'Chinese Bridge Overseas Study Grant', 'CB Foundation (mock)', 'any', 'any', ['CN', 'TW'], 'partial', { percentTuition: 30 }, '2027-01-20', 'For Chinese-speaking students studying abroad.', null],
  ['sch-20', 'Global Women in STEM Scholarship', 'WiSTEM International (mock)', 'any', ['it', 'engineering'], 'any', 'partial', { percentTuition: 35 }, '2026-12-31', 'Open to women applicants in STEM programmes.', null],
  ['sch-21', 'Hospitality Futures Bursary', 'Global Hotels Group (mock)', 'any', ['hospitality'], 'any', 'partial', { amount: 4000, currency: 'USD' }, '2027-02-15', 'Includes a paid internship placement.', null],
  ['sch-22', 'HealthCare Heroes Grant', 'HealthBridge Foundation (mock)', 'any', ['health'], 'any', 'partial', { percentTuition: 25 }, '2027-03-01', 'For future nurses, pharmacists and doctors.', null],
  ['sch-23', 'William Angliss Scholarships', 'William Angliss Institute', 'AU', ['hospitality'], 'any', 'partial', { amount: 5000, currency: 'AUD' }, '2026-10-20', 'Industry-sponsored awards across foods, tourism and hospitality programmes.', 'https://www.angliss.edu.au'],
  ['sch-24', '#YouAreWelcomeHere Scholarship', '#YouAreWelcomeHere (US campuses)', 'US', 'any', 'any', 'partial', { percentTuition: 50 }, '2026-12-05', 'At least 50% tuition at participating US campuses; essay on intercultural exchange.', 'https://www.youarewelcomehereusa.org'],
  ['sch-25', 'Lester B. Pearson International Scholarship', 'University of Toronto', 'CA', 'any', 'any', 'full', { percentTuition: 100 }, '2027-01-25', 'Full tuition, books and residence for exceptional school leaders; school nomination needed.', 'https://www.utoronto.ca'],
  ['sch-26', 'Chinese Government Scholarship (CSC)', 'China Scholarship Council', 'CN', 'any', 'any', 'full', { percentTuition: 100, stipendMonthly: 2500 }, '2026-11-20', 'Full tuition, dormitory and monthly stipend; Mandarin course included.', 'https://www.campuschina.org'],
  ['sch-27', 'International Major Entrance Scholarship', 'University of British Columbia', 'CA', 'any', 'any', 'partial', { amount: 20000, currency: 'CAD' }, '2027-02-10', 'Renewable merit award for outstanding international entrants; automatic consideration.', 'https://www.ubc.ca'],
  ['sch-28', 'Illinois Tech Merit Scholarship', 'Illinois Institute of Technology', 'US', ['it', 'engineering', 'science'], 'any', 'partial', { amount: 25000, currency: 'USD' }, '2027-01-05', 'Automatic merit consideration with admission; indicative US$25,000/yr.', 'https://www.iit.edu'],
].map(([id, name, provider, destinationCountry, fields, nationalities, coverageType, money, deadline, eligibilityNote, link]) => ({
  id, name, provider, destinationCountry, fields, nationalities, coverageType, ...money, deadline, eligibilityNote,
  ...(link ? { link } : {}),
}));

// --------------------------------------------------------------- ambassadors
const AMB = [
  ['Aina Zulkifli', 'MY', 'au-monash', 'Bachelor of Business Administration', 2, 'KL girl figuring out Melbourne one flat white at a time. Ask me about homestays and part-time café work.', 32],
  ['Wei Jun Tan', 'MY', 'au-unsw', 'Bachelor of Engineering (Civil)', 3, 'UEC grad from Penang. I run the Malaysian Students Society BBQ — yes there is sambal.', 11],
  ['Yi-Chen Lin', 'TW', 'au-monash', 'Bachelor of Computer Science', 2, 'Taipei → Melbourne. I map every night market substitute this city has.', 44],
  ['Marcus Lim', 'SG', 'gb-kcl', 'Bachelor of Laws (LLB)', 3, 'Mooting, mock trials and meal-prepping in London on a student budget.', 12],
  ['Putri Wijaya', 'ID', 'my-um', 'Bachelor of Science (Mathematics & Statistics)', 2, 'From Jakarta, at home in KL. Halal food guide and bus-route encyclopaedia.', 47],
  ['Minh Anh Nguyen', 'VN', 'ru-msu', 'Bachelor of Medicine, Bachelor of Surgery (MBBS)', 4, 'Hanoi to Moscow. Yes, anatomy in two languages is possible — DM me.', 26],
  ['Zihan Wang', 'CN', 'gb-manchester', 'Bachelor of IT (Data Analytics)', 2, 'Chengdu hotpot loyalist reviewing every Manchester hotpot for science.', 59],
  ['Nurul Izzah', 'MY', 'my-um', 'Bachelor of Laws (LLB)', 3, 'Moot court addict. I mentor SPM leavers on scholarship essays.', 45],
  ['Chia-Hao Chen', 'TW', 'tw-ntu', 'Bachelor of Computer Science', 3, 'GSAT survivor. I intern at a Hsinchu fab on weekdays.', 15],
  ['Siti Rahmah', 'MY', 'sg-nus', 'Bachelor of Commerce (Finance)', 2, 'JB → SG commuter turned hostelite. Budget spreadsheets are my love language.', 49],
  ['Dewi Lestari', 'ID', 'sg-nus', 'Bachelor of Computer Science', 3, 'Hackathon regular. I keep a list of every free food event on campus.', 25],
  ['Thanh Pham', 'VN', 'tw-ntu', 'Bachelor of Business Administration', 2, 'Saigon skater sketching Taipei. Portfolio tips welcome.', 53],
  ['Jia Le Ong', 'SG', 'nz-auckland', 'Bachelor of Business Administration', 2, 'Swapped MRT for hiking boots. Auckland weekends are for waterfalls.', 33],
  ['Hui Min Teo', 'MY', 'gb-edinburgh', 'Bachelor of Science (Physics)', 3, 'Lab days, Munro weekends. Edinburgh winters are survivable, promise.', 20],
  ['Xin Yi Loh', 'MY', 'my-mmu', 'Bachelor of Software Engineering', 2, 'Cyberjaya nights, Grab-ride playlists, and open-source everything.', 31],
  ['Anastasia Kim', 'CN', 'ru-itmo', 'Bachelor of Software Engineering', 3, 'Harbin → St Petersburg. White nights make exam season weirdly fun.', 24],
  ['Grace Huang', 'TW', 'us-nyu', 'Bachelor of Banking & Finance', 2, 'Taipei → Manhattan. Museum member, bagel critic, spreadsheet queen.', 35],
  ['Daniel Wong', 'MY', 'ca-utoronto', 'Bachelor of Computer Science', 3, 'KL to Toronto. Yes you survive −15°C — layering guide in my posts.', 13],
  ['Xiao Chen', 'CN', 'cn-tsinghua', 'Bachelor of Engineering (Electrical)', 2, 'Beijing native. Campus bike routes and dorm hacks for internationals.', 52],
  ['Amira Binti Salleh', 'MY', 'ca-georgebrown', 'Bachelor of Culinary Arts Management', 1, 'From Penang kopitiam to Toronto test kitchens. Knife kit always packed.', 29],
];
const POST_TEXTS = [
  'Orientation week done! The seniors literally walk you to your first class here.',
  'Monthly budget breakdown in my bio link — rent is the big one, everything else is manageable.',
  'Campus library at 2am during finals. The free coffee cart is a lifesaver.',
  'Found the best cheap lunch near campus — full plate under 5 bucks if you go before noon.',
  'Joined the badminton club. Instant friend group, would recommend to every freshie.',
  'Tip: open your student bank account in week 1, the queue doubles by week 3.',
  'Weekend trip with my intake group. This is why you join the group chat early!',
  'My part-time gig at the campus café covers groceries. Work rights are limited — check yours!',
];
const ambassadors = AMB.map(([name, homeCountry, institutionId, courseName, year, bio, img], i) => ({
  id: `amb-${String(i + 1).padStart(2, '0')}`,
  name, homeCountry, institutionId, courseName, year, bio,
  avatar: `https://i.pravatar.cc/300?img=${img}`,
  posts: [0, 1, ...(i % 2 === 0 ? [2] : [])].map((p) => ({
    id: `amb-${i + 1}-p${p + 1}`,
    text: POST_TEXTS[(i + p * 3) % POST_TEXTS.length],
    image: `https://picsum.photos/seed/amb-${i}-${p}/600/400`,
    likes: 12 + Math.floor(rand() * 220),
    date: `2026-0${(p % 6) + 2}-${String(3 + ((i * 7 + p * 11) % 25)).padStart(2, '0')}`,
  })),
}));

// Community-verified cost data: ambassadors living in a city vouch for its
// figures. Cities with no ambassador stay unverified — the UI must then show
// an "Estimated" label, never a fake badge.
{
  const cityByInst = Object.fromEntries(institutions.map((x) => [x.id, x.city]));
  for (const col of costOfLiving) {
    const verifiers = ambassadors.filter((a) => cityByInst[a.institutionId] === col.city).map((a) => a.id);
    col.verifiedBy = verifiers;
    col.lastVerified = verifiers.length ? `2026-07-${String(4 + ((col.city.length * 3) % 24)).padStart(2, '0')}` : null;
  }
}

// -------------------------------------------------------------------- safety
// Trust layer data: separate emergency lines per country plus the nearest
// home-country mission for each nationality x destination. Names and cities
// are the real missions; addresses and phones are indicative for the
// prototype (rounded numbers) and the UI says to verify before travelling.
const EMERGENCY_LINES = {
  AU: { police: '000', ambulance: '000', fire: '000' },
  MY: { police: '999', ambulance: '999', fire: '994' },
  TW: { police: '110', ambulance: '119', fire: '119' },
  GB: { police: '999', ambulance: '999', fire: '999' },
  SG: { police: '999', ambulance: '995', fire: '995' },
  NZ: { police: '111', ambulance: '111', fire: '111' },
  RU: { police: '102', ambulance: '103', fire: '101' },
  US: { police: '911', ambulance: '911', fire: '911' },
  CA: { police: '911', ambulance: '911', fire: '911' },
  CN: { police: '110', ambulance: '120', fire: '119' },
};

// [name, city, address, phone, afterHours|null]; null entry = studying at home.
const EMBASSIES_RAW = {
  AU: {
    MY: ['Malaysian High Commission', 'Canberra', '7 Perth Avenue, Yarralumla ACT', '+61 2 6120 0000', '+61 4 1900 0001'],
    TW: ['Taipei Economic and Cultural Office', 'Canberra', 'Tourism House, 40 Blackall Street, Barton ACT', '+61 2 6120 1000', null],
    SG: ['Singapore High Commission', 'Canberra', '17 Forster Crescent, Yarralumla ACT', '+61 2 6270 0000', '+61 4 1900 0002'],
    ID: ['Embassy of Indonesia', 'Canberra', '8 Darwin Avenue, Yarralumla ACT', '+61 2 6250 0000', '+61 4 1900 0003'],
    VN: ['Embassy of Vietnam', 'Canberra', '6 Timbarra Crescent, O’Malley ACT', '+61 2 6286 0000', null],
    CN: ['Embassy of China', 'Canberra', '15 Coronation Drive, Yarralumla ACT', '+61 2 6228 0000', '+61 4 1900 0004'],
    MM: ['Embassy of Myanmar', 'Canberra', '22 Arkana Street, Yarralumla ACT', '+61 2 6273 0000', null],
    KR: ['Embassy of the Republic of Korea', 'Canberra', '113 Empire Circuit, Yarralumla ACT', '+61 2 6270 4100', '+61 4 1900 0005'],
    JP: ['Embassy of Japan', 'Canberra', '112 Empire Circuit, Yarralumla ACT', '+61 2 6273 3244', '+61 4 1900 0006'],
  },
  MY: {
    MY: null,
    TW: ['Taipei Economic and Cultural Office in Malaysia', 'Kuala Lumpur', 'Level 7, Menara Yayasan Tun Razak, Jalan Bukit Bintang', '+60 3 2161 0000', null],
    SG: ['Singapore High Commission', 'Kuala Lumpur', '209 Jalan Tun Razak', '+60 3 2161 6000', '+60 12 000 0002'],
    ID: ['Embassy of Indonesia', 'Kuala Lumpur', '233 Jalan Tun Razak', '+60 3 2116 0000', '+60 12 000 0003'],
    VN: ['Embassy of Vietnam', 'Kuala Lumpur', '4 Persiaran Stonor', '+60 3 2148 0000', null],
    CN: ['Embassy of China', 'Kuala Lumpur', '229 Jalan Ampang', '+60 3 2143 0000', '+60 12 000 0004'],
    MM: ['Embassy of Myanmar', 'Kuala Lumpur', '8C Jalan Ampang Hilir', '+60 3 4251 0000', null],
    KR: ['Embassy of the Republic of Korea', 'Kuala Lumpur', '9 & 11 Jalan Nipah, Off Jalan Ampang', '+60 3 4251 2336', '+60 12 000 0005'],
    JP: ['Embassy of Japan', 'Kuala Lumpur', '11 Persiaran Stonor, Off Jalan Tun Razak', '+60 3 2177 2600', '+60 12 000 0006'],
  },
  TW: {
    MY: ['Malaysian Friendship & Trade Centre', 'Taipei', '8F, San Ho Plastics Building, Hsin Yi District', '+886 2 2716 0000', null],
    TW: null,
    SG: ['Singapore Trade Office in Taipei', 'Taipei', '9F, 85 Ren Ai Road Section 4', '+886 2 2772 0000', null],
    ID: ['Indonesian Economic and Trade Office', 'Taipei', '6F, 550 Rui Guang Road, Neihu District', '+886 2 8752 0000', null],
    VN: ['Vietnam Economic and Cultural Office', 'Taipei', '3F, 65 Sung Chiang Road', '+886 2 2516 0000', null],
    CN: ['Cross-strait student service line (ARATS)', 'Taipei', 'Hotline service — no walk-in office', '+886 2 2712 0000', null],
    MM: ['Embassy of Myanmar, Bangkok (covers Taiwan)', 'Bangkok', '132 Sathorn Nua Road', '+66 2 233 0000', null],
    KR: ['Korean Mission in Taipei', 'Taipei', 'Room 1506, 333 Keelung Road Section 1', '+886 2 2758 8320', null],
    JP: ['Japan–Taiwan Exchange Association', 'Taipei', '28 Qingcheng Street, Songshan District', '+886 2 2713 8000', null],
  },
  GB: {
    MY: ['Malaysian High Commission', 'London', '45 Belgrave Square', '+44 20 7235 0000', '+44 77 0000 0001'],
    TW: ['Taipei Representative Office in the UK', 'London', '50 Grosvenor Gardens', '+44 20 7881 0000', null],
    SG: ['Singapore High Commission', 'London', '9 Wilton Crescent', '+44 20 7235 8000', '+44 77 0000 0002'],
    ID: ['Embassy of Indonesia', 'London', '30 Great Peter Street', '+44 20 7499 0000', '+44 77 0000 0003'],
    VN: ['Embassy of Vietnam', 'London', '12-14 Victoria Road', '+44 20 7937 0000', null],
    CN: ['Embassy of China', 'London', '49-51 Portland Place', '+44 20 7299 0000', '+44 77 0000 0004'],
    MM: ['Embassy of Myanmar', 'London', '19A Charles Street, Mayfair', '+44 20 7148 0000', null],
    KR: ['Embassy of the Republic of Korea', 'London', '60 Buckingham Gate', '+44 20 7227 5500', '+44 77 0000 0005'],
    JP: ['Embassy of Japan', 'London', '101–104 Piccadilly', '+44 20 7465 6500', '+44 77 0000 0006'],
  },
  SG: {
    MY: ['Malaysian High Commission', 'Singapore', '301 Jervois Road', '+65 6235 0000', '+65 8000 0001'],
    TW: ['Taipei Representative Office in Singapore', 'Singapore', '460 Alexandra Road, PSA Building', '+65 6500 0000', null],
    SG: null,
    ID: ['Embassy of Indonesia', 'Singapore', '7 Chatsworth Road', '+65 6737 0000', '+65 8000 0002'],
    VN: ['Embassy of Vietnam', 'Singapore', '10 Leedon Park', '+65 6462 0000', null],
    CN: ['Embassy of China', 'Singapore', '150 Tanglin Road', '+65 6418 0000', '+65 8000 0003'],
    MM: ['Embassy of Myanmar', 'Singapore', "15 St. Martin's Drive", '+65 6735 0000', null],
    KR: ['Embassy of the Republic of Korea', 'Singapore', '47 Scotts Road, Goldbell Towers', '+65 6256 1188', null],
    JP: ['Embassy of Japan', 'Singapore', '16 Nassim Road', '+65 6235 8855', null],
  },
  NZ: {
    MY: ['Malaysian High Commission', 'Wellington', '10 Washington Avenue, Brooklyn', '+64 4 385 0000', null],
    TW: ['Taipei Economic and Cultural Office', 'Wellington', 'Level 23, Majestic Centre, 100 Willis Street', '+64 4 473 0000', null],
    SG: ['Singapore High Commission', 'Wellington', '17 Kabul Street, Khandallah', '+64 4 470 0000', null],
    ID: ['Embassy of Indonesia', 'Wellington', '70 Glen Road, Kelburn', '+64 4 475 0000', null],
    VN: ['Embassy of Vietnam', 'Wellington', 'Level 21, Grand Plimmer Tower', '+64 4 473 5000', null],
    CN: ['Embassy of China', 'Wellington', '2-6 Glenmore Street, Kelburn', '+64 4 472 0000', null],
    MM: ['Embassy of Myanmar, Canberra (accredited to NZ)', 'Canberra', '22 Arkana Street, Yarralumla ACT', '+61 2 6273 0000', null],
    KR: ['Embassy of the Republic of Korea', 'Wellington', 'Level 11, 34–42 Manners Street', '+64 4 473 9073', null],
    JP: ['Embassy of Japan', 'Wellington', 'Level 18, Majestic Centre, 100 Willis Street', '+64 4 473 1540', null],
  },
  RU: {
    MY: ['Embassy of Malaysia', 'Moscow', 'Mosfilmovskaya Ulitsa 50', '+7 495 147 0000', null],
    TW: ['Taipei-Moscow Coordination Commission Office', 'Moscow', '24/2 Tverskaya Street, Korpus 1', '+7 495 956 0000', null],
    SG: ['Embassy of Singapore', 'Moscow', 'Per. Kamennaya Sloboda 5', '+7 499 241 0000', null],
    ID: ['Embassy of Indonesia', 'Moscow', 'Novokuznetskaya Ulitsa 12', '+7 495 951 0000', null],
    VN: ['Embassy of Vietnam', 'Moscow', 'Bolshaya Pirogovskaya 13', '+7 499 245 0000', null],
    CN: ['Embassy of China', 'Moscow', 'Ulitsa Druzhby 6', '+7 499 143 0000', null],
    MM: ['Embassy of Myanmar', 'Moscow', 'Ulitsa Gertsena 41', '+7 495 291 0000', null],
    KR: ['Embassy of the Republic of Korea', 'Moscow', 'Plyushchikha Ulitsa 56', '+7 495 783 2727', null],
    JP: ['Embassy of Japan', 'Moscow', 'Grokholsky Pereulok 27', '+7 495 229 2550', null],
  },
  US: {
    MY: ['Embassy of Malaysia', 'Washington DC', '3516 International Court NW', '+1 202 572 0000', '+1 202 600 0001'],
    TW: ['Taipei Economic and Cultural Representative Office', 'Washington DC', '4201 Wisconsin Avenue NW', '+1 202 895 0000', null],
    SG: ['Embassy of Singapore', 'Washington DC', '3501 International Place NW', '+1 202 537 0000', '+1 202 600 0002'],
    ID: ['Embassy of Indonesia', 'Washington DC', '2020 Massachusetts Avenue NW', '+1 202 775 0000', '+1 202 600 0003'],
    VN: ['Embassy of Vietnam', 'Washington DC', '1233 20th Street NW', '+1 202 861 0000', null],
    CN: ['Embassy of China', 'Washington DC', '3505 International Place NW', '+1 202 495 0000', '+1 202 600 0004'],
    MM: ['Embassy of Myanmar', 'Washington DC', '2300 S Street NW', '+1 202 332 0000', null],
    KR: ['Embassy of the Republic of Korea', 'Washington DC', '2450 Massachusetts Avenue NW', '+1 202 939 5600', '+1 202 600 0005'],
    JP: ['Embassy of Japan', 'Washington DC', '2520 Massachusetts Avenue NW', '+1 202 238 6700', '+1 202 600 0006'],
  },
  CA: {
    MY: ['High Commission of Malaysia', 'Ottawa', '60 Boteler Street', '+1 613 241 0000', '+1 613 600 0001'],
    TW: ['Taipei Economic and Cultural Office', 'Ottawa', '45 O’Connor Street, Suite 1960', '+1 613 231 0000', null],
    SG: ['Embassy of Singapore (accredited to Canada)', 'Washington DC', '3501 International Place NW', '+1 202 537 0000', null],
    ID: ['Embassy of Indonesia', 'Ottawa', '55 Parkdale Avenue', '+1 613 724 0000', null],
    VN: ['Embassy of Vietnam', 'Ottawa', '55 MacKay Street', '+1 613 236 0000', null],
    CN: ['Embassy of China', 'Ottawa', '515 St. Patrick Street', '+1 613 789 0000', null],
    MM: ['Embassy of Myanmar', 'Ottawa', '336 Island Park Drive', '+1 613 232 0000', null],
    KR: ['Embassy of the Republic of Korea', 'Ottawa', '150 Boteler Street', '+1 613 244 5010', null],
    JP: ['Embassy of Japan', 'Ottawa', '255 Sussex Drive', '+1 613 241 8541', null],
  },
  CN: {
    MY: ['Embassy of Malaysia', 'Beijing', '2 Liangmaqiao Bei Jie, Chaoyang District', '+86 10 6532 0000', '+86 138 0000 0001'],
    TW: ['Straits Exchange Foundation 24h line (Taipei)', 'Taipei', 'Hotline service for students in the mainland', '+886 2 2712 9000', null],
    SG: ['Embassy of Singapore', 'Beijing', '1 Xiushui Bei Jie, Jianguomenwai', '+86 10 6532 1000', null],
    ID: ['Embassy of Indonesia', 'Beijing', '4 Dongzhimenwai Da Jie, Chaoyang District', '+86 10 6532 5000', null],
    VN: ['Embassy of Vietnam', 'Beijing', '32 Guanghua Road, Jianguomenwai', '+86 10 6532 1100', null],
    CN: null,
    MM: ['Embassy of Myanmar', 'Beijing', '6 Dongzhimenwai Da Jie, Chaoyang District', '+86 10 6532 0359', null],
    KR: ['Embassy of the Republic of Korea', 'Beijing', '20 Dongfang Dong Lu, Chaoyang District', '+86 10 8531 0700', null],
    JP: ['Embassy of Japan', 'Beijing', '1 Liangmaqiao Dong Jie, Chaoyang District', '+86 10 8531 9800', null],
  },
};
const embassies = Object.fromEntries(
  Object.entries(EMBASSIES_RAW).map(([dest, byNat]) => [
    dest,
    Object.fromEntries(
      Object.entries(byNat).map(([nat, e]) => [
        nat,
        e ? { name: e[0], city: e[1], address: e[2], phone: e[3], afterHours: e[4] ?? undefined } : null,
      ]),
    ),
  ]),
);
const safety = { emergencyLines: EMERGENCY_LINES, embassies };

// ------------------------------------------------------------------ reviews
// Indicative student ratings shown with a clear "sample" label — the live
// Google reviews feed connects at launch (Places API). Tone stays fair:
// mostly positive with one mild mixed review, never harsh claims about a
// real school.
const REVIEW_AUTHORS = [
  ['Wei Ling', 'MY'], ['Arif', 'MY'], ['Mei Chen', 'TW'], ['Jun Ho', 'SG'], ['Sinta', 'ID'],
  ['Thao', 'VN'], ['Yuxi', 'CN'], ['Nadia', 'MY'], ['Kevin', 'SG'], ['Putra', 'ID'],
];
const REVIEW_POS = [
  'Lecturers actually reply to emails and the international office walked me through every visa step.',
  'Campus is easy to get around and the library has more than enough quiet space even in exam weeks.',
  'Orientation made it easy to find friends — clubs signed me up in my first week.',
  'Facilities are modern and well-maintained; labs and study rooms are bookable through the app.',
  'Great support for international students — airport pickup and a buddy programme in week one.',
  'Classes are practical and industry-linked; my internship came through a campus career fair.',
  'Food options around campus are affordable and halal/vegetarian choices are easy to find.',
];
const REVIEW_MIXED = [
  'Good teaching overall, though popular electives fill fast — set an alarm for enrolment day.',
  'Solid experience, but administration can be slow at peak periods; plan document requests early.',
  'Loved the campus; housing nearby is tight at intake season so start looking early.',
];
const reviews = Object.fromEntries(institutions.map((inst, i) => {
  const rating = Math.round((4.0 + rand() * 0.8) * 10) / 10;
  const count = 120 + Math.floor(rand() * 900);
  const pick = (arr, k) => arr[(i * 3 + k) % arr.length];
  const mk = (k, stars, text) => {
    const [author, homeCountry] = REVIEW_AUTHORS[(i * 2 + k) % REVIEW_AUTHORS.length];
    return {
      author, homeCountry, stars, text,
      date: `2026-0${(k * 2 + (i % 3)) % 6 + 1}-${String(4 + ((i * 5 + k * 9) % 24)).padStart(2, '0')}`,
    };
  };
  return [inst.id, {
    rating, count,
    reviews: [
      mk(0, 5, pick(REVIEW_POS, 0)),
      mk(1, 4, pick(REVIEW_POS, 1)),
      mk(2, rating >= 4.5 ? 4 : 3, pick(REVIEW_MIXED, 2)),
    ],
  }];
}));

// ----------------------------------------------------------------- community
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const groupInsts = ['au-monash', 'au-unsw', 'my-um', 'my-taylors', 'tw-ntu', 'gb-manchester', 'sg-nus', 'nz-auckland', 'ru-itmo', 'us-nyu', 'ca-utoronto', 'cn-tsinghua'];
const intakeGroups = groupInsts.map((iid) => {
  const inst = institutions.find((x) => x.id === iid);
  const intake = nextIntakes(inst.country, 4).find((x) => x.startsWith('2027'));
  const [, m] = intake.split('-');
  return {
    id: `grp-${iid}-${intake}`,
    institutionId: iid,
    intake,
    name: `${inst.short} ${MONTHS[Number(m) - 1]} 2027`,
    members: 40 + Math.floor(rand() * 180),
  };
});

const MSG_AUTHORS = [
  ['Aina', 32], ['Marcus', 12], ['Putri', 47], ['Wei Jun', 11], ['Yi-Chen', 44],
  ['Minh Anh', 26], ['Zihan', 59], ['Siti', 49], ['Jia Le', 33], ['Hui Min', 20],
];
const MSG_TEXTS = [
  'Hi everyone! Just accepted my offer — see you at orientation! 🎉',
  'Anyone else flying in from KL? Thinking of booking the same flight.',
  'Has anyone sorted accommodation yet? Looking at on-campus vs shared flat.',
  'The visa appointment took me 20 minutes, bring printed bank statements!',
  'Is anyone arriving a week early? Planning a city walk before orientation.',
  'Pro tip from a senior: buy your transport card at the airport, big queue in town.',
  'Just got my CoE today!! It suddenly feels real 😭',
  'Making a spreadsheet of who lands when — drop your flight if you want airport buddies.',
  'Which bank is everyone using? Heard the student account has no fees.',
  'Reminder: the uni housing portal opens Monday 9am, alarms on!',
];
const groupMessages = [];
intakeGroups.forEach((g, gi) => {
  for (let m = 0; m < 8; m += 1) {
    const [author, img] = MSG_AUTHORS[(gi + m) % MSG_AUTHORS.length];
    groupMessages.push({
      id: `${g.id}-m${m + 1}`,
      groupId: g.id,
      author,
      avatar: `https://i.pravatar.cc/100?img=${img}`,
      text: MSG_TEXTS[(gi * 3 + m) % MSG_TEXTS.length],
      time: `2026-07-${String(18 + m).padStart(2, '0')}T${String(9 + ((m * 3 + gi) % 12)).padStart(2, '0')}:${String((m * 17) % 60).padStart(2, '0')}:00Z`,
    });
  }
});

const COURSEMATES_RAW = [
  ['Farah Hassan', 'MY', 'Bachelor of Business Administration', 21], ['Kai Wen Ng', 'MY', 'Bachelor of Computer Science', 65],
  ['Budi Santoso', 'ID', 'Bachelor of Business Administration', 68], ['Linh Tran', 'VN', 'Bachelor of Laws (LLB)', 16],
  ['Cheng Wu', 'CN', 'Bachelor of Computer Science', 61], ['Amirah Yusof', 'MY', 'Bachelor of Nursing', 27],
  ['Hsin-Yu Chang', 'TW', 'Bachelor of Business Administration', 41], ['Ryan Teo', 'SG', 'Bachelor of Computer Science', 60],
  ['Sari Dewi', 'ID', 'Bachelor of Nursing', 43], ['Quang Le', 'VN', 'Bachelor of Business Administration', 51],
  ['Mei Ling Chua', 'MY', 'Bachelor of Laws (LLB)', 38], ['Arif Rahman', 'MY', 'Bachelor of Computer Science', 64],
];
const coursemates = COURSEMATES_RAW.map(([name, homeCountry, courseName, img], i) => ({
  id: `mate-${String(i + 1).padStart(2, '0')}`,
  name, homeCountry, courseName,
  institutionId: 'au-monash',
  intake: '2027-02',
  avatar: `https://i.pravatar.cc/200?img=${img}`,
  // Travel-buddy layer: arrival dates cluster in the two weeks before intake;
  // roughly two thirds have opted in to coordinating travel.
  arrivalDate: `2027-02-${String(8 + ((i * 5) % 16)).padStart(2, '0')}`,
  travelOptIn: i % 3 !== 2,
}));

const EVENTS = [
  ['Study Abroad Expo Malaysia', 'Kuala Lumpur', 'MY', '2026-10-17', 'KLCC Convention Centre', true, 'expo', 'Meet 60+ universities from 7 countries; on-the-spot eligibility checks by UniBridge.'],
  ['Australia International Education Expo', 'Sydney', 'AU', '2026-11-07', 'ICC Sydney', true, 'expo', 'Universities, visa advisors and scholarship booths under one roof.'],
  ['Taiwan Higher Education Fair', 'Taipei', 'TW', '2026-09-19', 'Taipei World Trade Center', false, 'expo', 'National and private universities with scholarship counters.'],
  ['UK University Fair', 'London', 'GB', '2026-10-03', 'Business Design Centre', true, 'expo', 'Meet admissions teams from across the UK in one afternoon.'],
  ['Singapore Study Abroad Fair', 'Singapore', 'SG', '2026-09-26', 'Suntec Convention Centre', true, 'expo', 'Meet 40+ institutions; on-the-spot eligibility checks by UniBridge.'],
  ['New Zealand Education Expo', 'Auckland', 'NZ', '2026-09-12', 'Aotea Centre', false, 'expo', 'Universities and institutes from across New Zealand.'],
  ['Russian Universities Expo', 'Moscow', 'RU', '2026-10-24', 'Expocentre', false, 'expo', 'State universities presenting English-taught programmes.'],
  ['Pre-Departure Briefing: Australia', 'Kuala Lumpur', 'MY', '2026-11-14', 'UniBridge Hub, Bukit Bintang', true, 'meetup', 'Visa walkthrough, packing lists and alumni Q&A for Feb 2027 intakes.'],
  ['Sydney Newcomers Picnic', 'Sydney', 'AU', '2027-02-20', 'Royal Botanic Garden', true, 'meetup', 'Meet your intake in person — sausage sizzle provided.'],
  ['Melbourne Airport Pickup Day', 'Melbourne', 'AU', '2027-02-12', 'Tullamarine Airport T2', false, 'meetup', 'Volunteer seniors meet every arriving flight this Saturday.'],
  ['London Freshers Welcome', 'London', 'GB', '2027-01-18', 'Student Central, Bloomsbury', true, 'meetup', 'SIM cards, bank sign-ups and free pizza for new internationals.'],
  ['Taipei Language Exchange Night', 'Taipei', 'TW', '2026-10-08', "Da'an Community Hall", false, 'meetup', 'Practise Mandarin over bubble tea with local buddies.'],
  ['Auckland Harbour Walk & Welcome', 'Auckland', 'NZ', '2027-02-27', 'Wynyard Quarter', false, 'meetup', 'Casual walk and gelato for new internationals.'],
  ['Moscow Winter Survival Workshop', 'Moscow', 'RU', '2026-12-05', 'MSU Main Building Hall B', false, 'meetup', 'What to wear, how to metro, and where to buy it all.'],
  ['USA University Fair', 'New York', 'US', '2026-10-10', 'Javits Center', true, 'expo', 'Ivy League to state schools — admissions and financial-aid booths in one hall.'],
  ['Canada Education Fair', 'Toronto', 'CA', '2026-11-21', 'Metro Toronto Convention Centre', true, 'expo', 'Universities and colleges from every province; study-permit clinic on site.'],
  ['China International Education Expo', 'Beijing', 'CN', '2026-10-31', 'China National Convention Center', false, 'expo', 'English-taught degree programmes and scholarship counters.'],
  ['Toronto Winter Welcome Skate', 'Toronto', 'CA', '2027-01-23', 'Nathan Phillips Square Rink', false, 'meetup', 'Free skate rentals for new internationals — hot chocolate on us.'],
];
const events = EVENTS.map(([title, city, country, date, venue, sponsored, kind, description], i) => ({
  id: `evt-${String(i + 1).padStart(2, '0')}`,
  title, city, country, date, venue, sponsored, kind, description,
  image: `https://picsum.photos/seed/evt-${i}/600/300`,
}));

// -------------------------------------------------------------- predeparture
const PREDEP = {
  AU: ['Confirm CoE and OSHC health cover', 'Apply for Student Visa (subclass 500)', 'Show proof of funds (12 months living costs)', 'Book accommodation or homestay for arrival', 'Order an Australian SIM or eSIM', 'Open a student bank account online before flying', 'Book airport pickup or SkyBus', 'Pack certified copies of transcripts'],
  MY: ['Receive EMGS approval letter', 'Complete pre-arrival medical screening', 'Show proof of funds for first year', 'Arrange campus hostel or rental', 'Get a local SIM at the airport', 'Open a Malaysian bank account after arrival', 'Arrange airport pickup with international office', 'Bring passport photos on blue background'],
  TW: ['Apply for resident visa with admission letter', 'Buy NHI-compatible interim insurance', 'Prepare financial statement (TWD 100,000+)', 'Apply for dormitory in the housing portal', 'Reserve an EasyCard and SIM bundle', 'Open a post-office account after ARC', 'Confirm airport MRT route to campus', 'Bring extra passport photos for ARC'],
  GB: ['Receive CAS from your institution', 'Apply for Student visa and pay IHS surcharge', 'Show 9 months of living funds', 'Book student halls or private housing', 'Order a UK SIM to your home address', 'Choose a student bank account', 'Book airport transfer or coach', 'Pack originals of all certificates'],
  SG: ['Receive IPA letter from ICA', 'Complete medical examination form', 'Show proof of funds', 'Apply for hostel or HDB room rental', 'Get a prepaid tourist SIM, upgrade later', 'Open a bank account with passport + IPA', 'Plan MRT route from Changi', 'Complete Student Pass formalities on arrival'],
  NZ: ['Confirm offer and pay first-year fees', 'Apply for Fee-Paying Student Visa', 'Show NZD 20,000 living funds', 'Book halls of residence or flat', 'Order a NZ SIM or eSIM', 'Open a bank account before arrival online', 'Book SkyDrive or airport shuttle', 'Declare all food items on arrival card'],
  RU: ['Receive official invitation letter', 'Apply for study visa at consulate', 'Prepare notarised translated documents', 'Confirm dormitory allocation', 'Buy a local SIM with passport', 'Carry some cash roubles for first week', 'Arrange university airport pickup', 'Register migration card within 7 days'],
  US: ['Receive Form I-20 from your university', 'Pay the SEVIS I-901 fee', 'Book F-1 visa interview at the embassy', 'Show proof of funds for year one', 'Arrange on-campus housing or apartment', 'Get a US SIM or eSIM plan', 'Open a US student bank account after arrival', 'Carry I-20 and admission letter in hand luggage'],
  CA: ['Receive Letter of Acceptance (LOA)', 'Apply for study permit online', 'Buy a GIC if using the SDS stream', 'Book biometrics appointment', 'Arrange residence or homestay', 'Get a Canadian SIM plan', 'Open a student bank account (GIC bank)', 'Print the Port of Entry letter for arrival'],
  CN: ['Receive admission notice and JW202 form', 'Apply for X1 student visa', 'Prepare notarised transcripts and health form', 'Confirm on-campus dormitory booking', 'Get a local SIM with your passport', 'Set up Alipay/WeChat Pay with a foreign card', 'Register with campus police within 24 hours', 'Convert visa to residence permit in 30 days'],
};
const CATEGORIES = ['visa', 'insurance', 'money', 'housing', 'sim', 'banking', 'other', 'other'];
const predeparture = {
  checklists: Object.fromEntries(Object.entries(PREDEP).map(([cc, items]) => [cc, items.map((label, i) => ({ id: `${cc.toLowerCase()}-p${i + 1}`, label, category: CATEGORIES[i] }))])),
  workRights: {
    AU: { country: 'AU', hoursPerWeekTerm: 24, breakRule: 'Unlimited hours during scheduled course breaks', note: 'Capped at 48 hours per fortnight during term on a subclass 500 visa (mock).' },
    MY: { country: 'MY', hoursPerWeekTerm: 20, breakRule: 'Semester breaks longer than 7 days only', note: 'Work permitted only during holidays and only in approved sectors (mock).' },
    TW: { country: 'TW', hoursPerWeekTerm: 20, breakRule: 'No cap during summer/winter vacation', note: 'Requires a work permit from the Workforce Development Agency (mock).' },
    GB: { country: 'GB', hoursPerWeekTerm: 20, breakRule: 'Full-time during official vacations', note: '20 hours per week maximum in term time on a Student visa (mock).' },
    SG: { country: 'SG', hoursPerWeekTerm: 16, breakRule: 'Full-time during vacation with pass', note: 'Only at approved institutions; 16 hours per week in term (mock).' },
    NZ: { country: 'NZ', hoursPerWeekTerm: 20, breakRule: 'Full-time during scheduled holidays', note: '20 hours per week during study on a Fee-Paying Student Visa (mock).' },
    RU: { country: 'RU', hoursPerWeekTerm: 20, breakRule: 'Free during official university holidays', note: 'Requires a work permit unless working at your own university (mock).' },
    US: { country: 'US', hoursPerWeekTerm: 20, breakRule: 'Full-time on campus during breaks', note: 'F-1 students: on-campus work only during term; off-campus needs CPT/OPT approval (mock).' },
    CA: { country: 'CA', hoursPerWeekTerm: 24, breakRule: 'Full-time during scheduled breaks', note: 'Off-campus work up to 24 hours per week during term on a study permit (mock).' },
    CN: { country: 'CN', hoursPerWeekTerm: 8, breakRule: 'Internships only, with approvals', note: 'Work-study needs university and immigration approval; most students stick to campus internships (mock).' },
  },
};

// ------------------------------------------------------------------ flights
// Round-trip economy fares home, USD, [low season, peak season/holidays].
// Indicative 2026 averages from public fare aggregators; [0, 0] = home city
// equals study destination (no flight needed).
const FLIGHTS = {
  AU: { MY: [350, 700], TW: [500, 900], SG: [400, 750], ID: [400, 800], VN: [450, 850], CN: [500, 950], MM: [700, 1200], KR: [600, 1100], JP: [550, 1000] },
  MY: { MY: [80, 160], TW: [180, 350], SG: [60, 140], ID: [100, 220], VN: [120, 250], CN: [250, 500], MM: [200, 400], KR: [350, 650], JP: [350, 700] },
  TW: { MY: [200, 400], TW: [60, 120], SG: [220, 420], ID: [280, 520], VN: [180, 350], CN: [200, 400], MM: [350, 650], KR: [180, 350], JP: [180, 350] },
  GB: { MY: [650, 1100], TW: [700, 1200], SG: [650, 1150], ID: [700, 1200], VN: [700, 1200], CN: [600, 1100], MM: [750, 1300], KR: [700, 1250], JP: [700, 1250] },
  SG: { MY: [80, 180], TW: [220, 420], SG: [0, 0], ID: [120, 250], VN: [150, 300], CN: [280, 550], MM: [250, 450], KR: [400, 750], JP: [400, 750] },
  NZ: { MY: [500, 950], TW: [600, 1100], SG: [550, 1000], ID: [550, 1050], VN: [600, 1100], CN: [600, 1150], MM: [800, 1400], KR: [700, 1250], JP: [650, 1200] },
  RU: { MY: [550, 950], TW: [600, 1050], SG: [550, 950], ID: [600, 1050], VN: [500, 900], CN: [400, 750], MM: [600, 1000], KR: [500, 900], JP: [550, 950] },
  US: { MY: [900, 1500], TW: [700, 1300], SG: [850, 1450], ID: [900, 1550], VN: [800, 1400], CN: [700, 1300], MM: [1000, 1700], KR: [750, 1350], JP: [700, 1300] },
  CA: { MY: [900, 1500], TW: [750, 1300], SG: [900, 1500], ID: [950, 1600], VN: [850, 1450], CN: [750, 1350], MM: [1050, 1750], KR: [800, 1400], JP: [750, 1350] },
  CN: { MY: [250, 500], TW: [300, 550], SG: [280, 550], ID: [350, 650], VN: [200, 400], CN: [80, 180], MM: [300, 550], KR: [250, 480], JP: [280, 520] },
};
const flights = { currency: 'USD', roundTrip: true, fares: FLIGHTS };

// ------------------------------------------------------------- student life
// Jobs, rooms, wheels and safety per study city — every listing is shared by
// a real ambassador student from that city where one exists. Pay and prices
// are indicative 2026 figures in local currency.
const WAGES = { AU: [24, 32], MY: [9, 15], TW: [190, 250], GB: [11.5, 15], SG: [10, 16], NZ: [23.5, 28], RU: [350, 600], US: [15, 22], CA: [16.5, 22], CN: [25, 60] };
const EMERGENCY = { AU: '000', MY: '999', TW: '110', GB: '999', SG: '999', NZ: '111', RU: '112', US: '911', CA: '911', CN: '110' };
const JOB_ROLES = [
  ['Café barista', false],
  ['Retail assistant', false],
  ['Campus library assistant', true],
  ['Private tutor (your best subject)', false],
  ['Restaurant server', false],
];
const CAR_GUIDES = {
  AU: { usedCar: [8000, 18000], rentalDay: [45, 80], note: 'An overseas licence works at first; rules differ by state. Weekend car-shares are the student favourite.' },
  MY: { usedCar: [15000, 35000], rentalDay: [80, 150], note: 'Grab is cheap and everywhere — most students skip owning a car.' },
  TW: { usedCar: [80000, 200000], rentalDay: [1500, 2500], note: 'Scooter culture: you need a local licence, and helmets are non-negotiable.' },
  GB: { usedCar: [3000, 8000], rentalDay: [35, 60], note: 'Insurance for young drivers is brutal — students live on trains and buses.' },
  SG: { usedCar: null, rentalDay: [80, 150], note: 'COE makes cars luxury items — the MRT reaches every campus.' },
  NZ: { usedCar: [4000, 10000], rentalDay: [40, 70], note: 'Cheap used cars everywhere; convert your licence within 12 months.' },
  RU: { usedCar: [400000, 900000], rentalDay: [2500, 4500], note: 'The metro beats driving in Moscow and St Petersburg.' },
  US: { usedCar: [6000, 15000], rentalDay: [40, 80], note: 'A car helps in Los Angeles; Boston, New York and Chicago transit is enough.' },
  CA: { usedCar: [7000, 16000], rentalDay: [45, 85], note: 'Winter tyres are law in parts of Canada; student transit passes are discounted.' },
  CN: { usedCar: [40000, 100000], rentalDay: [200, 400], note: 'Foreign licences need local conversion — DiDi and the metro cover everything.' },
};

// Ambassador per city (via their institution) for "shared by" attribution.
const ambCityIndex = {};
AMB.forEach(([name, , instId], i) => {
  const inst = INSTITUTIONS.find((r) => r[0] === instId);
  if (inst && !ambCityIndex[inst[4]]) {
    ambCityIndex[inst[4]] = { id: `amb-${String(i + 1).padStart(2, '0')}`, name, inst: inst[2] };
  }
});

const jobsByCity = {};
const housingByCity = {};
for (const [city, [country]] of Object.entries(CITY_COL)) {
  const [wMin, wMax] = WAGES[country];
  const spots = (CITY_ATTRACTIONS[city] ?? []).filter(([, type]) => type === 'food' || type === 'shopping');
  const sharedBy = ambCityIndex[city] ?? null;
  jobsByCity[city] = JOB_ROLES.map(([role, onCampus], i) => ({
    id: `job-${city.replace(/\W/g, '').toLowerCase()}-${i + 1}`,
    city,
    role,
    spot: onCampus ? null : (spots[i % Math.max(spots.length, 1)]?.[0] ?? null),
    payHourMin: Math.round(wMin * (1 + (i % 3) * 0.05) * 100) / 100,
    payHourMax: Math.round(wMax * (0.85 + (i % 3) * 0.075) * 100) / 100,
    onCampus,
    sharedBy,
  }));
  const rent = RENT_DETAIL[city];
  housingByCity[city] = [
    { kind: 'dorm', priceMonthly: round50((rent[0] + rent[1]) / 2), minutesToCampus: 5, verified: true },
    { kind: 'roomSuburb', priceMonthly: rent[0], minutesToCampus: 25, verified: true },
    { kind: 'roomCentral', priceMonthly: rent[1], minutesToCampus: 12, verified: false },
    { kind: 'studio', priceMonthly: rent[2], minutesToCampus: 20, verified: false },
  ].map((h, i) => ({ id: `home-${city.replace(/\W/g, '').toLowerCase()}-${i + 1}`, city, ...h, sharedBy }));
}
const studentLife = {
  emergency: EMERGENCY,
  jobsByCity,
  housingByCity,
  carsByCountry: Object.fromEntries(
    Object.entries(CAR_GUIDES).map(([cc, g]) => [cc, { country: cc, currency: COUNTRIES[cc].currency, ...g }]),
  ),
};

// ------------------------------------------------------- support & rewards
// Human support team (clearly-mock contact details on the .example domain),
// the unified university-mail inbox for the seeded applications, shorts, and
// the rewards catalog. Labels that are UI concepts live in i18n; mail bodies
// are "from universities" and stay in English like other institution data.
const supportTeam = [
  { id: 'staff-1', name: 'Melati Zainal', role: 'coach', avatar: 'https://i.pravatar.cc/300?img=36', phone: '+60 3-0000 0001', email: 'melati@unibridge.example' },
  { id: 'staff-2', name: 'Ryan Goh', role: 'support', avatar: 'https://i.pravatar.cc/300?img=53', phone: '+60 3-0000 0002', email: 'ryan@unibridge.example' },
  { id: 'staff-3', name: 'Priya Nair', role: 'visa', avatar: 'https://i.pravatar.cc/300?img=45', phone: '+60 3-0000 0003', email: 'priya@unibridge.example' },
  { id: 'staff-4', name: 'Daniel Craig Lim', role: 'coach', avatar: 'https://i.pravatar.cc/300?img=12', phone: '+60 3-0000 0004', email: 'daniel@unibridge.example' },
];

const mails = [
  ['mail-1', 'au-monash', 'app-demo-1', 'offer', 'Your offer letter — Bachelor of Business Administration', 'Congratulations! Attached is your Letter of Offer for the February 2027 intake. Reply to accept within 28 days.', '2026-07-28', false],
  ['mail-2', 'au-monash', 'app-demo-1', 'document_request', 'Certified English translation needed', 'Please upload a certified translation of your UEC transcript to complete your file.', '2026-07-30', false],
  ['mail-3', 'gb-manchester', 'app-demo-2', 'conditional', 'Conditional offer — condition details inside', 'Your offer is conditional on IELTS 6.5 (no band below 6.0). Book your test and send results by 30 Nov.', '2026-07-15', false],
  ['mail-4', 'sg-nus', 'app-demo-3', 'interview', 'Interview invitation — Business (Finance)', 'You are invited to a 20-minute online interview. Choose a slot from the booking link within 7 days.', '2026-07-21', false],
  ['mail-5', 'au-monash', 'app-demo-1', 'event', 'Offer-holder webinar: housing & enrolment', 'Join our offer-holder session on 15 Aug for enrolment steps, housing ballot dates and unit selection.', '2026-08-01', true],
  ['mail-6', 'gb-manchester', 'app-demo-2', 'newsletter', 'International scholars newsletter — August', 'Scholarship deadlines, pre-CAS checks and a campus tour recording for offer holders.', '2026-08-02', true],
].map(([id, institutionId, applicationId, kind, subject, snippet, date, read]) => ({
  id, institutionId, applicationId, kind, subject, snippet, date, read,
}));

// Reality Check entries (last flag) are unscripted "what nobody tells you"
// clips tied to an ambassador's institution and surfaced on course pages.
const AMB_INST = Object.fromEntries(ambassadors.map((a) => [a.id, a.institutionId]));
const shorts = [
  ['Day in my life at Monash', 'amb-01', 46, 12800, false],
  ['NUS hostel room tour', 'amb-10', 58, 22400, false],
  ['What RM30 buys in Taipei night markets', 'amb-03', 41, 9800, false],
  ['Manchester rain survival kit', 'amb-07', 38, 7600, false],
  ['My UNSW civil-eng lab day', 'amb-02', 52, 5400, false],
  ['Cooking dorm dinner for RM8', 'amb-05', 44, 15200, false],
  ['Auckland weekend hike with intake mates', 'amb-13', 49, 4300, false],
  ['St Petersburg white nights walk', 'amb-16', 55, 6100, false],
  ['Visa interview: what they asked me', 'amb-04', 60, 31900, false],
  ['First week tips I wish I knew', 'amb-08', 47, 18700, false],
  ['3 things nobody told me about studying Business at Monash', 'amb-01', 62, 8400, true],
  ['3 things nobody told me about Data Analytics at Manchester', 'amb-07', 58, 6900, true],
  ['3 things nobody told me about Finance at NUS', 'amb-10', 66, 9100, true],
  ['3 things nobody told me about CS at U of T (the winters)', 'amb-18', 54, 7300, true],
  ['3 things nobody told me about Law at UM', 'amb-08', 59, 5200, true],
].map(([title, ambassadorId, duration, views, reality], i) => ({
  id: `short-${String(i + 1).padStart(2, '0')}`,
  title, ambassadorId, duration, views,
  institutionId: AMB_INST[ambassadorId],
  reality,
  // Reality clips get an unpolished grayscale still to signal raw honesty.
  thumb: `https://picsum.photos/seed/short-${i}/420/640${reality ? '?grayscale' : ''}`,
}));

// Coin rules and redemption catalog — ids map to i18n labels.
const coinRules = [
  { id: 'profile', coins: 20 }, { id: 'grades', coins: 30 }, { id: 'english', coins: 25 },
  { id: 'document', coins: 10 }, { id: 'application', coins: 60 }, { id: 'referral', coins: 80 },
  { id: 'daily', coins: 5 },
];
const redemptions = [
  { id: 'pass-discount', coins: 400 }, { id: 'fee-waiver', coins: 300 },
  { id: 'doc-review', coins: 200 }, { id: 'event-ticket', coins: 150 }, { id: 'sim-topup', coins: 250 },
];
// Universal (free-tier) pre-departure checklist — country-personalized
// versions are a Season Pass perk.
const genericChecklist = [
  ['Passport valid 6+ months beyond arrival', 'visa'],
  ['Apply for your student visa early', 'visa'],
  ['Book accommodation for your first weeks', 'housing'],
  ['Arrange health and travel insurance', 'insurance'],
  ['Prepare certified copies of transcripts', 'other'],
  ['Plan your first-month budget in local currency', 'money'],
  ['Order a SIM or eSIM that works on arrival', 'sim'],
  ['Save emergency contacts somewhere offline', 'other'],
].map(([label, category], i) => ({ id: `gen-${i + 1}`, label, category }));

const support = { team: supportTeam, mails, shorts, coinRules, redemptions, genericChecklist };

// -------------------------------------------------------------------- vault
const documents = [
  { id: 'transcript', hasExpiry: false }, { id: 'certificate', hasExpiry: false },
  { id: 'passport', hasExpiry: true }, { id: 'english', hasExpiry: true },
  { id: 'recommendation', hasExpiry: false }, { id: 'statement', hasExpiry: false },
  { id: 'financial', hasExpiry: false }, { id: 'portfolio', hasExpiry: false },
  { id: 'health', hasExpiry: true },
];

// --------------------------------------------------------------------- seed
const seed_ = {
  profile: {
    name: 'Aisyah Rahman',
    homeCountry: 'MY',
    nationality: 'MY',
    qualification: 'uec',
    intakeYear: 2027,
    grades: {
      subjects: [
        { subject: 'Chinese', grade: 'A2' },
        { subject: 'English', grade: 'B3' },
        { subject: 'Mathematics', grade: 'A2' },
        { subject: 'Advanced Mathematics', grade: 'B3' },
        { subject: 'Physics', grade: 'B4' },
      ],
    },
    english: { test: 'ielts', score: 6.5 },
    emergencyContact: {
      name: 'Rahman Bin Yusof',
      relationship: 'Father',
      phone: '+60 12-000 0000',
      email: 'rahman@family.example',
    },
  },
  savedCourseIds: ['au-monash-c1', 'gb-manchester-c1', 'nz-auckland-c1', 'sg-nus-c1'],
  applications: [
    {
      id: 'app-demo-1', courseId: 'au-monash-c1', status: 'offer', intake: '2027-02',
      createdAt: '2026-06-04', updatedAt: '2026-07-28', feeWaived: true,
      history: [
        { status: 'submitted', date: '2026-06-04' },
        { status: 'under_review', date: '2026-06-18' },
        { status: 'conditional_offer', date: '2026-07-06' },
        { status: 'offer', date: '2026-07-28' },
      ],
    },
    {
      id: 'app-demo-2', courseId: 'gb-manchester-c1', status: 'conditional_offer', intake: '2027-01',
      createdAt: '2026-06-12', updatedAt: '2026-07-15', feeWaived: true,
      history: [
        { status: 'submitted', date: '2026-06-12' },
        { status: 'under_review', date: '2026-06-30' },
        { status: 'conditional_offer', date: '2026-07-15' },
      ],
    },
    {
      id: 'app-demo-3', courseId: 'sg-nus-c1', status: 'under_review', intake: '2027-01',
      createdAt: '2026-07-02', updatedAt: '2026-07-20', feeWaived: true,
      history: [
        { status: 'submitted', date: '2026-07-02' },
        { status: 'under_review', date: '2026-07-20' },
      ],
    },
  ],
  joinedGroupIds: ['grp-au-monash-2027-02'],
  notifications: [
    { id: 'ntf-1', applicationId: 'app-demo-1', status: 'offer', date: '2026-07-28' },
    { id: 'ntf-2', applicationId: 'app-demo-3', status: 'under_review', date: '2026-07-20' },
  ],
};

// -------------------------------------------------------------------- write
const files = {
  'institutions.json': institutions,
  'courses.json': courses,
  'qualifications.json': QUALIFICATIONS,
  'fx.json': FX,
  'costOfLiving.json': costOfLiving,
  'cityInfo.json': cityInfo,
  'scholarships.json': scholarships,
  'attractions.json': attractions,
  'ambassadors.json': ambassadors,
  'community.json': { intakeGroups, groupMessages, coursemates, events },
  'predeparture.json': predeparture,
  'documents.json': documents,
  'seed.json': seed_,
  'flights.json': flights,
  'studentLife.json': studentLife,
  'support.json': support,
  'safety.json': safety,
  'reviews.json': reviews,
};
for (const [file, data] of Object.entries(files)) {
  writeFileSync(join(OUT, file), JSON.stringify(data, null, 2) + '\n');
}
console.log(`institutions: ${institutions.length}`);
console.log(`courses: ${courses.length} (bachelor ${courses.filter((c) => c.level === 'bachelor').length}, pathway ${courses.filter((c) => c.level !== 'bachelor').length})`);
console.log(`scholarships: ${scholarships.length}, attractions: ${attractions.length}, ambassadors: ${ambassadors.length}`);
console.log(`groups: ${intakeGroups.length}, messages: ${groupMessages.length}, coursemates: ${coursemates.length}, events: ${events.length}`);
