import type { CountryCode, CurrencyCode, HomeCountryCode } from '@/types/models';

export const DEST_COUNTRIES: CountryCode[] = ['AU', 'MY', 'TW', 'GB', 'SG', 'NZ', 'RU'];
export const HOME_COUNTRIES: HomeCountryCode[] = ['MY', 'TW', 'SG', 'ID', 'VN', 'CN'];

export const FLAGS: Record<CountryCode | HomeCountryCode, string> = {
  AU: '🇦🇺', MY: '🇲🇾', TW: '🇹🇼', GB: '🇬🇧', SG: '🇸🇬', NZ: '🇳🇿', RU: '🇷🇺',
  ID: '🇮🇩', VN: '🇻🇳', CN: '🇨🇳',
};

export const HOME_CURRENCY: Record<HomeCountryCode, CurrencyCode> = {
  MY: 'MYR', TW: 'TWD', SG: 'SGD', ID: 'IDR', VN: 'VND', CN: 'CNY',
};

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  AUD: 'A$', MYR: 'RM', TWD: 'NT$', GBP: '£', SGD: 'S$', NZD: 'NZ$',
  RUB: '₽', IDR: 'Rp', VND: '₫', CNY: '¥', USD: '$',
};
