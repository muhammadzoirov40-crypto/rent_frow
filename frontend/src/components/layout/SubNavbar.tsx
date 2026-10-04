import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  MapPin,
  SlidersHorizontal,
  Tag,
} from 'lucide-react';
import { categories, cities, type Category, type City } from '../../api/index';
import { localizeCategoryName } from '../../utils/categoryName';
import { iconFor } from '../../utils/categoryIcons';
import { formatAmount } from '../../utils/format';
import { PRICE_PRESETS } from '../../utils/searchPresets';

type PanelId = 'mega' | 'city' | 'price';

const panelCls =
  'absolute top-full mt-2 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-200/70 dark:border-white/10 z-50 overflow-hidden';

const dropdownBtnCls = (open: boolean) =>
  `h-8 md:h-9 px-2.5 inline-flex items-center gap-1.5 rounded-xl border text-[13px] font-bold whitespace-nowrap transition ${
    open
      ? 'border-[rgb(var(--accent-rgb)/0.5)] bg-[rgb(var(--accent-rgb)/0.1)] text-[var(--accent)]'
      : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-[var(--accent)] hover:border-[rgb(var(--accent-rgb)/0.4)]'
  }`;

const rowCls = (active: boolean) =>
  `w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition ${
    active
      ? 'bg-[rgb(var(--accent-rgb)/0.1)] text-[var(--accent)] font-semibold'
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
  }`;

/**
 * Secondary navigation rendered directly under the main header row.
 * Everything it links to already exists: categories/cities come from the API,
 * and every action is a `/search` URL param — no duplicate state.
 */
export default function SubNavbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [minInput, setMinInput] = useState('');
  const [maxInput, setMaxInput] = useState('');

  const barRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [scrollEdge, setScrollEdge] = useState({ left: false, right: false });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: citiesData = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: () => cities.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const categoryList: Category[] = categoriesData?.items || [];
  const cityList: City[] = citiesData;

  const activeCategoryId = searchParams.get('category_id') || '';
  const activeCityId = searchParams.get('city_id') || '';
  const priceMin = searchParams.get('price_min') || '';
  const priceMax = searchParams.get('price_max') || '';

  const hasFilters = Boolean(
    searchParams.get('q') ||
      activeCategoryId ||
      activeCityId ||
      priceMin ||
      priceMax ||
      searchParams.get('start_date') ||
      searchParams.get('end_date') ||
      searchParams.get('available') ||
      searchParams.get('is_verified'),
  );

  /* close on outside click / Escape */
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setPanel(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [panel]);

  /* close whenever the route/params change (i.e. after a selection) */
  useEffect(() => {
    setPanel(null);
  }, [location.pathname, location.search]);

  /* keep the price inputs in sync with the URL when the panel opens */
  useEffect(() => {
    if (panel === 'price') {
      setMinInput(priceMin);
      setMaxInput(priceMax);
    }
  }, [panel, priceMin, priceMax]);

  const updateEdge = () => {
    const el = chipsRef.current;
    if (!el) return;
    setScrollEdge({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  };

  useEffect(() => {
    updateEdge();
    window.addEventListener('resize', updateEdge);
    return () => window.removeEventListener('resize', updateEdge);
  }, [categoryList.length, i18n.language]);

  const scrollChips = (dir: -1 | 1) => {
    const el = chipsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.6, 160), behavior: 'smooth' });
  };

  /** Applies a patch to the current /search query, or navigates there. */
  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    next.delete('page');
    const qs = next.toString();
    if (location.pathname === '/search') setSearchParams(next, { replace: true });
    else navigate(qs ? `/search?${qs}` : '/search');
  };

  const toggle = (id: PanelId) => setPanel((prev) => (prev === id ? null : id));

  const activeCity = cityList.find((c) => String(c.id) === activeCityId);
  const cityLabel = activeCity
    ? i18n.language === 'tj' && activeCity.name_tj
      ? activeCity.name_tj
      : activeCity.name
    : t('search.city');

  const priceLabel = (() => {
    if (priceMin && priceMax) {
      return `${formatAmount(Number(priceMin), i18n.language)} – ${formatAmount(Number(priceMax), i18n.language)}`;
    }
    if (priceMin) return `${formatAmount(Number(priceMin), i18n.language)}+`;
    if (priceMax) return `≤ ${formatAmount(Number(priceMax), i18n.language)}`;
    return t('search.price');
  })();

  const chipCls = (active: boolean) =>
    `relative shrink-0 h-full flex items-center gap-1.5 px-3 text-[13px] font-bold whitespace-nowrap transition-colors ${
      active
        ? 'text-[var(--accent)]'
        : 'text-gray-600 dark:text-gray-400 hover:text-[var(--accent)]'
    }`;

  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    go({ price_min: minInput.trim(), price_max: maxInput.trim() });
  };

  return (
    <div
      ref={barRef}
      className="border-t border-gray-100 dark:border-white/[0.07] bg-gray-50/80 dark:bg-white/[0.02]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-11 md:h-12">
          {/* ── Все категории (mega menu) ───────────────────────── */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => toggle('mega')}
              aria-haspopup="true"
              aria-expanded={panel === 'mega'}
              className={`h-8 md:h-9 px-2.5 md:px-3 inline-flex items-center gap-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition ${
                panel === 'mega'
                  ? 'bg-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]'
                  : 'bg-[rgb(var(--accent-rgb)/0.1)] text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.18)]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('search.allCategories')}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                  panel === 'mega' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {panel === 'mega' && (
              <div className={`${panelCls} left-0 w-[min(92vw,44rem)] max-h-[70vh] overflow-y-auto p-3 sm:p-4`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {categoryList.length === 0 && (
                    <p className="col-span-full px-2 py-6 text-center text-sm text-gray-400">
                      {t('common.loading')}
                    </p>
                  )}
                  {categoryList.map((cat) => {
                    const Icon = iconFor(cat, i18n.language);
                    const active = String(cat.id) === activeCategoryId;
                    return (
                      <div
                        key={cat.id}
                        className={`rounded-xl border p-2.5 transition ${
                          active
                            ? 'border-[rgb(var(--accent-rgb)/0.45)] bg-[rgb(var(--accent-rgb)/0.06)]'
                            : 'border-gray-100 dark:border-white/[0.07] hover:border-[rgb(var(--accent-rgb)/0.35)]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => go({ category_id: String(cat.id), subcategory_id: '' })}
                          className="flex items-center gap-2 w-full text-left"
                        >
                          <span className="w-8 h-8 shrink-0 rounded-lg bg-[rgb(var(--accent-rgb)/0.1)] text-[var(--accent)] flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {localizeCategoryName(cat, i18n.language)}
                          </span>
                        </button>

                        {cat.subcategories.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {cat.subcategories.slice(0, 6).map((sub) => (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() =>
                                  go({
                                    category_id: String(cat.id),
                                    subcategory_id: String(sub.id),
                                  })
                                }
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.08)] transition"
                              >
                                {localizeCategoryName(sub, i18n.language)}
                              </button>
                            ))}
                            {cat.subcategories.length > 6 && (
                              <span className="px-2 py-1 text-[11px] font-bold text-[var(--accent)]">
                                +{cat.subcategories.length - 6}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {location.pathname !== '/' && (
            <span className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-white/10 mx-2 shrink-0" />
          )}

          {/* ── Category chips (scrollable) ─────────────────────── */}
          {/* On the homepage the same category names are already shown by the
              "Popular categories" section right below the hero, so rendering
              them here too just repeats every name. The wrapper stays (it is
              the flex spacer that pins the city/price/filters to the right),
              and the chips come back on every other route. */}
          <div className="relative flex-1 min-w-0 h-full">
            <div ref={chipsRef} onScroll={updateEdge} className="h-full overflow-x-auto no-scrollbar">
              <div className="flex items-stretch h-full min-w-max">
                {location.pathname !== '/' &&
                  categoryList.map((cat) => {
                  const Icon = iconFor(cat, i18n.language);
                  const active = String(cat.id) === activeCategoryId;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => go({ category_id: String(cat.id), subcategory_id: '' })}
                      className={chipCls(active)}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{localizeCategoryName(cat, i18n.language)}</span>
                      {active && (
                        <span className="absolute inset-x-1.5 bottom-0 h-[3px] rounded-t-full bg-[var(--accent)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {scrollEdge.left && (
              <button
                type="button"
                onClick={() => scrollChips(-1)}
                aria-label={t('search.scrollLeft')}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 items-center justify-center rounded-full bg-white dark:bg-[#1A1A2E] border border-gray-200 dark:border-white/10 text-gray-500 hover:text-[var(--accent)] shadow-sm transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {scrollEdge.right && (
              <button
                type="button"
                onClick={() => scrollChips(1)}
                aria-label={t('search.scrollRight')}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 items-center justify-center rounded-full bg-white dark:bg-[#1A1A2E] border border-gray-200 dark:border-white/10 text-gray-500 hover:text-[var(--accent)] shadow-sm transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ── City / Price (wide desktop only, to keep the bar uncrowded) ── */}
          <div className="hidden lg:flex items-center gap-2 shrink-0 ml-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => toggle('city')}
                aria-haspopup="true"
                aria-expanded={panel === 'city'}
                className={dropdownBtnCls(panel === 'city')}
              >
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="max-w-[7.5rem] truncate">{cityLabel}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    panel === 'city' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {panel === 'city' && (
                <div className={`${panelCls} right-0 w-60 max-h-80 overflow-y-auto py-1`}>
                  <button type="button" onClick={() => go({ city_id: '', district_id: '' })} className={rowCls(!activeCityId)}>
                    <span className="w-4 shrink-0">{!activeCityId && <Check className="w-4 h-4" />}</span>
                    <span className="truncate">{t('search.allCities')}</span>
                  </button>
                  {cityList.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => go({ city_id: String(city.id), district_id: '' })}
                      className={rowCls(String(city.id) === activeCityId)}
                    >
                      <span className="w-4 shrink-0">
                        {String(city.id) === activeCityId && <Check className="w-4 h-4" />}
                      </span>
                      <span className="truncate">
                        {i18n.language === 'tj' && city.name_tj ? city.name_tj : city.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => toggle('price')}
                aria-haspopup="true"
                aria-expanded={panel === 'price'}
                className={dropdownBtnCls(panel === 'price')}
              >
                <Tag className="w-4 h-4 shrink-0" />
                <span className="max-w-[7.5rem] truncate">{priceLabel}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    panel === 'price' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {panel === 'price' && (
                <div className={`${panelCls} right-0 w-64 p-3`}>
                  <button
                    type="button"
                    onClick={() => go({ price_min: '', price_max: '' })}
                    className={`mb-2 w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition ${
                      !priceMin && !priceMax
                        ? 'bg-[rgb(var(--accent-rgb)/0.1)] text-[var(--accent)]'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {t('search.anyPrice')}
                    {!priceMin && !priceMax && <Check className="w-4 h-4" />}
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    {PRICE_PRESETS.map((preset) => {
                      const active = preset.min === priceMin && preset.max === priceMax;
                      return (
                        <button
                          key={preset.labelKey}
                          type="button"
                          onClick={() => go({ price_min: preset.min, price_max: preset.max })}
                          className={`px-2 py-2 rounded-xl border text-xs font-bold transition ${
                            active
                              ? 'border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.1)] text-[var(--accent)]'
                              : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-[rgb(var(--accent-rgb)/0.45)] hover:text-[var(--accent)]'
                          }`}
                        >
                          {t(preset.labelKey)}
                        </button>
                      );
                    })}
                  </div>

                  <form onSubmit={applyPrice} className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={minInput}
                      onChange={(e) => setMinInput(e.target.value)}
                      placeholder={t('search.priceFrom')}
                      aria-label={t('search.priceFrom')}
                      className="w-full min-w-0 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2.5 py-2 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.2)] focus:border-[var(--accent)] transition"
                    />
                    <span className="text-gray-300 dark:text-gray-600 text-xs">&mdash;</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={maxInput}
                      onChange={(e) => setMaxInput(e.target.value)}
                      placeholder={t('search.priceTo')}
                      aria-label={t('search.priceTo')}
                      className="w-full min-w-0 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2.5 py-2 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.2)] focus:border-[var(--accent)] transition"
                    />
                    <button
                      type="submit"
                      aria-label={t('common.confirm')}
                      className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition shadow-sm shadow-[rgb(var(--accent-rgb)/0.25)]"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* ── Filters (available from tablets up) ─────────────── */}
          <button
            type="button"
            onClick={() => go({})}
            className="hidden sm:inline-flex ml-2 shrink-0 h-8 md:h-9 px-3 items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[13px] font-bold text-gray-600 dark:text-gray-300 hover:text-[var(--accent)] hover:border-[rgb(var(--accent-rgb)/0.4)] transition whitespace-nowrap"
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            {t('search.filters')}
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
          </button>
        </div>
      </div>
    </div>
  );
}
