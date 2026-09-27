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
} from 'lucide-react';
import { listings, categories, cities, type Category, type City, type ListingListItem } from '../api/index';
import ListingGrid from '../components/listings/ListingGrid';

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
  return Wrench;
}

const CATEGORY_COLORS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-purple-500 to-purple-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-indigo-500 to-indigo-600',
  'from-pink-500 to-pink-600',
];

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [startDate, setStartDate] = useState('');

  const { data: categoriesData } = useQuery({
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCity) params.set('city_id', selectedCity);
    if (startDate) params.set('start_date', startDate);
    navigate(`/search?${params.toString()}`);
  };

  const categoryList: Category[] = categoriesData?.items || [];
  const cityList: City[] = citiesData || [];
  const newListings: ListingListItem[] = newListingsData?.items || [];
  const popularListings: ListingListItem[] = popularListingsData?.items || [];

  return (
    <div className="min-h-screen dark:bg-[#0a0a1a]">
      <section className="relative bg-white dark:bg-gradient-to-br dark:from-[#1A1A2E] dark:via-[#16213E] dark:to-[#0F3460] border-b border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="absolute inset-0 opacity-10 dark:opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-[#FF6B35] rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 md:pt-20 md:pb-20">
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-xs sm:text-sm font-bold uppercase tracking-wider mb-4">
              {t('home.heroKicker')}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1A1A2E] dark:text-white leading-tight">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/search')}
                className="px-7 py-3 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-bold rounded-xl shadow-lg shadow-[#FF6B35]/30 transition active:scale-[0.98]"
              >
                {t('home.find')}
              </button>
              <a
                href="#how"
                className="px-7 py-3 border-2 border-gray-200 dark:border-white/15 text-[#1A1A2E] dark:text-white hover:border-[#FF6B35] hover:text-[#FF6B35] font-bold rounded-xl transition"
              >
                {t('home.howItWorks')}
              </a>
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="max-w-4xl mx-auto bg-white dark:bg-[#1A1A2E] rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row gap-3"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]/50 transition"
              />
            </div>

            <div className="relative md:w-48">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]/50 appearance-none transition"
              >
                <option value="">{t('home.allCities')}</option>
                {cityList.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative md:w-44">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder={t('home.startDate')}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]/50 transition"
              />
            </div>

            <button
              type="submit"
              className="px-8 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#FF6B35]/30 whitespace-nowrap"
            >
              {t('home.find')}
            </button>
          </form>
        </div>
      </section>

      {categoryList.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-[#1A1A2E] dark:text-white mb-6">{t('home.popularCategories')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoryList.map((cat, idx) => {
              const Icon = getCategoryIcon(cat.name);
              const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/search?category_id=${cat.id}`)}
                  className="bg-white dark:bg-[#1A1A2E] dark:border-white/10 rounded-2xl border border-gray-100 p-5 text-left hover:shadow-lg hover:border-[#FF6B35]/30 transition-all group"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-md`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-sm text-[#1A1A2E] dark:text-white group-hover:text-[#FF6B35] transition-colors">
                    {cat.name}
                  </h3>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FF6B35] to-[#e55a2b] shadow-xl shadow-[#FF6B35]/20">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-16 -right-10 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-20 left-10 w-72 h-72 bg-yellow-300 rounded-full blur-3xl" />
          </div>
          <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 sm:p-8 lg:p-10">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">{t('home.promoTitle')}</h3>
              <p className="mt-2 text-sm sm:text-base text-white/85 max-w-2xl">{t('home.promoText')}</p>
            </div>
            <button
              onClick={() => navigate('/create-listing')}
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-white text-[#FF6B35] font-bold rounded-xl hover:bg-orange-50 transition shadow-lg"
            >
              <PlusCircle className="w-5 h-5" />
              {t('home.promoBtn')}
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#1A1A2E] dark:text-white">{t('home.newListings')}</h2>
          <button
            onClick={() => navigate('/search?sort_by=created_at')}
            className="flex items-center gap-1 text-sm font-semibold text-[#FF6B35] hover:text-[#E55A2B] transition-colors"
          >
            {t('common.viewAll')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <ListingGrid listings={newListings} loading={loadingNew} />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#1A1A2E] dark:text-white">{t('home.popularListings')}</h2>
          <button
            onClick={() => navigate('/search?sort_by=rating')}
            className="flex items-center gap-1 text-sm font-semibold text-[#FF6B35] hover:text-[#E55A2B] transition-colors"
          >
            {t('common.viewAll')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <ListingGrid listings={popularListings} loading={loadingPopular} />
      </section>

      <section className="bg-white dark:bg-[#111120] border-y border-gray-100 dark:border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1A1A2E] dark:text-white text-center mb-4">{t('home.whyTitle')}</h2>
          <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 text-sm sm:text-base">
            {t('home.whySubtitle')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: ShieldCheck, title: t('home.why1Title'), desc: t('home.why1Desc') },
              { icon: Zap, title: t('home.why2Title'), desc: t('home.why2Desc') },
              { icon: CalendarCheck, title: t('home.why3Title'), desc: t('home.why3Desc') },
              { icon: Headset, title: t('home.why4Title'), desc: t('home.why4Desc') },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-6 hover:border-[#FF6B35]/50 hover:bg-white dark:hover:bg-white/[0.07] hover:shadow-md transition group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FF6B35]/15 flex items-center justify-center mb-4 group-hover:bg-[#FF6B35] transition">
                  <item.icon className="w-6 h-6 text-[#FF6B35] group-hover:text-white transition" />
                </div>
                <h3 className="font-bold text-[#1A1A2E] dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {[
              { value: '1 000+', label: t('home.statsListings'), icon: Star },
              { value: '5 000+', label: t('home.statsUsers'), icon: Users },
              { value: '10', label: t('home.statsCities'), icon: MapPin },
              { value: '4.8', label: t('home.statsRating'), icon: ShieldCheck },
            ].map((stat, idx) => (
              <div key={idx} className="rounded-2xl bg-[#FF6B35]/10 border border-[#FF6B35]/20 p-5 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#FF6B35]">{stat.value}</div>
                <div className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="bg-gray-50 dark:bg-[#16162b] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1A1A2E] dark:text-white text-center mb-10">{t('home.howItWorks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                title: t('home.step1Title'),
                desc: t('home.step1Desc'),
              },
              {
                icon: MessageSquare,
                title: t('home.step2Title'),
                desc: t('home.step2Desc'),
              },
              {
                icon: Calendar,
                title: t('home.step3Title'),
                desc: t('home.step3Desc'),
              },
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#FF6B35]/20 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-[#FF6B35]" />
                </div>
                <div className="text-sm font-bold text-[#FF6B35] mb-2">{t('home.step')} {idx + 1}</div>
                <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl bg-white dark:bg-gradient-to-r dark:from-[#1A1A2E] dark:to-[#16213E] border border-gray-200 dark:border-white/10 shadow-sm p-8 sm:p-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{t('home.ctaTitle')}</h3>
            <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400">{t('home.ctaText')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
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
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-[#1A1A2E] dark:text-white mb-6">{t('home.popularCities')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {cityList.slice(0, 8).map((city) => (
              <button
                key={city.id}
                onClick={() => navigate(`/search?city_id=${city.id}`)}
                className="bg-white dark:bg-[#1A1A2E] dark:border-white/10 rounded-2xl border border-gray-100 p-5 text-left hover:shadow-lg hover:border-[#FF6B35]/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#1A1A2E] dark:text-white group-hover:text-[#FF6B35] transition-colors">
                      {city.name}
                    </h3>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
