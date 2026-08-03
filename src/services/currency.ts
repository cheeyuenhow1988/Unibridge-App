import fxData from '@/data/fx.json';
import { CURRENCY_SYMBOL, HOME_CURRENCY } from '@/constants/countries';
import type { CurrencyCode, FxTable, HomeCountryCode } from '@/types/models';

const fx = fxData as FxTable;

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount;
  return (amount / fx.rates[from]) * fx.rates[to];
}

export function homeCurrencyFor(homeCountry: HomeCountryCode): CurrencyCode {
  return HOME_CURRENCY[homeCountry];
}

function groupDigits(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "A$38,000" — compacts to "₫1.2B" / "Rp245M" above a million so huge currencies stay scannable. */
export function formatMoney(amount: number, currency: CurrencyCode): string {
  const sym = CURRENCY_SYMBOL[currency];
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${sym}${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  return `${sym}${groupDigits(Math.round(amount))}`;
}

/** "A$38,000 / ≈ RM114,500" — local amount plus converted home-currency estimate. */
export function formatDual(amount: number, from: CurrencyCode, home: CurrencyCode): string {
  if (from === home) return formatMoney(amount, from);
  return `${formatMoney(amount, from)} / ≈ ${formatMoney(convert(amount, from, home), home)}`;
}

export function formatApprox(amount: number, from: CurrencyCode, home: CurrencyCode): string {
  return `≈ ${formatMoney(convert(amount, from, home), home)}`;
}
