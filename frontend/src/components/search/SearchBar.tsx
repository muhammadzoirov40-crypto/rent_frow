import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, CalendarDays, LayoutGrid, Tag } from 'lucide-react';
import { categories, cities, type Category, type City } from '../../api/index';
import { localizeCategoryName } from '../../utils/categoryName';

export interface SearchBarValues {
  q: string;
  category_id: string;
  city_id: string;
  start_date: string;
  end_date: string;
  price_min: string;
  price_max: string;
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

function toValues(params: URLSearchParams): SearchBarValues {
  return {
    q: params.get('q') || '',
    category_id: params.get('category_id') || '',
    city_id: params.get('city_id') || '',
    start_date: params.get('start_date') || '',
    end_date: params.get('end_date') || '',
    price_min: params.get('price_min') || '',
    price_max: params.get('price_max') || '',
  };
}

export default function SearchBar({ initial, onSubmit, compact = false }: SearchBarProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [values, setValues] = useState<SearchBarValues>({
    q: initial?.q ?? '',
    category_id: initial?.category_id ?? '',
    city_id: initial?.city_id ?? '',
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    price_min: initial?.price_min ?? '',
    price_max: initial?.price_max ?? '',
  });
  const [showMore, setShowMore] = useState(
    Boolean(initial?.price_min || initial?.price_max || initial?.category_id),
  );

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => cities.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const categoryList: Category[] = categoriesData?.items || [];
  const cityList: City[] = citiesData || [];

  const set = (key: keyof SearchBarValues, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: SearchBarValues = { ...values, q: values.q.trim() };
    if (onSubmit) {
      onSubmit(next);
      return;
    }
    const params = new URLSearchParams();
    (Object.keys(next) as (keyof SearchBarValues)[]).forEach((key) => {
      if (next[key]) params.set(key, next[key]);
    });
    navigate(`/search?${params.toString()}`);
  };

  const selectCls =
    'w-full min-w-0 bg-transparent border-0 focus:outline-none text-sm text-gray-900 dark:text-white py-2.5 pr-6 cursor-pointer appearance-none';

  return (
    <form
      onSubmit={submit}
      className={`bg-white dark:bg-[#1A1A2E] border border-gray-200 dark:border-white/10 rounded-2xl shadow-[0_12px_40px_-24px_rgba(17,24,39,0.45)] p-2 flex flex-col gap-1.5 md:flex-row md:items-center md:gap-1 ${
        compact ? 'md:rounded-xl rounded-xl' : ''
      }`}
    >
      <div className={`flex-1 min-w-0 md:border-r border-gray-100 dark:border-white/10 ${groupCls}`}>
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="search"
          value={values.q}
          onChange={(e) => set('q', e.target.value)}
          placeholder={t('home.searchWhat')}
          aria-label={t('home.searchWhat')}
          className={fieldCls}
        />
      </div>

      <div className={`flex-1 min-w-0 md:border-r border-gray-100 dark:border-white/10 ${groupCls}`}>
        <LayoutGrid className="w-4 h-4 text-gray-400 shrink-0" />
        <select
          value={values.category_id}
          onChange={(e) => set('category_id', e.target.value)}
          aria-label={t('search.category')}
          className={selectCls}
        >
          <option value="">{t('search.allCategories')}</option>
          {categoryList.map((cat) => (
            <option key={cat.id} value={String(cat.id)}>
              {localizeCategoryName(cat, i18n.language)}
            </option>
          ))}
        </select>
      </div>

      <div className={`flex-1 min-w-0 md:border-r border-gray-100 dark:border-white/10 ${groupCls}`}>
        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
        <select
          value={values.city_id}
          onChange={(e) => set('city_id', e.target.value)}
          aria-label={t('search.city')}
          className={selectCls}
        >
          <option value="">{t('search.allCities')}</option>
          {cityList.map((city) => (
            <option key={city.id} value={String(city.id)}>
              {i18n.language === 'tj' && city.name_tj ? city.name_tj : city.name}
            </option>
          ))}
        </select>
      </div>

      <div className={`flex-1 min-w-0 md:border-r border-gray-100 dark:border-white/10 ${groupCls}`}>
        <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="date"
          value={values.start_date}
          onChange={(e) => set('start_date', e.target.value)}
          aria-label={t('search.dateFrom')}
          className={`${fieldCls} md:w-[7.5rem]`}
        />
        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
        <input
          type="date"
          value={values.end_date}
          min={values.start_date || undefined}
          onChange={(e) => set('end_date', e.target.value)}
          aria-label={t('search.dateTo')}
          className={`${fieldCls} md:w-[7.5rem]`}
        />
      </div>

      {showMore && (
        <div className={`flex-1 min-w-0 md:border-r border-gray-100 dark:border-white/10 ${groupCls}`}>
          <Tag className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={values.price_min}
            onChange={(e) => set('price_min', e.target.value)}
            placeholder={t('search.priceFrom')}
            aria-label={t('search.priceFrom')}
            className={`${fieldCls} md:w-[6rem]`}
          />
          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={values.price_max}
            onChange={(e) => set('price_max', e.target.value)}
            placeholder={t('search.priceTo')}
            aria-label={t('search.priceTo')}
            className={`${fieldCls} md:w-[6rem]`}
          />
        </div>
      )}

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-pressed={showMore}
          title={t('search.moreFilters')}
          className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[var(--accent)] transition"
        >
          <Tag className="w-4 h-4" />
        </button>
        <button
          type="submit"
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold transition-colors shadow-lg shadow-[rgb(var(--accent-rgb)/0.25)]"
        >
          <Search className="w-4 h-4" />
          {t('home.find')}
        </button>
      </div>
    </form>
  );
}
