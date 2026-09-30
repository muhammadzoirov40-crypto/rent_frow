import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  MessageSquare,
  Car,
  Wrench,
  Home,
  Camera,
  Music,
  TreePine,
  HardHat,
  Laptop,
  Dumbbell,
  Baby,
  Truck,
  Utensils,
  Ship,
  ShieldCheck,
  Zap,
  Headset,
  CalendarCheck,
  PlusCircle,
  Users,
  Star,
  LayoutGrid,
} from 'lucide-react';
import { listings, categories, cities, stats, type Category, type City, type ListingListItem } from '../api/index';
import ListingGrid from '../components/listings/ListingGrid';
import SearchBar from '../components/search/SearchBar';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  'Транспорт': Car,
  'Инструменты': Wrench,
  'Недвижимость': Home,
  'Фото и видео': Camera,
  'Аудио и видео': Music,
  'Сад и огород': TreePine,
  'Строительство': HardHat,
  'Электроника': Laptop,
  'Спорт': Dumbbell,
  'Детские товары': Baby,
  'Спецтехника': Truck,
  'Кафе и кухня': Utensils,
  'Водный транспорт': Ship,
};

function getCategoryIcon(name: string): React.ElementType {
  for (const [key, Icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return Icon;
  }
  return LayoutGrid;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.getAll(),
  });

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => cities.getAll(),
  });

  const { data: newListingsData, isLoading: loadingNew } = useQuery({
    queryKey: ['listings', 'new'],
    queryFn: () =>
      listings.search({
        sort_by: 'created_at',
        page: 1,
        page_size: 6,
      }),
  });

  const { data: popularListingsData, isLoading: loadingPopular } = useQuery({
    queryKey: ['listings', 'popular'],
    queryFn: () =>
      listings.search({
        sort_by: 'rating',
        page: 1,
        page_size: 6,
      }),
  });

  const { data: categoryCounts = {} } = useQuery({
    queryKey: ['categoryCounts'],
    queryFn: async () => {
      const all = await categories.getAll();
      const entries = await Promise.all(
        all.items.map(async (cat) => {
          try {
            const res = await listings.search({ category_id: cat.id, page: 1, page_size: 1 });
            return [cat.id, res.total] as const;
          } catch {
            return [cat.id, 0] as const;
          }
        }),
      );
      return Object.fromEntries(entries) as Record<number, number>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: siteStats } = useQuery({
    queryKey: ['publicStats'],
    queryFn: stats.getPublic,
    staleTime: 5 * 60 * 1000,
  });

  const categoryList: Category[] = categoriesData?.items || [];
  const cityList: City[] = citiesData || [];
  const newListings: ListingListItem[] = newListingsData?.items || [];
  const popularListings: ListingListItem[] = popularListingsData?.items || [];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a1a]">
      <section className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f1218]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 md:pt-16 md:pb-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-bold uppercase tracking-wider mb-5">
              <Star className="w-3.5 h-3.5" />
              {t('home.heroKicker')}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#1A1A2E] dark:text-white leading-[1.08]">
              <span className="block">{t('home.heroTitle')}</span>
              <span className="block text-[#FF6B35]">{t('home.heroLine2')}</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
              {t('home.heroSubtitle')}
            </p>
          </div>

          <div className="mt-8 max-w-5xl">
            <SearchBar />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              onClick={() => navigate('/search')}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#FF6B35] hover:text-[#e55a2b] transition-colors"
            >
              {t('home.find')}
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how"
              className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] transition-colors"
            >
              {t('home.howItWorks')}
            </a>
            <a
              href="#categories"
              className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] transition-colors"
            >
              {t('home.popularCategories')}
            </a>
          </div>
        </div>
      </section>

      {loadingCategories ? (
        <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-7 w-56 bg-gray-100 dark:bg-white/10 rounded-lg mb-6 animate-skeleton" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-white/5 animate-skeleton" />
            ))}
          </div>
        </section>
      ) : (
        categoryList.length > 0 && (
          <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-end justify-between mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A2E] dark:text-white">
                  {t('home.popularCategories')}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('home.categoriesHint')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categoryList.map((cat) => {
                const Icon = getCategoryIcon(cat.name);
                const count = categoryCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    onClick={() => navigate(`/search?category_id=${cat.id}`)}
                    className="group text-center bg-white dark:bg-[#12141a] border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:border-[#FF6B35]/50 hover:shadow-[0_10px_30px_-18px_rgba(255,107,53,0.55)] transition"
                  >
                    <div className="w-11 h-11 mx-auto rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center mb-3 group-hover:bg-[#FF6B35] group-hover:border-[#FF6B35] transition">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt="" className="w-6 h-6 object-contain" loading="lazy" />
                      ) : (
                        <Icon className="w-5 h-5 text-[#FF6B35] group-hover:text-white transition" />
                      )}
                    </div>
                    <h3 className="font-semibold text-sm text-[#1A1A2E] dark:text-white group-hover:text-[#FF6B35] transition-colors leading-snug">
                      {cat.name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {t('home.listingsCount', { count: count ?? 0 })}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A2E] dark:text-white">
              {t('home.popularNearYou')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('home.popularNearYouHint')}</p>
          </div>
          <button
            onClick={() => navigate('/search?sort_by=rating')}
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[#FF6B35] hover:text-[#E55A2B] transition-colors"
          >
            {t('common.viewAll')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <ListingGrid listings={popularListings} loading={loadingPopular} />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A2E] dark:text-white">
              {t('home.recentlyAdded')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('home.recentlyAddedHint')}</p>
          </div>
          <button
            onClick={() => navigate('/search?sort_by=created_at')}
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[#FF6B35] hover:text-[#E55A2B] transition-colors"
          >
            {t('common.viewAll')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <ListingGrid listings={newListings} loading={loadingNew} />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="rounded-2xl bg-[#1A1A2E] dark:bg-[#12141a] border border-gray-800 dark:border-white/10 p-6 sm:p-8 lg:p-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">{t('home.promoTitle')}</h3>
            <p className="mt-2 text-sm sm:text-base text-gray-300 max-w-2xl">{t('home.promoText')}</p>
          </div>
          <button
            onClick={() => navigate('/create-listing')}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold rounded-xl transition shadow-lg shadow-[#FF6B35]/30"
          >
            <PlusCircle className="w-5 h-5" />
            {t('home.promoBtn')}
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A2E] dark:text-white mb-6">
          {t('home.whyTitle')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mb-8 text-sm sm:text-base">{t('home.whySubtitle')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, title: t('home.why1Title'), desc: t('home.why1Desc') },
            { icon: Zap, title: t('home.why2Title'), desc: t('home.why2Desc') },
            { icon: CalendarCheck, title: t('home.why3Title'), desc: t('home.why3Desc') },
            { icon: Headset, title: t('home.why4Title'), desc: t('home.why4Desc') },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-white dark:bg-[#12141a] border border-gray-200 dark:border-white/10 p-5 hover:border-[#FF6B35]/40 transition"
            >
              <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center mb-3">
                <item.icon className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <h3 className="font-bold text-sm text-[#1A1A2E] dark:text-white mb-1.5">{item.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[
            { value: siteStats ? String(siteStats.listings) : '—', label: t('home.statsListings'), icon: Star },
            { value: siteStats ? String(siteStats.users) : '—', label: t('home.statsUsers'), icon: Users },
            { value: siteStats ? String(siteStats.cities) : '—', label: t('home.statsCities'), icon: MapPin },
            { value: siteStats ? siteStats.avg_rating.toFixed(1) : '—', label: t('home.statsRating'), icon: ShieldCheck },
          ].map((stat, idx) => (
            <div key={idx} className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 text-center">
              <div className="text-2xl font-extrabold text-[#FF6B35]">{stat.value}</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="bg-gray-50 dark:bg-[#0f1218] border-y border-gray-200 dark:border-white/10 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A2E] dark:text-white mb-8">
            {t('home.howItWorks')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Search, title: t('home.step1Title'), desc: t('home.step1Desc') },
              { icon: MessageSquare, title: t('home.step2Title'), desc: t('home.step2Desc') },
              { icon: Calendar, title: t('home.step3Title'), desc: t('home.step3Desc') },
            ].map((step, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-white dark:bg-[#12141a] border border-gray-200 dark:border-white/10 p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-[#FF6B35]" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B35]">
                    {t('home.step')} {idx + 1}
                  </span>
                </div>
                <h3 className="font-bold text-[#1A1A2E] dark:text-white mb-1.5">{step.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl bg-white dark:bg-[#12141a] border border-gray-200 dark:border-white/10 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 min-w-0 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{t('home.ctaTitle')}</h3>
            <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400">{t('home.ctaText')}</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 min-w-0">
            <button
              onClick={() => navigate('/create-listing')}
              className="px-6 py-3 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold rounded-xl transition shadow-lg shadow-[#FF6B35]/30"
            >
              {t('home.ctaPrimary')}
            </button>
            <button
              onClick={() => navigate('/search')}
              className="px-6 py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-[#1A1A2E] dark:text-white font-bold rounded-xl border border-gray-200 dark:border-white/15 transition"
            >
              {t('home.ctaSecondary')}
            </button>
          </div>
        </div>
      </section>

      {cityList.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A2E] dark:text-white mb-5">
            {t('home.popularCities')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {cityList.slice(0, 8).map((city) => (
              <button
                key={city.id}
                onClick={() => navigate(`/search?city_id=${city.id}`)}
                className="bg-white dark:bg-[#12141a] rounded-xl border border-gray-200 dark:border-white/10 p-4 text-left hover:border-[#FF6B35]/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#FF6B35]" />
                  </span>
                  <span className="font-semibold text-sm text-[#1A1A2E] dark:text-white group-hover:text-[#FF6B35] transition-colors">
                    {city.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
