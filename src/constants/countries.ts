import type { CountryCode, CurrencyCode, HomeCountryCode, QualificationId } from '@/types/models';

export const DEST_COUNTRIES: CountryCode[] = ['AU', 'MY', 'TW', 'GB', 'SG', 'NZ', 'RU', 'US', 'CA', 'CN'];
export const HOME_COUNTRIES: HomeCountryCode[] = ['MY', 'TW', 'SG', 'ID', 'VN', 'CN', 'MM', 'KR', 'JP'];

export const FLAGS: Record<CountryCode | HomeCountryCode, string> = {
  AU: '🇦🇺', MY: '🇲🇾', TW: '🇹🇼', GB: '🇬🇧', SG: '🇸🇬', NZ: '🇳🇿', RU: '🇷🇺', US: '🇺🇸', CA: '🇨🇦',
  ID: '🇮🇩', VN: '🇻🇳', CN: '🇨🇳', MM: '🇲🇲', KR: '🇰🇷', JP: '🇯🇵',
};

export const HOME_CURRENCY: Record<HomeCountryCode, CurrencyCode> = {
  MY: 'MYR', TW: 'TWD', SG: 'SGD', ID: 'IDR', VN: 'VND', CN: 'CNY',
  MM: 'MMK', KR: 'KRW', JP: 'JPY',
};

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  AUD: 'A$', MYR: 'RM', TWD: 'NT$', GBP: '£', SGD: 'S$', NZD: 'NZ$',
  RUB: '₽', IDR: 'Rp', VND: '₫', CNY: '¥', USD: '$', CAD: 'C$',
  MMK: 'K', KRW: '₩', JPY: '¥',
};

/** How rentals are actually advertised in each destination country — Australia
 * and New Zealand list per week, everywhere else per calendar month. */
export const RENT_PERIOD: Record<CountryCode, 'week' | 'month'> = {
  AU: 'week', NZ: 'week', MY: 'month', TW: 'month', GB: 'month',
  SG: 'month', RU: 'month', US: 'month', CA: 'month', CN: 'month',
};

/** National grading system(s) per home country — pinned and preselected at registration. */
export const RECOMMENDED_QUALS: Record<HomeCountryCode, QualificationId[]> = {
  MY: ['spm', 'stpm', 'uec'], TW: ['gsat'], SG: ['alevels'], ID: ['sma'], VN: ['thpt'],
  CN: ['gaokao'], MM: ['matric'], KR: ['krgpa'], JP: ['jpgpa'],
};

/** Systems not tied to one country — kept when the home country changes. */
export const INTERNATIONAL_QUALS: QualificationId[] = ['alevels', 'ib', 'gpa'];
