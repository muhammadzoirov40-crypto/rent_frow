import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Map as MapIcon,
  MapPin,
  Star,
  AlertTriangle,
  Package,
} from 'lucide-react';
import SearchBar from '../components/search/SearchBar';
import FilterSidebar from '../components/search/FilterSidebar';
import ActiveFilterChips from '../components/search/ActiveFilterChips';
import RecentSearches from '../components/search/RecentSearches';
import EmptyState from '../components/ui/EmptyState';
import { listings, categories, cities, type ListingListItem } from '../api/index';
import ListingGrid from '../components/listings/ListingGrid';
import CustomSelect from '../components/ui/CustomSelect';
import BackButton from '../components/ui/BackButton';
import { rememberSearch } from '../utils/recentSearches';

// Leaflet (~140 kB) is only needed once the user switches to the map view,
// so it must not sit in the entry bundle.
const MapView = lazy(() => import('../components/search/MapView'));

const SORT_OPTIONS = [
  { value: 'relevance', labelKey: 'search.sortRelevance' },
  { value: 'created_at', labelKey: 'search.sortNewest' },
  { value: 'price_asc', labelKey: 'search.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'search.sortPriceDesc' },
  { value: 'rating', labelKey: 'search.sortRating' },
];

const ITEMS_PER_PAGE = 12;

export default function SearchPage() {
  const { t, i18n } = useTranslation();
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

  const onFilterPatch = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
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
    if (filters.subcategory_id) p.subcategory_id = filters.subcategory_id;
    if (filters.price_min) p.price_min = filters.price_min;
    if (filters.price_max) p.price_max = filters.price_max;
    if (filters.price_unit) p.price_unit = filters.price_unit;
    if (filters.is_verified) p.is_verified = filters.is_verified === 'true';
    if (filters.min_rating) p.min_rating = filters.min_rating;
    if (filters.available) p.available = filters.available === 'true';
    if (filters.start_date) p.start_date = filters.start_date;
    if (filters.end_date) p.end_date = filters.end_date;
    if (filters.property_type) p.property_type = filters.property_type;
    if (filters.rooms_min) p.rooms_min = filters.rooms_min;
    if (filters.bathrooms_min) p.bathrooms_min = filters.bathrooms_min;
    if (filters.furnished) p.furnished = filters.furnished === 'true';
    if (filters.parking) p.parking = filters.parking === 'true';
    if (filters.wifi_included) p.wifi_included = filters.wifi_included === 'true';
    if (currentSort !== 'relevance') p.sort_by = currentSort;
    return p;
  }, [filters, currentPage, currentSort]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', apiParams],
    queryFn: () => listings.search(apiParams),
    retry: 1,
  });

  const listingsList: ListingListItem[] = data?.items || [];
  const totalItems: number = data?.total || 0;
  const totalPages: number = data?.pages || 1;

  const [view, setView] = useState<'grid' | 'list' | 'map'>('grid');

  const mapFocus = useMemo(() => {
    const city = (citiesData || []).find((c) => String(c.id) === (filters.city_id || ''));
    if (city && typeof city.latitude === 'number' && typeof city.longitude === 'number') {
      return { lat: city.latitude, lng: city.longitude };
    }
    return null;
  }, [citiesData, filters.city_id]);

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
      <BackButton className="mb-4" />
      <div className="mb-6">
        <SearchBar
          key={[
            filters.q || '',
            filters.city_id || '',
            filters.category_id || '',
            filters.start_date || '',
            filters.end_date || '',
            filters.price_min || '',
            filters.price_max || '',
          ].join('|')}
          compact
          initial={{
            q: filters.q || '',
            category_id: filters.category_id || '',
            city_id: filters.city_id || '',
            start_date: filters.start_date || '',
            end_date: filters.end_date || '',
            price_min: filters.price_min || '',
            price_max: filters.price_max || '',
          }}
          onSubmit={(values) => {
            const next = new URLSearchParams(searchParams);
            const apply = (key: string, value: string) => {
              if (value) next.set(key, value);
              else next.delete(key);
            };
            apply('q', values.q);
            apply('category_id', values.category_id);
            apply('city_id', values.city_id);
            if (values.city_id !== (filters.city_id || '')) next.delete('district_id');
            apply('start_date', values.start_date);
            apply('end_date', values.end_date);
            apply('price_min', values.price_min);
            apply('price_max', values.price_max);
            next.delete('page');
            setSearchParams(next, { replace: true });
            rememberSearch(values.q);
          }}
        />
        <RecentSearches
          visible={!filters.q}
          onSelect={(term) => {
            const next = new URLSearchParams(searchParams);
            next.set('q', term);
            next.delete('page');
            setSearchParams(next, { replace: true });
          }}
        />
      </div>

      <ActiveFilterChips
        filters={filters}
        citiesList={citiesData || []}
        categoriesList={categoriesData?.items || []}
        districts={districtsData || []}
        onRemove={(key) => onFilterChange(key, '')}
        onClearAll={onReset}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-white/[0.07]">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-[#1A1A2E] dark:text-white">
            {isLoading ? t('common.loading') : t('search.resultsFound', { count: totalItems })}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-44">
            <CustomSelect
              options={SORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
              value={currentSort}
              onChange={(val) => onFilterChange('sort_by', val)}
            />
          </div>

          <div className="flex items-center gap-1 border border-gray-200 dark:border-white/10 rounded-xl p-1 bg-white dark:bg-white/[0.03]">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition ${
                view === 'grid' ? 'bg-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition ${
                view === 'list' ? 'bg-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('map')}
              aria-label={t('search.mapView')}
              className={`p-2 rounded-lg transition ${
                view === 'map' ? 'bg-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <MapIcon className="w-4 h-4" />
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
          <div className="bg-white/70 dark:bg-[#1a1a2e]/70 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm sticky top-24">
            <h3 className="flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white mb-5">
              <SlidersHorizontal className="w-[18px] h-[18px] text-[var(--accent)]" />
              {t('search.filters')}
            </h3>
            <FilterSidebar
              citiesList={citiesData || []}
              categoriesList={categoriesData?.items || []}
              districts={districtsData || []}
              filters={filters}
              onFilterChange={onFilterChange}
              onFilterPatch={onFilterPatch}
              onReset={onReset}
              loadingDistricts={loadingDistricts}
            />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {isError ? (
            <EmptyState
              icon={AlertTriangle}
              title={t('search.errorTitle')}
              description={t('search.errorText')}
              actionLabel={t('common.refresh')}
              onAction={() => refetch()}
            />
          ) : view === 'list' ? (
            listingsList.length === 0 && !isLoading ? (
              <EmptyState
                icon={Package}
                title={t('search.emptyTitle')}
                description={t('search.emptyText')}
                actionLabel={t('common.reset')}
                onAction={onReset}
              />
            ) : (
            <div className="flex flex-col gap-4">
              {listingsList.map((listing) => (
                <div key={listing.id} className="w-full">
                  <Link to={`/listing/${listing.id}`} className="block">
                    <div className="bg-white/70 dark:bg-[#1a1a2e]/70 backdrop-blur-xl rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden flex hover:shadow-lg transition-all">
                      <div className="w-56 flex-shrink-0 relative bg-gray-100">
                        {listing.primary_image ? (
                          <img
                            src={listing.primary_image}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : null}
                        {!listing.primary_image && (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <span className="text-gray-300">{t('search.noPhoto')}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-4">
                        <h3 className="font-bold text-[#1A1A2E] dark:text-white hover:text-[var(--accent)] transition-colors">
                          {listing.title}
                        </h3>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-lg font-extrabold text-[var(--accent)]">
                            {listing.price.toLocaleString(i18n.language === 'en' ? 'en-US' : 'ru-RU')}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.somoni')}</span>
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
                  </Link>
                </div>
              ))}
            </div>
            )
          ) : view === 'map' ? (
            isLoading ? (
              <div
                className="w-full rounded-2xl border border-gray-200 dark:border-white/10 animate-skeleton bg-gray-100 dark:bg-white/5"
                style={{ height: '28rem' }}
              />
            ) : listingsList.length === 0 ? (
              <EmptyState
                icon={Package}
                title={t('search.emptyTitle')}
                description={t('search.emptyText')}
                actionLabel={t('common.reset')}
                onAction={onReset}
              />
            ) : (
              <Suspense
                fallback={
                  <div
                    className="w-full rounded-2xl border border-gray-200 dark:border-white/10 animate-skeleton bg-gray-100 dark:bg-white/5"
                    style={{ height: '28rem' }}
                  />
                }
              >
                <MapView items={listingsList} focus={mapFocus} />
              </Suspense>
            )
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
                        ? 'bg-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]'
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
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white/70 dark:bg-[#1a1a2e]/70 backdrop-blur-xl z-50 lg:hidden overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white/70 dark:bg-[#1a1a2e]/70 backdrop-blur-xl border-b border-gray-100 dark:border-white/10 p-4 flex items-center justify-between z-10">
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
                onFilterPatch={onFilterPatch}
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
