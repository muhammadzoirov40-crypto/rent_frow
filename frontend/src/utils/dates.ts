export function parseDate(value: string | Date | null | undefined): Date {
  if (!value) return new Date(NaN);
  if (value instanceof Date) return value;
  const hasTime = value.includes('T');
  const hasTz = /(?:Z|z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasTime && !hasTz ? `${value}Z` : value);
}

const RU_DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  if (typeof value === 'string' && !value.includes('T')) {
    return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString('ru-RU', {
      ...RU_DATE,
      timeZone: 'UTC',
    });
  }
  const d = parseDate(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', RU_DATE);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = parseDate(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMonthYear(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = parseDate(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' });
}
