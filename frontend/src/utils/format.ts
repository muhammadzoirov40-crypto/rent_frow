import type { TFunction } from 'i18next';
import i18n from '../i18n';

export type PriceUnit = 'per_hour' | 'per_day' | 'per_week' | 'per_month';

/** BCP-47 tag for the active (or given) UI language. */
export function localeFor(lang?: string): string {
  const lng = lang ?? i18n.language;
  if (lng === 'en') return 'en-US';
  if (lng === 'tj') return 'tg-TJ';
  return 'ru-RU';
}

/**
 * `12 500` — grouped digits, no currency.
 * Replaces the hardcoded `toLocaleString('ru-RU')` calls so amounts follow the
 * language the user actually picked (tj/en/ru).
 */
export function formatAmount(
  value: number | null | undefined,
  lang?: string,
): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(localeFor(lang));
}

/** `сомони` — currency from the shared `common.somoni` key. */
export function currency(t: TFunction): string {
  return t('common.somoni');
}

/**
 * `12 500 сомони` — amount + currency.
 *
 * Replaces the hardcoded `сом` / `PRICE_UNIT_LABELS` copies that were spread
 * over FavoritesPage, ProfilePage, ListingPage and AdminPage.
 */
export function formatPrice(
  value: number | null | undefined,
  t: TFunction,
  lang?: string,
): string {
  return `${formatAmount(value, lang)} ${currency(t)}`;
}

/**
 * `/ рӯз` — the trailing rental period suffix.
 * Uses the shared `listing.per_*` keys so all three languages stay in sync.
 */
export function formatPriceUnit(
  t: TFunction,
  unit: string | null | undefined,
): string {
  if (!unit) return '';
  const key = `listing.${unit}`;
  const label = t(key);
  // Fall back to the raw key when the translation is missing.
  const text = label === key ? unit.replace('_', ' ') : label;
  return `/ ${text}`;
}

/** Full display: `12 500 сомони / рӯз`. */
export function formatPriceWithUnit(
  value: number | null | undefined,
  t: TFunction,
  lang?: string,
  unit?: string | null,
): string {
  const base = formatPrice(value, t, lang);
  const suffix = formatPriceUnit(t, unit);
  return suffix ? `${base} ${suffix}` : base;
}
