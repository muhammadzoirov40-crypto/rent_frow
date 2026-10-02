import { useTranslation } from 'react-i18next';
import { X, RotateCcw } from 'lucide-react';
import { type Category, type City, type District } from '../../api/index';
import { localizeCategoryName } from '../../utils/categoryName';
import { formatAmount } from '../../utils/format';
import { formatDate } from '../../utils/dates';
import { PRICE_UNITS, PROPERTY_TYPES } from './FilterSidebar';

/** URL params that describe a filter (`page` / `sort_by` are not filters). */
const FILTER_KEYS = [
  'city_id',
  'district_id',
  'category_id',
  'subcategory_id',
  'price_min',
  'price_max',
  'price_unit',
  'start_date',
  'end_date',
  'property_type',
  'rooms_min',
  'bathrooms_min',
  'min_rating',
  'available',
  'is_verified',
  'furnished',
  'parking',
  'wifi_included',
] as const;

const BOOL_LABEL_KEYS: Record<string, string> = {
  available: 'search.availableOnly',
  is_verified: 'search.verifiedOnly',
  furnished: 'search.furnished',
  parking: 'search.parking',
  wifi_included: 'search.wifi',
};

interface Chip {
  key: string;
  label: string;
}

export default function ActiveFilterChips({
  filters,
  citiesList,
  categoriesList,
  districts,
  onRemove,
  onClearAll,
}: {
  filters: Record<string, string>;
  citiesList: City[];
  categoriesList: Category[];
  districts: District[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}) {
  const { t, i18n } = useTranslation();

  const chips: Chip[] = [];

  FILTER_KEYS.forEach((key) => {
    const raw = filters[key];
    if (!raw) return;

    let label = raw;

    if (key === 'city_id') {
      const city = citiesList.find((c) => String(c.id) === raw);
      label = city
        ? i18n.language === 'tj' && city.name_tj
          ? city.name_tj
          : city.name
        : `${t('search.city')}: ${raw}`;
    } else if (key === 'district_id') {
      const district = districts.find((d) => String(d.id) === raw);
      label = district ? district.name : `${t('search.district')}: ${raw}`;
    } else if (key === 'category_id') {
      const category = categoriesList.find((c) => String(c.id) === raw);
      label = category ? localizeCategoryName(category, i18n.language) : `${t('search.category')}: ${raw}`;
    } else if (key === 'subcategory_id') {
      const parent = categoriesList.find((c) => String(c.id) === (filters.category_id || ''));
      const sub = parent?.subcategories.find((s) => String(s.id) === raw);
      label = sub ? localizeCategoryName(sub, i18n.language) : `${t('search.subcategory')}: ${raw}`;
    } else if (key === 'price_min') {
      label = `${t('search.priceFrom')} ${formatAmount(Number(raw), i18n.language)}`;
    } else if (key === 'price_max') {
      label = `${t('search.priceTo')} ${formatAmount(Number(raw), i18n.language)}`;
    } else if (key === 'price_unit') {
      const unit = PRICE_UNITS.find((u) => u.value === raw);
      label = unit ? t(unit.labelKey) : raw;
    } else if (key === 'start_date') {
      label = `${t('search.dateFrom')} ${formatDate(raw)}`;
    } else if (key === 'end_date') {
      label = `${t('search.dateTo')} ${formatDate(raw)}`;
    } else if (key === 'property_type') {
      const type = PROPERTY_TYPES.find((p) => p.value === raw);
      label = type ? t(type.labelKey) : raw;
    } else if (key === 'rooms_min') {
      label = `${raw}+ ${t('search.rooms')}`;
    } else if (key === 'bathrooms_min') {
      label = `${raw}+ ${t('search.bathrooms')}`;
    } else if (key === 'min_rating') {
      label = `★ ${raw}+`;
    } else if (key in BOOL_LABEL_KEYS) {
      if (raw !== 'true') return;
      label = t(BOOL_LABEL_KEYS[key]);
    }

    chips.push({ key, label });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
        {t('search.activeFilters')}
      </span>

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full border border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.08)] text-xs font-semibold text-[var(--accent)]"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            aria-label={`${t('search.removeFilter')}: ${chip.label}`}
            className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-[var(--accent)] hover:text-white transition"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] hover:border-[rgb(var(--accent-rgb)/0.45)] transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('search.clearAll')}
        </button>
      )}
    </div>
  );
}
