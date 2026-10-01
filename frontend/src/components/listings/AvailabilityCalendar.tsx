import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listings } from '../../api';

interface AvailabilityCalendarProps {
  listingId: number;
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const MONTHS: Record<string, string[]> = {
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  tj: ['Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн', 'Июл', 'Август', 'Сентябр', 'Октбр', 'Ноябр', 'Декбр'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const WEEKDAYS: Record<string, string[]> = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  tj: ['Душ', 'Сеш', 'Чор', 'Пан', 'Ҷум', 'Шан', 'Як'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function AvailabilityCalendar({ listingId, startDate, endDate, onChange }: AvailabilityCalendarProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('ru') ? 'ru' : i18n.language.startsWith('tj') ? 'tj' : 'en';

  const now = new Date();
  const todayISO = toISO(now);
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const monthStartISO = toISO(new Date(cursor.y, cursor.m, 1));
  const monthEndISO = toISO(new Date(cursor.y, cursor.m + 1, 0));

  const { data: calendar, isLoading } = useQuery({
    queryKey: ['listing-calendar', listingId, monthStartISO],
    queryFn: () => listings.getCalendar(listingId, monthStartISO, monthEndISO),
    enabled: !!listingId,
    staleTime: 60_000,
  });

  const blocked = useMemo(() => {
    const map: Record<string, string> = {};
    calendar?.days?.forEach((d) => {
      map[d.date] = d.status;
    });
    return map;
  }, [calendar]);

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const offset = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isPastMonth =
    cursor.y < now.getFullYear() || (cursor.y === now.getFullYear() && cursor.m < now.getMonth());

  const rangeHasBlocked = (from: string, to: string) => {
    const d = new Date(`${from}T00:00:00`);
    const endD = new Date(`${to}T00:00:00`);
    while (d <= endD) {
      if (blocked[toISO(d)]) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  };

  const onDayClick = (iso: string) => {
    if (iso < todayISO || blocked[iso]) return;
    if (!startDate || (startDate && endDate)) {
      onChange(iso, '');
      return;
    }
    if (iso <= startDate) {
      onChange(iso, '');
      return;
    }
    if (rangeHasBlocked(startDate, iso)) {
      onChange(iso, '');
      return;
    }
    onChange(startDate, iso);
  };

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const fmt = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return `${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
  };

  const selDays =
    startDate && endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000,
          ),
        )
      : 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('listing.availability')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={isPastMonth}
            aria-label="Previous month"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-[#1A1A2E] dark:text-white w-36 text-center">
            {MONTHS[lang][cursor.m]} {cursor.y}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS[lang].map((wd) => (
          <div key={wd} className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 py-1">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {isLoading
          ? Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-9 sm:h-10 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse" />
            ))
          : cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const iso = `${cursor.y}-${pad(cursor.m + 1)}-${pad(day)}`;
              const isPast = iso < todayISO;
              const block = blocked[iso];
              const isStart = startDate === iso;
              const isEnd = endDate === iso;
              const inRange =
                !!startDate && !!endDate && iso > startDate && iso < endDate;

              let cls = 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer';
              if (isPast) cls = 'text-gray-300 dark:text-gray-600 cursor-not-allowed';
              else if (block === 'booked')
                cls = 'bg-red-500/15 text-red-600 dark:text-red-400 font-semibold cursor-not-allowed';
              else if (block === 'pending')
                cls = 'bg-amber-400/20 text-amber-700 dark:text-amber-400 font-semibold cursor-not-allowed';
              else if (isStart || isEnd)
                cls = 'bg-[var(--accent)] text-white font-bold shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]';
              else if (inRange) cls = 'bg-[rgb(var(--accent-rgb)/0.15)] text-[var(--accent)] font-semibold';

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onDayClick(iso)}
                  disabled={isPast || !!block}
                  aria-label={iso}
                  className={`h-9 sm:h-10 rounded-lg text-sm flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${cls}`}
                >
                  {day}
                </button>
              );
            })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-[11px] font-medium text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          {t('listing.available')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          {t('listing.booked')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          {t('listing.pending')}
        </span>
      </div>

      {(startDate || endDate) && (
        <div className="mt-3 flex items-center justify-between gap-2 bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.25)] rounded-xl px-3 py-2.5">
          <span className="text-sm font-semibold text-[var(--accent)]">
            {startDate ? fmt(startDate) : '—'} → {endDate ? fmt(endDate) : '…'}
            {selDays > 0 && (
              <span className="text-gray-500 dark:text-gray-400 font-normal"> · {selDays} {t('listing.days')}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => onChange('', '')}
            aria-label={t('listing.clearDates')}
            className="w-6 h-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-red-500 transition shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
