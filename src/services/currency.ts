import fxData from '@/data/fx.json';
import { CURRENCY_SYMBOL, HOME_CURRENCY } from '@/constants/countries';
import type { CurrencyCode, FxTable, HomeCountryCode } from '@/types/models';

const fx = fxData as FxTable;

// Session FX table: starts from the bundled snapshot, upgraded once at launch
// by initLiveRates(). All conversions in the app read from here.
let rates: Record<CurrencyCode, number> = { ...fx.rates };
let ratesSource: 'static' | 'live' = 'static';
let ratesAsOf = fx.asOf;

export function getRatesMeta(): { source: 'static' | 'live'; asOf: string } {
  return { source: ratesSource, asOf: ratesAsOf };
}

/**
 * Fetch real-time rates (free, keyless, CORS-open feed). xe.com has no free
 * API — swap FEED_URL for xe's when a paid key exists; the shape below stays.
 * Falls back silently to the bundled table when offline or blocked.
 */
const FEED_URL = 'https://open.er-api.com/v6/latest/USD';

export async function initLiveRates(timeoutMs = 2500): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(FEED_URL, { signal: controller.signal });
    clearTimeout(timer);
    const json = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
    if (json.result === 'success' && json.rates) {
      const next = { ...rates };
      let updated = 0;
      (Object.keys(rates) as CurrencyCode[]).forEach((c) => {
        const v = json.rates?.[c];
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
          next[c] = v;
          updated += 1;
        }
      });
      if (updated >= 5) {
        rates = next;
        ratesSource = 'live';
        ratesAsOf = json.time_last_update_utc
          ? new Date(json.time_last_update_utc).toISOString().slice(0, 10)
          : ratesAsOf;
      }
    }
  } catch {
    // offline / blocked → bundled snapshot stays in effect
  }
}

export const ALL_CURRENCIES = Object.keys(fx.rates) as CurrencyCode[];

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount;
  return (amount / rates[from]) * rates[to];
}

/** The student's display currency: explicit choice first, else home country's. */
export function homeCurrencyFor(profile: { homeCountry: HomeCountryCode; currency?: CurrencyCode }): CurrencyCode {
  return profile.currency ?? HOME_CURRENCY[profile.homeCountry];
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
