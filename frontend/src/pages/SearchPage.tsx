import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  MapPin,
  Star,
  RotateCcw,
} from 'lucide-react';
import {
  listings,
  categories,
  cities,
  type ListingListItem,
  type Category,
  type City,
  type District,
} from '../api/index';
import ListingGrid from '../components/listings/ListingGrid';
import CustomSelect from '../components/ui/CustomSelect';

const SORT_OPTIONS = [
  { value: 'relevance', labelKey: 'search.sortRelevance' },
  { value: 'created_at', labelKey: 'search.sortNewest' },
  { value: 'price_asc', labelKey: 'search.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'search.sortPriceDesc' },
  { value: 'rating', labelKey: 'search.sortRating' },
];

const PRICE_UNITS = [
  { value: '', labelKey: 'search.allUnits' },
  { value: 'per_hour', labelKey: 'search.perHour' },
  { value: 'per_day', labelKey: 'search.perDay' },
  { value: 'per_week', labelKey: 'search.perWeek' },
  { value: 'per_month', labelKey: 'search.perMonth' },
];

const RATING_OPTIONS = [
  { value: '', label: 'Любой' },
  { value: '4', label: '4+' },
  { value: '3', label: '3+' },
  { value: '2', label: '2+' },
];

const ITEMS_PER_PAGE = 12;

function FilterSidebar({
  citiesList,
  categoriesList,
  districts,
  filters,
  onFilterChange,
  onReset,
  loadingDistricts,
}: {
  citiesList: City[];
  categoriesList: Category[];
  districts: District[];
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
  loadingDistricts: boolean;
}) {
  const { t } = useTranslation();

  const cityOptions = [
    { value: '', label: t('search.allCities') },
    ...citiesList.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const districtOptions = [
    { value: '', label: t('search.allDistricts') },
    ...districts.map((d) => ({ value: String(d.id), label: d.name })),
  ];

  const categoryOptions = [
    { value: '', label: t('search.allCategories') },
    ...categoriesList.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('search.city')}
        </label>
        <CustomSelect
          options={cityOptions}
          value={filters.city_id || ''}
          onChange={(val) => {
            onFilterChange('city_id', val);
            onFilterChange('district_id', '');
          }}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('search.district')}
        </label>
        <CustomSelect
          options={districtOptions}
          value={filters.district_id || ''}
          onChange={(val) => onFilterChange('district_id', val)}
          disabled={!filters.city_id || loadingDistricts}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('search.price')}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={t('search.priceFrom')}
            value={filters.price_min || ''}
            onChange={(e) => onFilterChange('price_min', e.target.value)}
            className="w-1/2 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]/50 outline-none"
          />
          <input
            type="number"
            placeholder={t('search.priceTo')}
            value={filters.price_max || ''}
            onChange={(e) => onFilterChange('price_max', e.target.value)}
            className="w-1/2 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]/50 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('search.priceUnit')}
        </label>
        <select
          value={filters.price_unit || ''}
          onChange={(e) => onFilterChange('price_unit', e.target.value)}
          className="w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]/50 outline-none"
        >
          {PRICE_UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {t(u.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('search.category')}
        </label>
        <CustomSelect
          options={categoryOptions}
          value={filters.category_id || ''}
          onChange={(val) => onFilterChange('category_id', val)}
        />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.is_verified === 'true'}
            onChange={(e) => onFilterChange('is_verified', e.target.checked ? 'true' : '')}
            className="w-4 h-4 text-[#FF6B35] border-gray-300 rounded focus:ring-[#FF6B35]"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('search.verifiedOnly')}</span>
        </label>
      </div>

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
      >
        <RotateCcw className="w-4 h-4" />
        {t('search.resetFilters')}
      </button>
    </div>
  );
}

export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filters = useMemo(() => {
    const obj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }, [searchParams]);

  const currentPage = parseInt(filters.page || '1', 10);
  const currentSort = filters.sort_by || 'relevance';

  const onFilterChange = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const onReset = () => {
    const next = new URLSearchParams();
    if (searchParams.get('q')) next.set('q', searchParams.get('q')!);
    setSearchParams(next, { replace: true });
  };

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => cities.getAll(),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.getAll(),
  });

  const selectedCityId = filters.city_id ? Number(filters.city_id) : null;
  const { data: districtsData, isLoading: loadingDistricts } = useQuery({
    queryKey: ['districts', selectedCityId],
    queryFn: () => cities.getDistricts(selectedCityId!),
    enabled: !!selectedCityId,
  });

  const apiParams = useMemo(() => {
    const p: Record<string, unknown> = {
      page: currentPage,
      page_size: ITEMS_PER_PAGE,
    };
    if (filters.q) p.q = filters.q;
    if (filters.city_id) p.city_id = filters.city_id;
    if (filters.district_id) p.district_id = filters.district_id;
    if (filters.category_id) p.category_id = filters.category_id;
    if (filters.price_min) p.price_min = filters.price_min;
    if (filters.price_max) p.price_max = filters.price_max;
    if (filters.price_unit) p.price_unit = filters.price_unit;
    if (filters.is_verified) p.is_verified = filters.is_verified === 'true';
    if (currentSort !== 'relevance') p.sort_by = currentSort;
    return p;
  }, [filters, currentPage, currentSort]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', apiParams],
    queryFn: () => listings.search(apiParams),
  });

  const listingsList: ListingListItem[] = data?.items || [];
  const totalItems: number = data?.total || 0;
  const totalPages: number = data?.pages || 1;

  const [view, setView] = useState<'grid' | 'list'>('grid');

  const paginationRange = useMemo(() => {
    const range: (number | string)[] = [];
    const delta = 2;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push('...');
    if (totalPages > 1) range.push(totalPages);

    return range;
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 dark:bg-[#0a0a1a] min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] dark:text-white">
            {isLoading ? t('common.loading') : t('search.resultsFound', { count: totalItems })}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={currentSort}
              onChange={(e) => onFilterChange('sort_by', e.target.value)}
              className="appearance-none border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 pr-8 text-sm bg-white dark:bg-[#1A1A2E] text-gray-700 dark:text-white focus:ring-2 focus:ring-[#FF6B35]/50 outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`p-2 transition ${
                view === 'grid' ? 'bg-[#FF6B35] text-white' : 'bg-white dark:bg-[#1A1A2E] text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 transition ${
                view === 'list' ? 'bg-[#FF6B35] text-white' : 'bg-white dark:bg-[#1A1A2E] text-gray-500 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t('search.filters')}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden lg:block w-[280px] flex-shrink-0">
          <div className="bg-white dark:bg-[#1A1A2E] rounded-xl border border-gray-100 dark:border-white/10 p-5 sticky top-24">
            <h3 className="font-bold text-[#1A1A2E] dark:text-white mb-4">{t('search.filters')}</h3>
            <FilterSidebar
              citiesList={citiesData || []}
              categoriesList={categoriesData?.items || []}
              districts={districtsData || []}
              filters={filters}
              onFilterChange={onFilterChange}
              onReset={onReset}
              loadingDistricts={loadingDistricts}
            />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {view === 'list' ? (
            <div className="flex flex-col gap-4">
              {listingsList.map((listing) => (
                <div key={listing.id} className="w-full">
                  <a href={`/listing/${listing.id}`} className="block">
                    <div className="bg-white dark:bg-[#1A1A2E] rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden flex hover:shadow-lg transition-all">
                      <div className="w-56 flex-shrink-0 relative bg-gray-100">
                        {listing.primary_image ? (
                          <img
                            src={listing.primary_image}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <span className="text-gray-300">{t('search.noPhoto')}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-4">
                        <h3 className="font-bold text-[#1A1A2E] dark:text-white hover:text-[#FF6B35] transition-colors">
                          {listing.title}
                        </h3>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-lg font-extrabold text-[#FF6B35]">
                            {listing.price.toLocaleString('ru-RU')}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">сом</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {listing.city_name}
                          </span>
                          {listing.average_rating > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {listing.average_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <ListingGrid listings={listingsList} loading={isLoading} />
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-8">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-600 dark:text-white dark:bg-[#1A1A2E] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('search.back')}
              </button>

              {paginationRange.map((item, idx) =>
                typeof item === 'string' ? (
                  <span key={`dots-${idx}`} className="px-2 text-gray-400 text-sm">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => goToPage(item)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                      item === currentPage
                        ? 'bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/30'
                        : 'border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white dark:bg-[#1A1A2E] hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-600 dark:text-white dark:bg-[#1A1A2E] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {t('search.forward')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>

      {mobileFiltersOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white dark:bg-[#1A1A2E] z-50 lg:hidden overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1A1A2E] border-b border-gray-100 dark:border-white/10 p-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-[#1A1A2E] dark:text-white">{t('search.filters')}</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <FilterSidebar
                citiesList={citiesData || []}
                categoriesList={categoriesData?.items || []}
                districts={districtsData || []}
                filters={filters}
                onFilterChange={onFilterChange}
                onReset={onReset}
                loadingDistricts={loadingDistricts}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
