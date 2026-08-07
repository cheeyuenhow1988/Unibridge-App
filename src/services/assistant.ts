import { FLAGS } from '@/constants/countries';
import type { MatchData } from '@/hooks/useMatchData';
import { convert, formatMoney } from '@/services/currency';
import { trueAnnualIn } from '@/services/costs';
import type {
  CityInfo, CountryCode, CurrencyCode, FieldId, FlightFares, Institution, MatchResult, SafetyBundle, StudentProfile,
} from '@/types/models';

export interface QuickReply {
  label: string;
  send: string;
  intent: string;
  /** Set → tapping navigates to this in-app screen instead of sending a message. */
  route?: string;
}

/** Multi-step interview: field → budget → climate → goal → recommendation. */
export interface WizardState {
  stage: 'field' | 'budget' | 'pref' | 'goal';
  fields?: FieldId[];
  fieldLabel?: string;
  budget?: number | null;
  pref?: string;
}

export interface AssistantReply {
  text: string;
  chips?: QuickReply[];
  /** Set → screen stores interview state; null → interview finished. */
  wizard?: WizardState | null;
}

export interface AssistantCtx {
  t: (key: string, opts?: Record<string, unknown>) => string;
  profile: StudentProfile;
  matchData: MatchData;
  institutions: Institution[];
  cityInfo: CityInfo[];
  flights: FlightFares;
  home: CurrencyCode;
  safety: SafetyBundle;
}

const WEATHER_RE = /(weather|climate|rain|snow|cold|hot|temperature|cuaca|sejuk|panas|thời tiết|khí hậu|mưa|lạnh|nóng|天气|气候|下雨|冷|热|天氣|氣候|熱)/i;
const SAFETY_RE = /(safe|safety|crime|danger|selamat|jenayah|bahaya|aman|an toàn|trị an|安全|治安|危险|危險)/i;
const COST_RE = /(cost|rent|living|expensive|cheap|price|kos|sewa|murah|mahal|biaya|chi phí|tiền thuê|rẻ|đắt|生活费|房租|贵|便宜|生活費|貴)/i;
const STUDY_RE = /(what.*(study|course|major)|study what|choose.*(study|course)|belajar apa|tak tahu.*belajar|kuliah apa|nên học gì|học gì|读什么|学什么|不知道读|讀什麼|學什麼|不知道讀)/i;
const WHERE_RE = /(where.*study|which country|country.*(study|choose)|negara mana|kuliah di mana|học ở đâu|nước nào|去哪.*(读|留学|讀|留學)|哪个国家|哪個國家)/i;
const BUDGET_RE = /(budget|afford|enough|cukup|bajet|mampu|anggaran|ngân sách|đủ tiền|预算|够|负担|預算|夠|負擔)/i;
const GREET_RE = /^(hi|hello|hey|hai|helo|halo|chào|xin chào|你好|哈喽|嗨)\b/i;

// ---- Refusals: friendly but firm, always with the legal alternative. ----
const CHEAT_RE = /((fake|forg\w*|buy|beli|mua|买|買)\W{0,3}\w{0,24}\W{0,3}(ielts|toefl|visa|document|dokumen|certificate|sijil|degree|ijazah|transcript|result))|((write|do)\s.{0,16}(essay|statement|assignment).{0,12}for me)|((pay|hire).{0,20}(write|essay|assignment))|plagiar|bribe|rasuah|hối lộ|贿|賄|作弊|代写|代寫|\bcheat(ing)?\b/i;
const ILLEGAL_WORK_RE = /((work|kerja|làm|打工|工作).{0,30}(illegal|haram|cash in hand|under the table|without (a )?(permit|visa)|more (hours|than (i'?m |am )?allowed)|beyond .{0,10}limit))|overstay|((illegal|haram)\W{0,3}(work|job|kerja))|黑工|逾期居留|불법.{0,6}(일|취업)/i;
const ILLEGAL_OTHER_RE = /(\bdrugs?\b|weed|marijuana|ganja|cocaine|meth\b|dadah|ma túy|毒品|大麻|fake id)/i;

// ---- Personal feelings: supportive, case by case, practical next steps. ----
const P_LOW_RE = /(depress|suicid|self.?harm|hopeless|cry(ing)?|can'?t sleep|burn(ed|t)? ?out|murung|nak nangis|buồn quá|tuyệt vọng|难受|想哭|撑不住|難受|우울|힘들어|つらい|泣き)/i;
const P_MONEY_RE = /((can'?t|cannot) afford.{0,24}(famil|parent))|(parent|famil)\w*.{0,24}(no money|can'?t afford|tak mampu|tidak mampu|不够钱|沒錢|没钱)|((worried|stress\w*|risau).{0,16}(money|fees|cost|duit|tiền|钱|錢))|no money for (uni|college|study)/i;
const P_HOMESICK_RE = /(homesick|home sick|lonely|alone here|miss (my )?(home|family|mom|mum|dad|parents|friends)|rindu (rumah|keluarga)|kangen (rumah|keluarga)|nhớ nhà|想家|孤独|孤獨|外로|ホームシック)/i;
const P_NERVOUS_RE = /(nervous|scared|afraid|anxious|worried|takut|cemas|gugup|lo lắng|sợ|紧张|害怕|緊張|불안|긴장|怖い|不安)/i;
const P_FRIENDS_RE = /(make friends|new friends|\bshy\b|introvert|no one to talk|cari kawan|kết bạn|交朋友|친구 사귀|友達作り)/i;
const P_FOOD_RE = /(halal|vegetarian|vegan|makanan halal|đồ ăn chay|清真|素食)/i;
const EMERGENCY_RE = /(police|ambulance|emergency|fire brigade|hotline|polis\b|ambulans|kecemasan|darurat|cảnh sát|cấp cứu|khẩn cấp|警察|救护车|急救|紧急|报警|救護車|緊急|報警|경찰|구급차|응급|긴급|救急車|消防|ตำรวจ|รถพยาบาล|ฉุกเฉิน|पुलिस|एम्बुलेंस|आपातकाल)/i;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole-word match — "police" must never hit the school short-named "ICE". */
const wordHit = (q: string, name: string) =>
  new RegExp(`(^|[^a-z0-9])${escapeRe(name.toLowerCase())}($|[^a-z0-9])`).test(q);
/** Short acronyms (ICE, UM, MIT) only count typed as capitals, standalone. */
const acronymHit = (raw: string, short: string) =>
  new RegExp(`(^|[^A-Za-z0-9])${escapeRe(short)}($|[^A-Za-z0-9])`).test(raw);

function annualCost(r: MatchResult, ctx: AssistantCtx): number {
  const col = ctx.matchData.colByCity.get(r.course.campusCity);
  return col ? trueAnnualIn(r.course, col, ctx.home) : Number.MAX_SAFE_INTEGER;
}

function courseLine(r: MatchResult, ctx: AssistantCtx): string {
  return ctx.t('assistant.courseLine', {
    course: r.course.name,
    flag: FLAGS[r.course.country],
    institution: r.institution.name,
    country: ctx.t(`countries.${r.course.country}`),
    status: ctx.t(`match.${r.status}`),
    cost: formatMoney(annualCost(r, ctx), ctx.home),
  });
}

function rank(results: MatchResult[], ctx: AssistantCtx): MatchResult[] {
  const order = { eligible: 0, borderline: 1, pathway: 2 } as const;
  return [...results]
    .filter((r) => r.course.level === 'bachelor')
    .sort((a, b) => order[a.status] - order[b.status] || annualCost(a, ctx) - annualCost(b, ctx));
}

function menuChips(ctx: AssistantCtx): QuickReply[] {
  const { t } = ctx;
  return [
    { label: t('assistant.chipStudy'), send: t('assistant.chipStudy'), intent: 'study' },
    { label: t('assistant.chipWhere'), send: t('assistant.chipWhere'), intent: 'where' },
    { label: t('assistant.chipBudget'), send: t('assistant.chipBudget'), intent: 'budget' },
    { label: t('assistant.chipWeather'), send: t('assistant.chipWeather'), intent: 'city:Melbourne:weather' },
    { label: t('assistant.chipSafety'), send: t('assistant.chipSafety'), intent: 'city:Taipei:safety' },
    { label: t('assistant.chipTalk'), send: t('assistant.chipTalk'), intent: 'talk' },
  ];
}

type PersonalKind = 'homesick' | 'nervous' | 'low' | 'money' | 'friends' | 'food';

/** Warm, practical answers to personal worries — each with in-app next steps. */
function personalAnswer(kind: PersonalKind, ctx: AssistantCtx): AssistantReply {
  const { t } = ctx;
  const groups: QuickReply = { label: t('assistant.chipGroups'), send: t('assistant.chipGroups'), intent: 'go-community', route: '/community' };
  const mates: QuickReply = { label: t('assistant.chipMates'), send: t('assistant.chipMates'), intent: 'go-mates', route: '/community' };
  const safetyHub: QuickReply = { label: t('assistant.chipSafetyHub'), send: t('assistant.chipSafetyHub'), intent: 'safety-hub', route: '/safety' };
  const life: QuickReply = { label: t('assistant.chipLife'), send: t('assistant.chipLife'), intent: 'go-life', route: '/arrival' };
  const budget: QuickReply = { label: t('assistant.chipBudget'), send: t('assistant.chipBudget'), intent: 'budget' };
  const chips: Record<PersonalKind, QuickReply[]> = {
    homesick: [groups, mates],
    nervous: [groups, safetyHub],
    low: [safetyHub, groups],
    money: [budget, life],
    friends: [groups, mates],
    food: [groups],
  };
  return { text: t(`assistant.personal_${kind}`), chips: chips[kind] };
}

function refuse(kind: 'docs' | 'work' | 'other', ctx: AssistantCtx): AssistantReply {
  const { t } = ctx;
  const chips: QuickReply[] =
    kind === 'docs'
      ? [{ label: t('assistant.chipStudy'), send: t('assistant.chipStudy'), intent: 'study' }]
      : kind === 'work'
        ? [
            { label: t('assistant.chipLife'), send: t('assistant.chipLife'), intent: 'go-life', route: '/arrival' },
            { label: t('assistant.chipBudget'), send: t('assistant.chipBudget'), intent: 'budget' },
          ]
        : [{ label: t('assistant.chipSafetyHub'), send: t('assistant.chipSafetyHub'), intent: 'safety-hub', route: '/safety' }];
  return { text: t(`assistant.refuse_${kind}`), chips };
}

const INTEREST_FIELDS: Record<string, FieldId[]> = {
  tech: ['it', 'engineering', 'science'],
  business: ['business', 'law'],
  health: ['health', 'science'],
  creative: ['design', 'media'],
  building: ['architecture', 'engineering'],
  people: ['education', 'hospitality', 'media'],
};

const WHERE_COUNTRIES: Record<string, CountryCode[]> = {
  warm: ['MY', 'SG', 'TW', 'AU'],
  cool: ['GB', 'NZ', 'RU', 'CA'],
  english: ['AU', 'GB', 'NZ', 'SG', 'US', 'CA'],
  cheap: ['MY', 'TW', 'RU', 'CN'],
};

// Free-text field detection for the interview (en + basic ms/zh keywords).
const FIELD_KEYWORDS: [RegExp, FieldId[]][] = [
  [/(market|hr|human resource|account|financ|bank|business|econom|entrepreneur|supply|logistic|perniagaan|niaga|bisnis|akuntansi|pemasaran|kinh doanh|tài chính|kế toán|商|金融|市场|会计|营销|市場|會計|營銷)/i, ['business']],
  [/(software|coding|program|computer|\bit\b|data|cyber|game|\bai\b|komputer|koding|lập trình|máy tính|công nghệ thông tin|程序|编程|电脑|数据|计算机|程式|編程|電腦|數據|計算機)/i, ['it']],
  [/(doctor|medic|nurse|pharma|physio|dentist|psycholog|health|doktor|jururawat|dokter|perawat|farmasi|bác sĩ|y tá|y khoa|điều dưỡng|dược|医|护理|药|心理|醫|護理|藥)/i, ['health']],
  [/(civil|mechanic|electric|mechatronic|aero|engineer|jurutera|kejuruteraan|teknik|insinyur|kỹ thuật|kỹ sư|工程)/i, ['engineering']],
  [/(interior|fashion|graphic|animation|product design|design|reka bentuk|desain|thiết kế|thời trang|设计|时装|动画|設計|時裝|動畫)/i, ['design']],
  [/(law|legal|lawyer|undang|hukum|luật|律师|法律|律師)/i, ['law']],
  [/(film|media|journal|advertis|public relation|broadcast|jurnalistik|truyền thông|báo chí|传媒|新闻|媒体|傳媒|新聞|媒體)/i, ['media']],
  [/(teach|education|tesl|guru|pendidikan|giáo viên|sư phạm|教育|老师|教师|老師|教師)/i, ['education']],
  [/(hotel|chef|culinar|tourism|hospitality|aviation|cabin|masak|pelancongan|kuliner|perhotelan|pariwisata|khách sạn|đầu bếp|nấu ăn|ẩm thực|du lịch|酒店|厨|旅游|烹饪|廚|旅遊|烹飪)/i, ['hospitality']],
  [/(architect|urban|quantity survey|construction|seni bina|arsitektur|kiến trúc|建筑|建築)/i, ['architecture']],
  [/(physic|chemist|biolog|biotech|math|actuar|science|sains|fisika|kimia|vật lý|hóa học|toán|khoa học|物理|化学|生物|数学|科学|化學|數學|科學)/i, ['science']],
];

function detectFields(text: string): FieldId[] | null {
  const hits = new Set<FieldId>();
  for (const [re, fields] of FIELD_KEYWORDS) {
    if (re.test(text)) fields.forEach((f) => hits.add(f));
  }
  return hits.size > 0 ? [...hits] : null;
}

/** The interview: every answer may be typed freely or tapped as a chip. */
export function respondWizard(query: string, intent: string | undefined, state: WizardState, ctx: AssistantCtx): AssistantReply {
  const { t } = ctx;

  if (state.stage === 'field') {
    let fields: FieldId[] | null = null;
    let label = query.trim();
    if (intent?.startsWith('interest:')) {
      const key = intent.slice(9);
      fields = INTEREST_FIELDS[key] ?? null;
      label = t(`assistant.interest_${key}`);
    } else {
      fields = detectFields(query);
      if (fields) label = fields.map((f) => t(`fields.${f}`)).join(' + ');
    }
    if (!fields) {
      return {
        text: t('assistant.wizardFieldUnknown'),
        chips: interestChips(ctx),
        wizard: { stage: 'field' },
      };
    }
    const amounts = [30000, 60000, 100000].map((usd) => Math.round(convert(usd, 'USD', ctx.home) / 100) * 100);
    return {
      text: t('assistant.wizardAskBudget', { field: label }),
      chips: [
        ...amounts.map((a) => ({ label: formatMoney(a, ctx.home), send: formatMoney(a, ctx.home), intent: `wamt:${a}` })),
        { label: t('assistant.wizardSkip'), send: t('assistant.wizardSkip'), intent: 'wamt:none' },
      ],
      wizard: { stage: 'budget', fields, fieldLabel: label },
    };
  }

  if (state.stage === 'budget') {
    let budget: number | null = null;
    if (intent === 'wamt:none') budget = null;
    else if (intent?.startsWith('wamt:')) budget = Number(intent.slice(5));
    else budget = parseAmount(query);
    return {
      text: t('assistant.wizardAskPref'),
      chips: [
        ...Object.keys(WHERE_COUNTRIES).map((k) => ({
          label: t(`assistant.where_${k}`),
          send: t(`assistant.where_${k}`),
          intent: `wpref:${k}`,
        })),
        { label: t('assistant.pref_any'), send: t('assistant.pref_any'), intent: 'wpref:any' },
      ],
      wizard: { ...state, stage: 'pref', budget },
    };
  }

  if (state.stage === 'pref') {
    let prefKey = intent?.startsWith('wpref:') ? intent.slice(6) : 'any';
    if (!intent) {
      const ql = query.toLowerCase();
      if (/(warm|hot|panas|热|暖)/.test(ql)) prefKey = 'warm';
      else if (/(cool|cold|snow|sejuk|冷|凉)/.test(ql)) prefKey = 'cool';
      else if (/(english|inggeris|英语)/.test(ql)) prefKey = 'english';
      else if (/(cheap|murah|便宜|affordable)/.test(ql)) prefKey = 'cheap';
    }
    return {
      text: t('assistant.wizardAskGoal'),
      chips: (['work', 'home', 'unsure'] as const).map((k) => ({
        label: t(`assistant.goal_${k}`),
        send: t(`assistant.goal_${k}`),
        intent: `wgoal:${k}`,
      })),
      wizard: { ...state, stage: 'goal', pref: prefKey },
    };
  }

  // Final stage: all four answers → one recommendation.
  let goal = intent?.startsWith('wgoal:') ? intent.slice(6) : 'unsure';
  if (!intent) {
    const ql = query.toLowerCase();
    if (/(work|job|stay|pr\b|migrate|kerja|làm việc|ở lại|工作|留下|취업|就職)/.test(ql)) goal = 'work';
    else if (/(home|back|return|balik|pulang|về nước|回国|回國|귀국|帰国)/.test(ql)) goal = 'home';
  }
  const prefKey = state.pref ?? 'any';
  const countries = prefKey === 'any' ? null : WHERE_COUNTRIES[prefKey] ?? null;

  let pool = ctx.matchData.results.filter((r) => state.fields?.includes(r.course.field));
  if (countries) pool = pool.filter((r) => countries.includes(r.course.country));
  // "I want to work there after" + no country preference → favor destinations
  // with real post-study work visa routes.
  if (goal === 'work' && !countries) {
    const psw = pool.filter((r) => (['AU', 'CA', 'GB', 'NZ'] as CountryCode[]).includes(r.course.country));
    if (psw.length >= 3) pool = psw;
  }
  let relaxedNote = '';
  let withBudget = state.budget ? pool.filter((r) => annualCost(r, ctx) <= state.budget!) : pool;
  if (withBudget.length === 0 && state.budget) {
    withBudget = pool;
    relaxedNote = `\n\n${t('assistant.wizardRelaxed')}`;
  }
  const goalNote =
    goal === 'work' ? `\n\n${t('assistant.goalNoteWork')}` : goal === 'home' ? `\n\n${t('assistant.goalNoteHome')}` : '';
  const summary = t('assistant.wizardSummary', {
    field: state.fieldLabel ?? '',
    budget: state.budget ? formatMoney(state.budget, ctx.home) : t('assistant.wizardSkip'),
    pref: prefKey === 'any' ? t('assistant.pref_any') : t(`assistant.where_${prefKey}`),
  });
  const result = recommend(withBudget, ctx, 'assistant.recommendStudy', { system: ctx.profile.qualification.toUpperCase() });
  return { text: `${summary}\n\n${result.text}${goalNote}${relaxedNote}`, chips: result.chips, wizard: null };
}

function interestChips(ctx: AssistantCtx): QuickReply[] {
  return Object.keys(INTEREST_FIELDS).map((k) => ({
    label: ctx.t(`assistant.interest_${k}`),
    send: ctx.t(`assistant.interest_${k}`),
    intent: `interest:${k}`,
  }));
}

/** "Open <uni> ↗" chips — tap to jump to the course page (official website lives there too). */
function openChips(results: MatchResult[], ctx: AssistantCtx): QuickReply[] {
  return results.map((r) => ({
    label: ctx.t('assistant.chipOpen', { name: r.institution.short }),
    send: ctx.t('assistant.chipOpen', { name: r.institution.short }),
    intent: `open:${r.course.id}`,
    route: `/course/${r.course.id}`,
  }));
}

function recommend(results: MatchResult[], ctx: AssistantCtx, introKey: string, introOpts?: Record<string, unknown>): AssistantReply {
  // One course per institution so the top-3 spans different universities.
  const ranked = rank(results, ctx);
  const seen = new Set<string>();
  const top = ranked.filter((r) => {
    if (seen.has(r.institution.id)) return false;
    seen.add(r.institution.id);
    return true;
  }).slice(0, 3);
  if (top.length === 0) {
    return { text: ctx.t('assistant.noMatches'), chips: menuChips(ctx) };
  }
  const lines = top.map((r) => `• ${courseLine(r, ctx)}`).join('\n');
  return {
    text: `${ctx.t(introKey, introOpts)}\n\n${lines}\n\n${ctx.t('assistant.openMatchHint')}`,
    chips: openChips(top, ctx),
  };
}

function cityAnswer(city: CityInfo, sub: string, ctx: AssistantCtx): AssistantReply {
  const { t } = ctx;
  const col = ctx.matchData.colByCity.get(city.city);
  const chips: QuickReply[] = [
    { label: t('assistant.chipCityWeather', { city: city.city }), send: t('assistant.chipCityWeather', { city: city.city }), intent: `city:${city.city}:weather` },
    { label: t('assistant.chipCitySafety', { city: city.city }), send: t('assistant.chipCitySafety', { city: city.city }), intent: `city:${city.city}:safety` },
    { label: t('assistant.chipCityCost', { city: city.city }), send: t('assistant.chipCityCost', { city: city.city }), intent: `city:${city.city}:cost` },
  ];
  if (sub === 'weather') return { text: t('assistant.cityWeather', { city: city.city, climate: city.climate }), chips };
  if (sub === 'safety') return { text: t('assistant.citySafety', { city: city.city, safety: city.safety }), chips };
  if (sub === 'cost' && col) {
    const monthly = col.rentMonthly + col.foodMonthly + col.transportMonthly;
    const fare = ctx.flights.fares[city.country]?.[ctx.profile.homeCountry];
    const flightLine = fare && fare[0] > 0
      ? `\n\n${t('assistant.cityFlight', {
          low: formatMoney(Math.round(convert(fare[0], 'USD', ctx.home)), ctx.home),
          peak: formatMoney(Math.round(convert(fare[1], 'USD', ctx.home)), ctx.home),
        })}`
      : '';
    return {
      text: `${t('assistant.cityCost', {
        city: city.city,
        rent: formatMoney(col.rentMonthly, col.currency),
        food: formatMoney(col.foodMonthly, col.currency),
        transport: formatMoney(col.transportMonthly, col.currency),
        total: formatMoney(monthly, col.currency),
        homeTotal: formatMoney(convert(monthly, col.currency, ctx.home), ctx.home),
      })}${flightLine}`,
      chips,
    };
  }
  return {
    text: t('assistant.cityOverview', { city: city.city, climate: city.climate, safety: city.safety }),
    chips,
  };
}

function budgetAnswer(amount: number, ctx: AssistantCtx): AssistantReply {
  const { t } = ctx;
  const eligible = ctx.matchData.results.filter((r) => r.status === 'eligible' && r.course.level === 'bachelor');
  const affordable = eligible.filter((r) => annualCost(r, ctx) <= amount);
  if (affordable.length === 0) {
    const cheapestTop = rank(eligible, ctx).slice(0, 2);
    const cheapest = cheapestTop.map((r) => `• ${courseLine(r, ctx)}`).join('\n');
    return {
      text: `${t('assistant.budgetNone', { amount: formatMoney(amount, ctx.home) })}\n\n${cheapest}`,
      chips: openChips(cheapestTop, ctx),
    };
  }
  const top = affordable.sort((a, b) => annualCost(a, ctx) - annualCost(b, ctx)).slice(0, 3);
  return {
    text: `${t('assistant.budgetAnswer', { amount: formatMoney(amount, ctx.home), count: affordable.length })}\n\n${top
      .map((r) => `• ${courseLine(r, ctx)}`)
      .join('\n')}\n\n${t('assistant.budgetNote')}`,
    chips: openChips(top, ctx),
  };
}

function parseAmount(q: string): number | null {
  const m = q.replace(/,/g, '').match(/(\d{3,9})(\s*k)?/i);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] ? 1000 : 1);
  return n >= 1000 ? n : null;
}

export function respond(query: string, ctx: AssistantCtx, intent?: string): AssistantReply {
  const { t } = ctx;
  const q = query.toLowerCase();

  if (intent) {
    if (intent === 'menu') return { text: t('assistant.fallback'), chips: menuChips(ctx) };
    if (intent === 'study') {
      // Starts the interview: field (typed or tapped) → budget → climate.
      return {
        text: t('assistant.studyAsk'),
        chips: interestChips(ctx),
        wizard: { stage: 'field' },
      };
    }
    if (intent === 'where') {
      // "Where" now interviews too — a country pick without knowing the
      // field, budget and career goal is a guess, not advice.
      return {
        text: t('assistant.wizardWhereIntro'),
        chips: interestChips(ctx),
        wizard: { stage: 'field' },
      };
    }
    if (intent === 'talk') {
      return {
        text: t('assistant.personalOpen'),
        chips: [
          { label: t('assistant.chipHomesick'), send: t('assistant.chipHomesick'), intent: 'p:homesick' },
          { label: t('assistant.chipNervous'), send: t('assistant.chipNervous'), intent: 'p:nervous' },
          { label: t('assistant.chipMoney'), send: t('assistant.chipMoney'), intent: 'p:money' },
        ],
      };
    }
    if (intent.startsWith('p:')) return personalAnswer(intent.slice(2) as PersonalKind, ctx);
    if (intent === 'budget') {
      const amounts = [30000, 60000, 100000].map((usd) => Math.round(convert(usd, 'USD', ctx.home) / 100) * 100);
      return {
        text: t('assistant.budgetAsk'),
        chips: amounts.map((a) => ({
          label: formatMoney(a, ctx.home),
          send: formatMoney(a, ctx.home),
          intent: `amount:${a}`,
        })),
      };
    }
    if (intent.startsWith('amount:')) return budgetAnswer(Number(intent.slice(7)), ctx);
    if (intent.startsWith('interest:')) {
      const fields = INTEREST_FIELDS[intent.slice(9)] ?? [];
      return recommend(
        ctx.matchData.results.filter((r) => fields.includes(r.course.field)),
        ctx,
        'assistant.recommendStudy',
        { system: ctx.profile.qualification.toUpperCase() },
      );
    }
    if (intent.startsWith('where:')) {
      const countries = WHERE_COUNTRIES[intent.slice(6)] ?? [];
      return recommend(
        ctx.matchData.results.filter((r) => countries.includes(r.course.country)),
        ctx,
        'assistant.recommendWhere',
      );
    }
    if (intent.startsWith('city:')) {
      const [, cityName, sub] = intent.split(':');
      const city = ctx.cityInfo.find((c) => c.city === cityName);
      if (city) return cityAnswer(city, sub ?? 'all', ctx);
    }
  }

  // Emergency numbers first — "police / ambulance" must never fuzzy-match a
  // school name; answer from the verified per-country emergency lines.
  if (EMERGENCY_RE.test(q)) {
    const cityHit = ctx.cityInfo.find((c) => wordHit(q, c.city));
    const countries = cityHit
      ? [cityHit.country]
      : [...new Set(rank(ctx.matchData.results, ctx).slice(0, 6).map((r) => r.course.country))].slice(0, 2);
    const lines = countries
      .map((c) => {
        const e = ctx.safety.emergencyLines[c];
        return e
          ? t('assistant.emergencyLine', {
              flag: FLAGS[c], country: t(`countries.${c}`),
              police: e.police, ambulance: e.ambulance, fire: e.fire,
            })
          : null;
      })
      .filter(Boolean)
      .join('\n');
    return {
      text: `${t('assistant.emergencyIntro')}\n\n${lines}\n\n${t('assistant.emergencyHubNote')}`,
      chips: [
        { label: t('assistant.chipSafetyHub'), send: t('assistant.chipSafetyHub'), intent: 'safety-hub', route: '/safety' },
      ],
    };
  }

  // Anything illegal gets a firm, kind refusal with the legal route — before
  // place matching, so "work illegally in Melbourne" never becomes city info.
  if (CHEAT_RE.test(q)) return refuse('docs', ctx);
  if (ILLEGAL_WORK_RE.test(q)) return refuse('work', ctx);
  if (ILLEGAL_OTHER_RE.test(q)) return refuse('other', ctx);

  // Free-text pipeline: institutions first (longest names win), then cities.
  // Full names match on word boundaries; short acronyms (ICE, UM, MIT) only
  // when typed as standalone capitals — "police" must not hit ICE.
  const inst = [...ctx.institutions]
    .sort((a, b) => b.name.length - a.name.length)
    .find((i) => wordHit(q, i.name) || (i.short.length <= 4 ? acronymHit(query, i.short) : wordHit(q, i.short)));
  if (inst) {
    const instResults = ctx.matchData.results.filter((r) => r.course.institutionId === inst.id);
    const costs = instResults.map((r) => annualCost(r, ctx)).filter((c) => c !== Number.MAX_SAFE_INTEGER);
    return {
      text: t('assistant.instAnswer', {
        name: inst.name,
        type: t(`instTypes.${inst.type}`),
        city: inst.city,
        country: t(`countries.${inst.country}`),
        tagline: inst.tagline,
        count: instResults.length,
        min: formatMoney(Math.min(...costs), ctx.home),
        max: formatMoney(Math.max(...costs), ctx.home),
        website: inst.website,
      }),
      chips: [
        {
          label: t('assistant.chipOpen', { name: inst.short }),
          send: t('assistant.chipOpen', { name: inst.short }),
          intent: `open-inst:${inst.id}`,
          route: `/institution/${inst.id}`,
        },
        { label: t('assistant.chipCityWeather', { city: inst.city }), send: t('assistant.chipCityWeather', { city: inst.city }), intent: `city:${inst.city}:weather` },
        { label: t('assistant.chipCityCost', { city: inst.city }), send: t('assistant.chipCityCost', { city: inst.city }), intent: `city:${inst.city}:cost` },
      ],
    };
  }

  const city = ctx.cityInfo.find((c) => wordHit(q, c.city));
  if (city) {
    const sub = WEATHER_RE.test(q) ? 'weather' : SAFETY_RE.test(q) ? 'safety' : COST_RE.test(q) ? 'cost' : 'all';
    return cityAnswer(city, sub, ctx);
  }

  // Personal worries — after place matching ("is Taipei safe" stays city
  // info) but before study/budget so feelings never get a price list back.
  if (P_LOW_RE.test(q)) return personalAnswer('low', ctx);
  if (P_MONEY_RE.test(q)) return personalAnswer('money', ctx);
  if (P_HOMESICK_RE.test(q)) return personalAnswer('homesick', ctx);
  if (P_FRIENDS_RE.test(q)) return personalAnswer('friends', ctx);
  if (P_FOOD_RE.test(q)) return personalAnswer('food', ctx);
  if (P_NERVOUS_RE.test(q)) return personalAnswer('nervous', ctx);

  if (STUDY_RE.test(q)) return respond(query, ctx, 'study');
  if (WHERE_RE.test(q)) return respond(query, ctx, 'where');

  const amount = parseAmount(q);
  if (amount && (BUDGET_RE.test(q) || amount >= 5000)) return budgetAnswer(amount, ctx);
  if (BUDGET_RE.test(q)) return respond(query, ctx, 'budget');

  if (WEATHER_RE.test(q) || SAFETY_RE.test(q) || COST_RE.test(q)) {
    const topCities = [...new Set(rank(ctx.matchData.results, ctx).slice(0, 6).map((r) => r.course.campusCity))].slice(0, 3);
    const sub = WEATHER_RE.test(q) ? 'weather' : SAFETY_RE.test(q) ? 'safety' : 'cost';
    return {
      text: t('assistant.askCity'),
      chips: topCities.map((c) => ({ label: c, send: c, intent: `city:${c}:${sub}` })),
    };
  }

  if (GREET_RE.test(q)) {
    return { text: t('assistant.greetingShort', { name: ctx.profile.name.split(' ')[0] }), chips: menuChips(ctx) };
  }
  return { text: t('assistant.fallback'), chips: menuChips(ctx) };
}

export { menuChips };
