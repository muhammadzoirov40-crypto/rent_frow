import { useState, type MouseEvent } from 'react';
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
  'flex items-center gap-1.5 px-2 rounded-xl transition hover:bg-[rgb(var(--accent-rgb)/0.08)] dark:hover:bg-[rgb(var(--accent-rgb)/0.12)] focus-within:bg-[rgb(var(--accent-rgb)/0.08)] dark:focus-within:bg-[rgb(var(--accent-rgb)/0.12)] focus-within:ring-1 focus-within:ring-[rgb(var(--accent-rgb)/0.45)]';

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

  // The browser's own calendar button would be a second, dark calendar icon
  // sitting on top of the date text, so it is hidden in CSS. Clicking the
  // field itself now opens the picker instead.
  const openPicker = (e: MouseEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    el.focus();
    try {
      el.showPicker?.();
    } catch {
      /* unsupported browser — the field stays typeable */
    }
  };

  const selectCls =
    // appearance-none drops the native dropdown arrow (its UA padding alone
    // would eat ~32px, enough to clip "Ҳамаи категорияҳо"), so the right
    // padding stays at zero — there is no chevron to reserve room for.
    'w-full min-w-0 bg-transparent border-0 focus:outline-none text-sm text-gray-900 dark:text-white py-2.5 cursor-pointer appearance-none';

  return (
    <form
      onSubmit={submit}
      className={`bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-[rgb(var(--accent-rgb)/0.28)] shadow-[0_18px_45px_-22px_rgba(15,23,42,0.25)] dark:shadow-[0_30px_70px_-30px_rgb(var(--accent-rgb)/0.55)] p-2 flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center md:gap-1 backdrop-blur-md ${
        compact ? 'rounded-xl' : 'rounded-3xl'
      }`}
    >
      <div className={`flex-[2_1_0%] min-w-0 md:min-w-[5.5rem] md:border-r border-[rgb(var(--accent-rgb)/0.16)] dark:border-[rgb(var(--accent-rgb)/0.2)] ${groupCls}`}>
        <Search className="w-4 h-4 text-[var(--accent)] shrink-0" />
        <input
          type="search"
          value={values.q}
          onChange={(e) => set('q', e.target.value)}
          placeholder={t('home.searchWhat')}
          aria-label={t('home.searchWhat')}
          className={fieldCls}
        />
      </div>

      {/* 12rem, not 9.5rem: this label is the longest one in the bar and the
          group must keep ~138px for it once icon, gap and padding are paid. */}
      <div className={`flex-1 min-w-0 md:min-w-[5.25rem] md:border-r border-[rgb(var(--accent-rgb)/0.16)] dark:border-[rgb(var(--accent-rgb)/0.2)] ${groupCls}`}>
        <LayoutGrid className="w-4 h-4 text-[var(--accent)] shrink-0" />
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

      <div className={`flex-1 min-w-0 md:min-w-[4.75rem] md:border-r border-[rgb(var(--accent-rgb)/0.16)] dark:border-[rgb(var(--accent-rgb)/0.2)] ${groupCls}`}>
        <MapPin className="w-4 h-4 text-[var(--accent)] shrink-0" />
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

      <div className={`min-w-0 md:min-w-[13.25rem] md:border-r border-[rgb(var(--accent-rgb)/0.16)] dark:border-[rgb(var(--accent-rgb)/0.2)] ${groupCls}`}>
        <CalendarDays className="w-4 h-4 text-[var(--accent)] shrink-0" />
        <input
          type="date"
          value={values.start_date}
          onChange={(e) => set('start_date', e.target.value)}
          aria-label={t('search.dateFrom')}
          onClick={openPicker}
          className={`${fieldCls} date-field md:w-[4.75rem]`}
        />
        <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
        <input
          type="date"
          value={values.end_date}
          min={values.start_date || undefined}
          onChange={(e) => set('end_date', e.target.value)}
          aria-label={t('search.dateTo')}
          onClick={openPicker}
          className={`${fieldCls} date-field md:w-[4.75rem]`}
        />
      </div>

      {showMore && (
        <div className={`min-w-0 md:min-w-[12.75rem] md:border-r border-[rgb(var(--accent-rgb)/0.16)] dark:border-[rgb(var(--accent-rgb)/0.2)] ${groupCls}`}>
          <Tag className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={values.price_min}
            onChange={(e) => set('price_min', e.target.value)}
            placeholder={t('search.priceFrom')}
            aria-label={t('search.priceFrom')}
            className={`${fieldCls} md:w-[4.5rem]`}
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
            className={`${fieldCls} md:w-[4.5rem]`}
          />
        </div>
      )}

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-pressed={showMore}
          title={t('search.moreFilters')}
          className="hidden md:inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-[rgb(var(--accent-rgb)/0.12)] dark:hover:bg-[rgb(var(--accent-rgb)/0.14)] hover:text-[var(--accent)] transition"
        >
          <Tag className="w-4 h-4" />
        </button>
        <button
          type="submit"
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold transition-all shadow-[0_18px_35px_-12px_rgb(var(--accent-rgb)/0.6)] ring-1 ring-white/15 hover:ring-white/30"
        >
          <Search className="w-4 h-4" />
          {t('home.find')}
        </button>
      </div>
    </form>
  );
}
