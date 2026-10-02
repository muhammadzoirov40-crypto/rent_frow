import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, RotateCcw } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import { type Category, type City, type District } from '../../api/index';
import { localizeCategoryName } from '../../utils/categoryName';
import { PRICE_PRESETS } from '../../utils/searchPresets';

export const PRICE_UNITS = [
  { value: '', labelKey: 'search.allUnits' },
  { value: 'per_hour', labelKey: 'search.perHour' },
  { value: 'per_day', labelKey: 'search.perDay' },
  { value: 'per_week', labelKey: 'search.perWeek' },
  { value: 'per_month', labelKey: 'search.perMonth' },
];

/** Mirrors `PropertyType` in `app/core/enums.py`. */
export const PROPERTY_TYPES = [
  { value: 'apartment', labelKey: 'search.ptApartment' },
  { value: 'house', labelKey: 'search.ptHouse' },
  { value: 'office', labelKey: 'search.ptOffice' },
  { value: 'room', labelKey: 'search.ptRoom' },
  { value: 'commercial', labelKey: 'search.ptCommercial' },
  { value: 'other', labelKey: 'search.ptOther' },
];

const ROOMS_OPTIONS = ['1', '2', '3', '4', '5'];
const BATHS_OPTIONS = ['1', '2', '3'];

const labelCls =
  'block text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500 mb-2';
const inputCls =
  'w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.4)] focus:border-[rgb(var(--accent-rgb)/0.5)] transition';

function pillCls(active: boolean) {
  return `px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
    active
      ? 'border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.1)] text-[var(--accent)]'
      : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-[rgb(var(--accent-rgb)/0.45)] hover:text-[var(--accent)]'
  }`;
}

function isoDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function FilterGroup({
  title,
  count = 0,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pb-4 mb-4 border-b border-gray-100 dark:border-white/[0.07] last:border-0 last:mb-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 group"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500 group-hover:text-[var(--accent)] transition-colors">
          {title}
        </span>
        <span className="flex items-center gap-1.5">
          {count > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-[var(--accent)] text-white text-[10px] font-bold leading-none">
              {count}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function ToggleRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-white/[0.07] px-3.5 py-3 cursor-pointer select-none hover:border-[rgb(var(--accent-rgb)/0.4)] hover:bg-[rgb(var(--accent-rgb)/0.05)] transition"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="w-[18px] h-[18px] shrink-0 rounded border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)] peer-focus-visible:ring-2 peer-focus-visible:ring-[rgb(var(--accent-rgb)/0.4)] transition" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

export default function FilterSidebar({
  citiesList,
  categoriesList,
  districts,
  filters,
  onFilterChange,
  onFilterPatch,
  onReset,
  loadingDistricts,
}: {
  citiesList: City[];
  categoriesList: Category[];
  districts: District[];
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onFilterPatch: (patch: Record<string, string>) => void;
  onReset: () => void;
  loadingDistricts: boolean;
}) {
  const { t, i18n } = useTranslation();

  const cityOptions = [
    { value: '', label: t('search.allCities') },
    ...citiesList.map((c) => ({ value: String(c.id), label: i18n.language === 'tj' && c.name_tj ? c.name_tj : c.name })),
  ];

  const districtOptions = [
    { value: '', label: t('search.allDistricts') },
    ...districts.map((d) => ({ value: String(d.id), label: d.name })),
  ];

  const categoryOptions = [
    { value: '', label: t('search.allCategories') },
    ...categoriesList.map((c) => ({ value: String(c.id), label: localizeCategoryName(c, i18n.language) })),
  ];

  const activeCategory = categoriesList.find((c) => String(c.id) === (filters.category_id || ''));
  const subcategoryOptions = [
    { value: '', label: t('search.allSubcategories') },
    ...(activeCategory?.subcategories || []).map((s) => ({
      value: String(s.id),
      label: localizeCategoryName(s, i18n.language),
    })),
  ];

  const countOf = (keys: string[]) => keys.filter((k) => !!filters[k]).length;

  const setBool = (key: string) => (checked: boolean) =>
    onFilterChange(key, checked ? 'true' : '');

  /* ---- quick price presets ---- */
  const activePricePreset = PRICE_PRESETS.find(
    (p) => (p.min || '') === (filters.price_min || '') && (p.max || '') === (filters.price_max || ''),
  );

  /* ---- quick rental-period presets (relative to today) ---- */
  const today = new Date();
  const toSaturday = (6 - today.getDay() + 7) % 7;
  const saturday = addDays(today, toSaturday);
  const datePresets = [
    { start: isoDate(today), end: isoDate(today), labelKey: 'search.dToday' },
    { start: isoDate(saturday), end: isoDate(addDays(saturday, 1)), labelKey: 'search.dWeekend' },
    { start: isoDate(today), end: isoDate(addDays(today, 6)), labelKey: 'search.dWeek' },
    { start: isoDate(today), end: isoDate(addDays(today, 29)), labelKey: 'search.dMonth' },
  ];
  const activeDatePreset = datePresets.find(
    (p) => p.start === (filters.start_date || '') && p.end === (filters.end_date || ''),
  );

  const toggleDatePreset = (preset: { start: string; end: string }) => {
    if (activeDatePreset === preset) onFilterPatch({ start_date: '', end_date: '' });
    else onFilterPatch({ start_date: preset.start, end_date: preset.end });
  };

  return (
    <div>
      <FilterGroup title={t('search.location')} count={countOf(['city_id', 'district_id'])}>
        <CustomSelect
          options={cityOptions}
          value={filters.city_id || ''}
          onChange={(val) => onFilterPatch({ city_id: val, district_id: '' })}
        />
        <div className="mt-2">
          <CustomSelect
            options={districtOptions}
            value={filters.district_id || ''}
            onChange={(val) => onFilterChange('district_id', val)}
            disabled={!filters.city_id || loadingDistricts}
          />
        </div>
      </FilterGroup>

      <FilterGroup title={t('search.price')} count={countOf(['price_min', 'price_max', 'price_unit'])}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t('search.priceFrom')}
            value={filters.price_min || ''}
            onChange={(e) => onFilterChange('price_min', e.target.value)}
            className={inputCls}
          />
          <span className="text-gray-300 dark:text-gray-600">&mdash;</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t('search.priceTo')}
            value={filters.price_max || ''}
            onChange={(e) => onFilterChange('price_max', e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((preset) => {
            const active = activePricePreset === preset;
            return (
              <button
                key={preset.labelKey}
                type="button"
                onClick={() =>
                  active
                    ? onFilterPatch({ price_min: '', price_max: '' })
                    : onFilterPatch({ price_min: preset.min, price_max: preset.max })
                }
                className={pillCls(active)}
              >
                {t(preset.labelKey)}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <CustomSelect
            options={PRICE_UNITS.map((u) => ({ value: u.value, label: t(u.labelKey) }))}
            value={filters.price_unit || ''}
            onChange={(val) => onFilterChange('price_unit', val)}
          />
        </div>
      </FilterGroup>

      <FilterGroup title={t('search.category')} count={countOf(['category_id', 'subcategory_id'])}>
        <CustomSelect
          options={categoryOptions}
          value={filters.category_id || ''}
          onChange={(val) => onFilterPatch({ category_id: val, subcategory_id: '' })}
        />
        {activeCategory && activeCategory.subcategories.length > 0 && (
          <div className="mt-2">
            <CustomSelect
              options={subcategoryOptions}
              value={filters.subcategory_id || ''}
              onChange={(val) => onFilterChange('subcategory_id', val)}
            />
          </div>
        )}
      </FilterGroup>

      <FilterGroup title={t('search.rentalPeriod')} count={countOf(['start_date', 'end_date'])}>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={(e) => onFilterChange('start_date', e.target.value)}
            aria-label={t('search.dateFrom')}
            className={inputCls}
          />
          <input
            type="date"
            value={filters.end_date || ''}
            min={filters.start_date || undefined}
            onChange={(e) => onFilterChange('end_date', e.target.value)}
            aria-label={t('search.dateTo')}
            className={inputCls}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {datePresets.map((preset) => (
            <button
              key={preset.labelKey}
              type="button"
              onClick={() => toggleDatePreset(preset)}
              className={pillCls(activeDatePreset === preset)}
            >
              {t(preset.labelKey)}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        title={t('search.propertyDetails')}
        count={countOf(['property_type', 'rooms_min', 'bathrooms_min'])}
        defaultOpen={false}
      >
        <label className={labelCls}>{t('search.propertyType')}</label>
        <CustomSelect
          options={[
            { value: '', label: t('search.anyType') },
            ...PROPERTY_TYPES.map((p) => ({ value: p.value, label: t(p.labelKey) })),
          ]}
          value={filters.property_type || ''}
          onChange={(val) => onFilterChange('property_type', val)}
        />

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <label className={labelCls}>{t('search.rooms')}</label>
            <CustomSelect
              options={[
                { value: '', label: t('search.anyNumber') },
                ...ROOMS_OPTIONS.map((n) => ({ value: n, label: `${n}+` })),
              ]}
              value={filters.rooms_min || ''}
              onChange={(val) => onFilterChange('rooms_min', val)}
            />
          </div>
          <div>
            <label className={labelCls}>{t('search.bathrooms')}</label>
            <CustomSelect
              options={[
                { value: '', label: t('search.anyNumber') },
                ...BATHS_OPTIONS.map((n) => ({ value: n, label: `${n}+` })),
              ]}
              value={filters.bathrooms_min || ''}
              onChange={(val) => onFilterChange('bathrooms_min', val)}
            />
          </div>
        </div>
      </FilterGroup>

      <FilterGroup
        title={t('search.amenities')}
        count={countOf(['furnished', 'parking', 'wifi_included'])}
        defaultOpen={false}
      >
        <div className="flex flex-col gap-2">
          <ToggleRow
            id="filter-furnished"
            checked={filters.furnished === 'true'}
            onChange={setBool('furnished')}
            label={t('search.furnished')}
          />
          <ToggleRow
            id="filter-parking"
            checked={filters.parking === 'true'}
            onChange={setBool('parking')}
            label={t('search.parking')}
          />
          <ToggleRow
            id="filter-wifi"
            checked={filters.wifi_included === 'true'}
            onChange={setBool('wifi_included')}
            label={t('search.wifi')}
          />
        </div>
      </FilterGroup>

      <FilterGroup title={t('search.ratingLabel')} count={countOf(['min_rating', 'is_verified'])}>
        <CustomSelect
          options={[
            { value: '', label: t('search.ratingAny') },
            { value: '4', label: '4+' },
            { value: '3', label: '3+' },
            { value: '2', label: '2+' },
          ]}
          value={filters.min_rating || ''}
          onChange={(val) => onFilterChange('min_rating', val)}
        />
        <div className="mt-2">
          <ToggleRow
            id="filter-verified"
            checked={filters.is_verified === 'true'}
            onChange={setBool('is_verified')}
            label={t('search.verifiedOnly')}
          />
        </div>
      </FilterGroup>

      <FilterGroup title={t('search.availability')} count={countOf(['available'])}>
        <ToggleRow
          id="filter-available"
          checked={filters.available === 'true'}
          onChange={setBool('available')}
          label={t('search.availableOnly')}
        />
      </FilterGroup>

      <button
        onClick={onReset}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.06)] text-sm font-bold text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.15)] hover:border-[rgb(var(--accent-rgb)/0.5)] transition"
      >
        <RotateCcw className="w-4 h-4" />
        {t('search.resetFilters')}
      </button>
    </div>
  );
}
