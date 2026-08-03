/**
 * UniBridge mock-data generator.
 *
 * Deterministic (seeded PRNG, fixed reference date) so the emitted JSON under
 * src/data/ is stable across runs. All institutions are fictional; cities and
 * attractions are real for flavour. Run with: npm run generate-data
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
mkdirSync(OUT, { recursive: true });

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
};

const FX = {
  base: 'USD',
  asOf: '2026-07-15',
  rates: {
    USD: 1, AUD: 1.53, MYR: 4.42, TWD: 31.9, GBP: 0.79, SGD: 1.34,
    NZD: 1.68, RUB: 92.5, IDR: 15850, VND: 25300, CNY: 7.18,
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
};

const COURSE_NAMES = {
  business: ['Bachelor of Business Administration', 'Bachelor of Commerce (Finance)', 'Bachelor of International Business', 'Bachelor of Accounting', 'Bachelor of Marketing'],
  engineering: ['Bachelor of Engineering (Civil)', 'Bachelor of Engineering (Mechanical)', 'Bachelor of Engineering (Electrical)', 'Bachelor of Engineering (Mechatronics)', 'Bachelor of Engineering (Chemical)'],
  it: ['Bachelor of Computer Science', 'Bachelor of Software Engineering', 'Bachelor of IT (Data Analytics)', 'Bachelor of Cybersecurity', 'Bachelor of Artificial Intelligence'],
  health: ['Bachelor of Nursing', 'Bachelor of Medicine, Bachelor of Surgery (MBBS)', 'Bachelor of Pharmacy', 'Bachelor of Biomedical Science', 'Bachelor of Physiotherapy'],
  hospitality: ['Bachelor of Hospitality Management', 'Bachelor of Culinary Arts Management', 'Bachelor of Tourism & Event Management'],
  design: ['Bachelor of Design (Visual Communication)', 'Bachelor of Interior Architecture', 'Bachelor of Fashion Design', 'Bachelor of Digital Media Design'],
  law: ['Bachelor of Laws (LLB)', 'Bachelor of Criminology & Justice', 'Bachelor of Legal Studies'],
  science: ['Bachelor of Science (Mathematics & Statistics)', 'Bachelor of Environmental Science', 'Bachelor of Science (Physics)', 'Bachelor of Data Science'],
  media: ['Bachelor of Communication & Media', 'Bachelor of Journalism', 'Bachelor of Film & Television'],
  architecture: ['Bachelor of Architecture', 'Bachelor of Urban & Regional Planning'],
  education: ['Bachelor of Education (Primary)', 'Bachelor of Early Childhood Education'],
};
const PATHWAY_NAMES = {
  foundation: { business: 'Foundation in Business', it: 'Foundation in Computing', engineering: 'Foundation in Engineering & Science', design: 'Foundation in Art & Design', health: 'Foundation in Health Science', law: 'Foundation in Law & Social Science' },
  diploma: { it: 'Diploma in Information Technology', business: 'Diploma in Business Management', hospitality: 'Diploma in Hotel Operations', engineering: 'Diploma in Engineering Technology' },
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
];

// ------------------------------------------------------------------- cities
const CITY_COL = {
  Sydney: ['AU', 1900, 700, 180], Melbourne: ['AU', 1650, 650, 170], Brisbane: ['AU', 1500, 620, 160], Perth: ['AU', 1400, 600, 150],
  'Kuala Lumpur': ['MY', 1500, 900, 200], Penang: ['MY', 1100, 800, 150], Cyberjaya: ['MY', 1200, 850, 180], 'Johor Bahru': ['MY', 1000, 750, 150],
  Taipei: ['TW', 12000, 8000, 1280], Hsinchu: ['TW', 9500, 7000, 1000], Taichung: ['TW', 8500, 7000, 1000], Kaohsiung: ['TW', 8000, 6500, 900],
  London: ['GB', 1200, 450, 180], Manchester: ['GB', 850, 380, 95], Edinburgh: ['GB', 900, 380, 70], Birmingham: ['GB', 800, 360, 85], Leeds: ['GB', 750, 350, 80],
  Singapore: ['SG', 1500, 600, 120],
  Auckland: ['NZ', 1300, 600, 170], Wellington: ['NZ', 1200, 580, 150], Christchurch: ['NZ', 1050, 550, 120], Dunedin: ['NZ', 950, 520, 90],
  Moscow: ['RU', 45000, 25000, 2500], 'Saint Petersburg': ['RU', 35000, 22000, 2000], Kazan: ['RU', 25000, 18000, 1500], Novosibirsk: ['RU', 22000, 17000, 1400],
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
};

// ---------------------------------------------------------------- build data
const institutions = INSTITUTIONS.map(([id, name, short, country, city, type, verified, tagline, founded, students, website]) => ({
  id, name, short, country, city, type,
  verifiedPartner: verified, tagline, founded, students, website,
  images: [0, 1, 2].map((n) => `https://picsum.photos/seed/${id}-${n}/800/500`),
}));

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
  MY: ['AU', 'GB', 'NZ', 'MY'], SG: ['AU', 'GB', 'NZ', 'SG'], TW: ['AU', 'GB', 'TW'],
  CN: ['GB', 'AU', 'RU'], ID: ['AU', 'GB', 'MY'], VN: ['AU', 'GB', 'RU'],
};
const COMMON_LAW = ['GB', 'AU', 'NZ', 'SG', 'MY'];

function recognitionFor(field, isMed, dest) {
  const out = {};
  for (const home of ['MY', 'TW', 'SG', 'ID', 'VN', 'CN']) {
    let ok = true;
    if (isMed) ok = MED_RECOGNITION[home].includes(dest);
    else if (field === 'law') ok = ['MY', 'SG'].includes(home) && COMMON_LAW.includes(dest);
    else if (dest === 'RU') ok = ['CN', 'VN'].includes(home) || ['engineering', 'it', 'health'].includes(field);
    out[home] = ok;
  }
  return out;
}

const courses = [];
for (const row of INSTITUTIONS) {
  const [instId, , , country, city] = row;
  const specs = row[11];
  const c = COUNTRIES[country];
  specs.forEach(([field, nameIdx, levelCode, band], i) => {
    const level = levelCode === 'b' ? 'bachelor' : levelCode === 'f' ? 'foundation' : 'diploma';
    const isMed = level === 'bachelor' && field === 'health' && nameIdx === 1;
    const name = level === 'bachelor' ? COURSE_NAMES[field][nameIdx] : PATHWAY_NAMES[level === 'foundation' ? 'foundation' : 'diploma'][field] ?? `${level === 'foundation' ? 'Foundation' : 'Diploma'} in ${field}`;
    const base = isMed ? TUITION[country].med : TUITION[country][field];
    const levelMult = level === 'foundation' ? 0.55 : level === 'diploma' ? 0.65 : 1;
    const selMult = level === 'bachelor' ? 0.85 + 0.09 * band : 1;
    const tuitionPerYear = round50(base * levelMult * selMult);
    const durationYears = level === 'foundation' ? 1 : level === 'diploma' ? 2
      : isMed ? (['TW', 'RU'].includes(country) ? 6 : 5)
      : field === 'engineering' ? 4
      : ['TW', 'RU'].includes(country) ? 4 : 3;
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

const costOfLiving = Object.entries(CITY_COL).map(([city, [country, rent, food, transport]]) => ({
  city, country, currency: COUNTRIES[country].currency,
  rentMonthly: rent, foodMonthly: food, transportMonthly: transport,
  insuranceYearly: COUNTRIES[country].insuranceYearly,
  visaFeeOneOff: COUNTRIES[country].visaFee,
}));

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
const scholarships = [
  ['sch-01', 'UniBridge Global Merit Scholarship', 'UniBridge Partners', 'any', 'any', 'any', 'partial', { percentTuition: 25 }, '2026-11-30', 'Automatic consideration with any application through UniBridge; awarded on academic merit.'],
  ['sch-02', 'Harbourview International Excellence Award', 'Harbourview University', 'AU', 'any', 'any', 'partial', { percentTuition: 40 }, '2026-10-31', 'ATAR 90+ equivalent; maintained with a credit average.'],
  ['sch-03', "Southern Sky Vice-Chancellor's Scholarship", 'Southern Sky University', 'AU', 'any', 'any', 'full', { percentTuition: 100 }, '2026-09-30', 'Top 2% of applicant pool; interview required.'],
  ['sch-04', 'Destination Australia Regional Grant', 'Australian Government (mock)', 'AU', 'any', 'any', 'partial', { amount: 15000, currency: 'AUD' }, '2027-01-15', 'For study at regional campuses; one year, renewable.'],
  ['sch-05', 'Merdeka ASEAN Bursary', 'Merdeka International University', 'MY', 'any', ['MY', 'ID', 'VN', 'SG'], 'partial', { percentTuition: 50 }, '2026-12-15', 'ASEAN nationals with strong co-curricular records.'],
  ['sch-06', 'Straits Founders Grant', 'Straits University College', 'MY', ['business', 'hospitality'], 'any', 'partial', { amount: 8000, currency: 'MYR' }, '2026-11-01', 'First-generation university students prioritised.'],
  ['sch-07', 'Taiwan Bridge Scholarship', 'Taiwan MOE (mock)', 'TW', 'any', 'any', 'full', { percentTuition: 100, stipendMonthly: 15000 }, '2026-10-15', 'Full tuition plus monthly living stipend; Mandarin course included.'],
  ['sch-08', 'Formosa STEM Talent Award', 'Formosa Institute', 'TW', ['it', 'engineering'], 'any', 'partial', { percentTuition: 60 }, '2027-01-31', 'Portfolio or competition results in STEM fields.'],
  ['sch-09', 'Albion Global Leaders Scholarship', 'Albion University London', 'GB', 'any', 'any', 'partial', { amount: 20000, currency: 'GBP' }, '2026-12-01', 'Essay and leadership evidence required.'],
  ['sch-10', 'Northgate International Merit Scholarship', 'Northgate University', 'GB', 'any', 'any', 'partial', { percentTuition: 30 }, '2027-02-28', 'Automatic for offers above entry requirements.'],
  ['sch-11', 'Thamesbank Law Access Award', 'Thamesbank College of Law', 'GB', ['law'], 'any', 'partial', { percentTuition: 50 }, '2026-11-30', 'Widening-access award for future barristers and solicitors.'],
  ['sch-12', 'Straits International ASEAN Scholarship', 'Straits International University', 'SG', 'any', ['MY', 'ID', 'VN'], 'full', { percentTuition: 100, stipendMonthly: 800 }, '2026-10-01', 'Bond-free full scholarship for ASEAN nationals.'],
  ['sch-13', 'Merlion Creative Portfolio Award', 'Merlion College of Design', 'SG', ['design'], 'any', 'partial', { percentTuition: 40 }, '2027-03-15', 'Judged on a 10-page digital portfolio.'],
  ['sch-14', 'Kauri Pacific Gateway Scholarship', 'Kauri University', 'NZ', 'any', 'any', 'partial', { amount: 15000, currency: 'NZD' }, '2026-12-20', 'First-year support for international students.'],
  ['sch-15', 'Southern Alps Engineering Award', 'Southern Alps University', 'NZ', ['engineering'], 'any', 'partial', { percentTuition: 50 }, '2027-01-10', 'For rebuild-and-resilience engineering specialisations.'],
  ['sch-16', 'Open Doors Russia Scholarship', 'Open Doors (mock)', 'RU', 'any', 'any', 'full', { percentTuition: 100 }, '2026-12-10', 'Olympiad-style selection; covers full tuition.'],
  ['sch-17', 'Neva Technical Excellence Grant', 'Neva State Technical University', 'RU', ['engineering', 'it'], 'any', 'partial', { percentTuition: 75 }, '2027-02-01', 'Physics/maths olympiad participants favoured.'],
  ['sch-18', 'ASEAN Future Leaders Fund', 'ASEAN Foundation (mock)', 'any', 'any', ['MY', 'SG', 'ID', 'VN'], 'partial', { amount: 5000, currency: 'USD' }, '2026-11-15', 'Community-leadership track record required.'],
  ['sch-19', 'Chinese Bridge Overseas Study Grant', 'CB Foundation (mock)', 'any', 'any', ['CN', 'TW'], 'partial', { percentTuition: 30 }, '2027-01-20', 'For Chinese-speaking students studying abroad.'],
  ['sch-20', 'Global Women in STEM Scholarship', 'WiSTEM International (mock)', 'any', ['it', 'engineering'], 'any', 'partial', { percentTuition: 35 }, '2026-12-31', 'Open to women applicants in STEM programmes.'],
  ['sch-21', 'Hospitality Futures Bursary', 'Global Hotels Group (mock)', 'any', ['hospitality'], 'any', 'partial', { amount: 4000, currency: 'USD' }, '2027-02-15', 'Includes a paid internship placement.'],
  ['sch-22', 'HealthCare Heroes Grant', 'HealthBridge Foundation (mock)', 'any', ['health'], 'any', 'partial', { percentTuition: 25 }, '2027-03-01', 'For future nurses, pharmacists and doctors.'],
  ['sch-23', 'Kingsford Culinary Excellence Award', 'Kingsford Hospitality College', 'AU', ['hospitality'], 'any', 'partial', { percentTuition: 30 }, '2026-10-20', 'Includes a stage at a hatted Melbourne kitchen.'],
].map(([id, name, provider, destinationCountry, fields, nationalities, coverageType, money, deadline, eligibilityNote]) => ({
  id, name, provider, destinationCountry, fields, nationalities, coverageType, ...money, deadline, eligibilityNote,
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

// ----------------------------------------------------------------- community
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const groupInsts = ['au-monash', 'au-unsw', 'my-um', 'my-taylors', 'tw-ntu', 'gb-manchester', 'sg-nus', 'nz-auckland', 'ru-itmo'];
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
  },
};

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
  'scholarships.json': scholarships,
  'attractions.json': attractions,
  'ambassadors.json': ambassadors,
  'community.json': { intakeGroups, groupMessages, coursemates, events },
  'predeparture.json': predeparture,
  'documents.json': documents,
  'seed.json': seed_,
};
for (const [file, data] of Object.entries(files)) {
  writeFileSync(join(OUT, file), JSON.stringify(data, null, 2) + '\n');
}
console.log(`institutions: ${institutions.length}`);
console.log(`courses: ${courses.length} (bachelor ${courses.filter((c) => c.level === 'bachelor').length}, pathway ${courses.filter((c) => c.level !== 'bachelor').length})`);
console.log(`scholarships: ${scholarships.length}, attractions: ${attractions.length}, ambassadors: ${ambassadors.length}`);
console.log(`groups: ${intakeGroups.length}, messages: ${groupMessages.length}, coursemates: ${coursemates.length}, events: ${events.length}`);
