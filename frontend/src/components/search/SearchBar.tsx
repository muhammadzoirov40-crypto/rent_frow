import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, CalendarDays } from 'lucide-react';
import { cities, type City } from '../../api';

export interface SearchBarValues {
  q: string;
  city_id: string;
  start_date: string;
  end_date: string;
}

interface SearchBarProps {
  initial?: Partial<SearchBarValues>;
  onSubmit?: (values: SearchBarValues) => void;
  compact?: boolean;
}

const fieldCls =
  'w-full min-w-0 bg-transparent border-0 focus:outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 py-2.5';
const groupCls =
  'flex items-center gap-2.5 px-3.5 rounded-xl transition hover:bg-gray-50 dark:hover:bg-white/5 focus-within:bg-gray-50 dark:focus-within:bg-white/5';

export default function SearchBar({ initial, onSubmit, compact = false }: SearchBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: cityList = [] } = useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: cities.getAll,
  });

  const [q, setQ] = useState(initial?.q ?? '');
  const [cityId, setCityId] = useState(initial?.city_id ?? '');
  const [startDate, setStartDate] = useState(initial?.start_date ?? '');
  const [endDate, setEndDate] = useState(initial?.end_date ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const values: SearchBarValues = {
      q: q.trim(),
      city_id: cityId,
      start_date: startDate,
      end_date: endDate,
    };
    if (onSubmit) {
      onSubmit(values);
      return;
    }
    const params = new URLSearchParams();
    if (values.q) params.set('q', values.q);
    if (values.city_id) params.set('city_id', values.city_id);
    if (values.start_date) params.set('start_date', values.start_date);
    if (values.end_date) params.set('end_date', values.end_date);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className={`flex flex-col gap-1.5 bg-white dark:bg-[#1A1A2E] border border-gray-200 dark:border-white/10 rounded-2xl shadow-[0_12px_40px_-24px_rgba(17,24,39,0.45)] p-2 md:flex-row md:items-center md:gap-1 ${
        compact ? 'md:rounded-xl rounded-xl' : ''
      }`}
    >
      <div className={`flex-1 min-w-0 md:border-r border-gray-100 dark:border-white/10 ${groupCls}`}>
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('home.searchWhat')}
          aria-label={t('home.searchWhat')}
          className={fieldCls}
        />
      </div>

      <div className={`flex-1 min-w-0 md:border-r border-gray-100 dark:border-white/10 ${groupCls}`}>
        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
        <select
          value={cityId}
          onChange={(e) => setCityId(e.target.value)}
          aria-label={t('search.city')}
          className={`${fieldCls} cursor-pointer`}
        >
          <option value="">{t('home.allCities')}</option>
          {cityList.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      <div className={`flex-1 min-w-0 md:border-r border-gray-100 dark:border-white/10 ${groupCls}`}>
        <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label={t('search.dateFrom')}
          className={`${fieldCls} md:w-[7.5rem]`}
        />
        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
        <input
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => setEndDate(e.target.value)}
          aria-label={t('search.dateTo')}
          className={`${fieldCls} md:w-[7.5rem]`}
        />
      </div>

      <button
        type="submit"
        className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#FF6B35] hover:bg-[#e55a2b] text-white text-sm font-bold transition-colors shadow-lg shadow-[#FF6B35]/25"
      >
        <Search className="w-4 h-4" />
        {t('home.find')}
      </button>
    </form>
  );
}
