import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Zap,
  Headset,
  Star,
  Users,
  PlusCircle,
} from 'lucide-react';
import { stats } from '../api/index';
import CategoryExplorer from '../components/home/CategoryExplorer';
import ListingsShowcase from '../components/home/ListingsShowcase';
import { NearYouSection, RecentlyViewedSection } from '../components/home/DiscoverySections';
import { HowItWorksSection, BecomeSection } from '../components/home/JourneySections';
import PopularLocations from '../components/home/PopularLocations';
import Section from '../components/home/Section';
import SearchBar from '../components/search/SearchBar';
import { useGeolocation } from '../hooks/useGeolocation';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { coords } = useGeolocation();

  const { data: siteStats } = useQuery({
    queryKey: ['publicStats'],
    queryFn: stats.getPublic,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-200/80 dark:border-white/10 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/30 dark:from-[#0d1321] dark:via-[#0b0f19] dark:to-[#0b0f19]">
        {/* Soft accent gradient backdrop — follows the theme colour (--accent-rgb) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-44 -left-40 h-[34rem] w-[34rem] rounded-full bg-[rgb(var(--accent-rgb)/0.2)] blur-[110px]" />
          <div className="absolute -bottom-56 -right-28 h-[32rem] w-[32rem] rounded-full bg-[rgb(var(--accent-rgb)/0.13)] blur-[110px]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent-rgb)/0.06)] via-transparent to-transparent" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(rgb(var(--accent-rgb) / 0.3) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              maskImage: 'radial-gradient(70% 80% at 85% 25%, black 0%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(70% 80% at 85% 25%, black 0%, transparent 75%)',
              opacity: 0.5,
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 md:pt-16 md:pb-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgb(var(--accent-rgb)/0.1)] text-[var(--accent)] text-xs font-bold uppercase tracking-wider mb-5">
              <Star className="w-3.5 h-3.5" />
              {t('home.heroKicker')}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#1A1A2E] dark:text-white leading-[1.08]">
              <span className="block">{t('home.heroTitle')}</span>
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
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              {t('home.find')}
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how"
              className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] transition-colors"
            >
              {t('home.howItWorks')}
            </a>
            <a
              href="#categories"
              className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] transition-colors"
            >
              {t('home.popularCategories')}
            </a>
          </div>
        </div>
      </section>

      <CategoryExplorer />

      <ListingsShowcase />

      <NearYouSection />

      <PopularLocations />

      <RecentlyViewedSection />

      <HowItWorksSection />

      <StatsSection siteStats={siteStats} />

      <BecomeSection />

      <PromoSection />
    </div>
  );
}

function StatsSection({
  siteStats,
}: {
  siteStats?: { listings: number; users: number; cities: number; avg_rating: number };
}) {
  const { t } = useTranslation();
  return (
    <Section title={t('home.whyTitle')} hint={t('home.whySubtitle')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: ShieldCheck, title: t('home.why1Title'), desc: t('home.why1Desc') },
          { icon: Zap, title: t('home.why2Title'), desc: t('home.why2Desc') },
          { icon: Headset, title: t('home.why3Title'), desc: t('home.why3Desc') },
          { icon: Star, title: t('home.why4Title'), desc: t('home.why4Desc') },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-white/10 p-5.5 hover:border-[rgb(var(--accent-rgb)/0.5)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-11 h-11 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] flex items-center justify-center mb-3">
              <item.icon className="w-5 h-5 text-[var(--accent)]" />
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
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-white/10 p-5 text-center shadow-sm"
          >
            <div className="text-3xl font-extrabold text-[var(--accent)] tracking-tight">{stat.value}</div>
            <div className="mt-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PromoSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#111827] to-slate-900 border border-slate-800 dark:border-white/10 p-8 sm:p-10 lg:p-12 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[rgb(var(--accent-rgb)/0.2)] blur-[80px]" />
        <div className="relative flex-1 text-center md:text-left">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{t('home.promoTitle')}</h3>
          <p className="mt-2.5 text-sm sm:text-base text-gray-300 max-w-2xl leading-relaxed">{t('home.promoText')}</p>
        </div>
        <button
          onClick={() => navigate('/create-listing')}
          className="relative shrink-0 inline-flex items-center gap-2 px-6 py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold rounded-xl transition shadow-lg shadow-[rgb(var(--accent-rgb)/0.3)] hover:scale-[1.02] active:scale-95"
        >
          <PlusCircle className="w-5 h-5" />
          {t('home.promoBtn')}
        </button>
      </div>
    </section>
  );
}
