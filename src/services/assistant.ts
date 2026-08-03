import { FLAGS } from '@/constants/countries';
import type { MatchData } from '@/hooks/useMatchData';
import { convert, formatMoney } from '@/services/currency';
import { trueAnnualIn } from '@/services/costs';
import type {
  CityInfo, CountryCode, CurrencyCode, FieldId, Institution, MatchResult, StudentProfile,
} from '@/types/models';

export interface QuickReply {
  label: string;
  send: string;
  intent: string;
}

/** Multi-step interview state: field → budget → climate → recommendation. */
export interface WizardState {
  stage: 'field' | 'budget' | 'pref';
  fields?: FieldId[];
  fieldLabel?: string;
  budget?: number | null;
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
  home: CurrencyCode;
}

const WEATHER_RE = /(weather|climate|rain|snow|cold|hot|temperature|cuaca|sejuk|panas|天气|气候|下雨|冷|热)/i;
const SAFETY_RE = /(safe|safety|crime|danger|selamat|jenayah|bahaya|安全|治安|危险)/i;
const COST_RE = /(cost|rent|living|expensive|cheap|price|kos|sewa|murah|mahal|生活费|房租|贵|便宜)/i;
const STUDY_RE = /(what.*(study|course|major)|study what|choose.*(study|course)|belajar apa|tak tahu.*belajar|读什么|学什么|不知道读)/i;
const WHERE_RE = /(where.*study|which country|country.*(study|choose)|negara mana|去哪.*(读|留学)|哪个国家)/i;
const BUDGET_RE = /(budget|afford|enough|cukup|bajet|mampu|预算|够|负担)/i;
const GREET_RE = /^(hi|hello|hey|hai|helo|你好|哈喽|嗨)\b/i;

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
  ];
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
  cool: ['GB', 'NZ', 'RU'],
  english: ['AU', 'GB', 'NZ', 'SG'],
  cheap: ['MY', 'TW', 'RU'],
};

// Free-text field detection for the interview (en + basic ms/zh keywords).
const FIELD_KEYWORDS: [RegExp, FieldId[]][] = [
  [/(market|hr|human resource|account|financ|bank|business|econom|entrepreneur|supply|logistic|perniagaan|niaga|商|金融|市场|会计|营销)/i, ['business']],
  [/(software|coding|program|computer|\bit\b|data|cyber|game|\bai\b|komputer|程序|编程|电脑|数据|计算机)/i, ['it']],
  [/(doctor|medic|nurse|pharma|physio|dentist|psycholog|health|doktor|jururawat|医|护理|药|心理)/i, ['health']],
  [/(civil|mechanic|electric|mechatronic|aero|engineer|jurutera|kejuruteraan|工程)/i, ['engineering']],
  [/(interior|fashion|graphic|animation|product design|design|reka bentuk|设计|时装|动画)/i, ['design']],
  [/(law|legal|lawyer|undang|律师|法律)/i, ['law']],
  [/(film|media|journal|advertis|public relation|broadcast|传媒|新闻|媒体)/i, ['media']],
  [/(teach|education|tesl|guru|pendidikan|教育|老师|教师)/i, ['education']],
  [/(hotel|chef|culinar|tourism|hospitality|aviation|cabin|masak|pelancongan|酒店|厨|旅游|烹饪)/i, ['hospitality']],
  [/(architect|urban|quantity survey|construction|seni bina|建筑)/i, ['architecture']],
  [/(physic|chemist|biolog|biotech|math|actuar|science|sains|物理|化学|生物|数学|科学)/i, ['science']],
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

  // Final stage: combine all three answers into one recommendation.
  let prefKey = intent?.startsWith('wpref:') ? intent.slice(6) : 'any';
  if (!intent) {
    const q = query.toLowerCase();
    if (/(warm|hot|panas|热|暖)/.test(q)) prefKey = 'warm';
    else if (/(cool|cold|snow|sejuk|冷|凉)/.test(q)) prefKey = 'cool';
    else if (/(english|inggeris|英语)/.test(q)) prefKey = 'english';
    else if (/(cheap|murah|便宜|affordable)/.test(q)) prefKey = 'cheap';
  }
  const countries = prefKey === 'any' ? null : WHERE_COUNTRIES[prefKey] ?? null;

  let pool = ctx.matchData.results.filter((r) => state.fields?.includes(r.course.field));
  if (countries) pool = pool.filter((r) => countries.includes(r.course.country));
  let relaxedNote = '';
  let withBudget = state.budget ? pool.filter((r) => annualCost(r, ctx) <= state.budget!) : pool;
  if (withBudget.length === 0 && state.budget) {
    withBudget = pool;
    relaxedNote = `\n\n${t('assistant.wizardRelaxed')}`;
  }
  const summary = t('assistant.wizardSummary', {
    field: state.fieldLabel ?? '',
    budget: state.budget ? formatMoney(state.budget, ctx.home) : t('assistant.wizardSkip'),
    pref: prefKey === 'any' ? t('assistant.pref_any') : t(`assistant.where_${prefKey}`),
  });
  const result = recommend(withBudget, ctx, 'assistant.recommendStudy', { system: ctx.profile.qualification.toUpperCase() });
  return { text: `${summary}\n\n${result.text}${relaxedNote}`, chips: result.chips, wizard: null };
}

function interestChips(ctx: AssistantCtx): QuickReply[] {
  return Object.keys(INTEREST_FIELDS).map((k) => ({
    label: ctx.t(`assistant.interest_${k}`),
    send: ctx.t(`assistant.interest_${k}`),
    intent: `interest:${k}`,
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
    return {
      text: t('assistant.cityCost', {
        city: city.city,
        rent: formatMoney(col.rentMonthly, col.currency),
        food: formatMoney(col.foodMonthly, col.currency),
        transport: formatMoney(col.transportMonthly, col.currency),
        total: formatMoney(monthly, col.currency),
        homeTotal: formatMoney(convert(monthly, col.currency, ctx.home), ctx.home),
      }),
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
    const cheapest = rank(eligible, ctx).slice(0, 2).map((r) => `• ${courseLine(r, ctx)}`).join('\n');
    return { text: `${t('assistant.budgetNone', { amount: formatMoney(amount, ctx.home) })}\n\n${cheapest}` };
  }
  const top = affordable.sort((a, b) => annualCost(a, ctx) - annualCost(b, ctx)).slice(0, 3);
  return {
    text: `${t('assistant.budgetAnswer', { amount: formatMoney(amount, ctx.home), count: affordable.length })}\n\n${top
      .map((r) => `• ${courseLine(r, ctx)}`)
      .join('\n')}\n\n${t('assistant.budgetNote')}`,
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
      return {
        text: t('assistant.whereAsk'),
        chips: Object.keys(WHERE_COUNTRIES).map((k) => ({
          label: t(`assistant.where_${k}`),
          send: t(`assistant.where_${k}`),
          intent: `where:${k}`,
        })),
      };
    }
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

  // Free-text pipeline: institutions first (longest names win), then cities.
  const inst = [...ctx.institutions]
    .sort((a, b) => b.name.length - a.name.length)
    .find((i) => q.includes(i.name.toLowerCase()) || q.includes(i.short.toLowerCase()));
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
        { label: t('assistant.chipCityWeather', { city: inst.city }), send: t('assistant.chipCityWeather', { city: inst.city }), intent: `city:${inst.city}:weather` },
        { label: t('assistant.chipCityCost', { city: inst.city }), send: t('assistant.chipCityCost', { city: inst.city }), intent: `city:${inst.city}:cost` },
      ],
    };
  }

  const city = ctx.cityInfo.find((c) => q.includes(c.city.toLowerCase()));
  if (city) {
    const sub = WEATHER_RE.test(q) ? 'weather' : SAFETY_RE.test(q) ? 'safety' : COST_RE.test(q) ? 'cost' : 'all';
    return cityAnswer(city, sub, ctx);
  }

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
