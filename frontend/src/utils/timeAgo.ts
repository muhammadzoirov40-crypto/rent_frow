import { parseDate, formatDate } from './dates';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Shared relative-time label.
 *
 * Replaces the three hardcoded-Russian `timeAgo` copies that used to live in
 * Header, MessagesPage and NotificationsPage. Everything is localised through
 * the caller's `t`, falling back to English when a key is missing.
 */
export function timeAgo(
  value: string | Date | null | undefined,
  t: Translate,
  fallbackToAbsolute = true,
): string {
  if (!value) return '—';

  const then = value instanceof Date ? value : parseDate(value);
  if (isNaN(then.getTime())) return '—';

  const diffMs = Date.now() - then.getTime();
  if (diffMs < 0) return formatDate(value);

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });

  const days = Math.floor(hours / 24);
  if (days < 30) return t('time.daysAgo', { count: days });

  const months = Math.floor(days / 30);
  if (months < 12) return t('time.monthsAgo', { count: months });

  return fallbackToAbsolute ? formatDate(value) : t('time.monthsAgo', { count: months });
}
