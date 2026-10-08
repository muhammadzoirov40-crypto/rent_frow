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
  FileCheck2,
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

import AnimatedHero from '../components/home/AnimatedHero';

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
    <div className="min-h-screen">
      {/* no bg-colour fill on this root: the faceted dark backdrop lives on
          body::before, and an opaque page-colour fill would sit on top of it */}
      {/* Animated Hero matching video design */}
      <AnimatedHero />


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

  const benefits = [
    {
      icon: ShieldCheck,
      title: t('home.why1Title'),
      desc: t('home.why1Desc'),
      badge: '01',
      color: 'from-[rgb(var(--accent-rgb)/0.25)] to-[rgb(var(--accent-rgb)/0.05)] text-[var(--accent)] border-[rgb(var(--accent-rgb)/0.3)]',
      accentGlow: 'hover:border-[rgb(var(--accent-rgb)/0.5)] hover:shadow-[rgb(var(--accent-rgb)/0.15)]',
      dotColor: 'bg-[var(--accent)]',
    },
    {
      icon: Zap,
      title: t('home.why2Title'),
      desc: t('home.why2Desc'),
      badge: '02',
      color: 'from-[rgb(var(--accent-rgb)/0.25)] to-[rgb(var(--accent-rgb)/0.05)] text-[var(--accent)] border-[rgb(var(--accent-rgb)/0.3)]',
      accentGlow: 'hover:border-[rgb(var(--accent-rgb)/0.5)] hover:shadow-[rgb(var(--accent-rgb)/0.15)]',
      dotColor: 'bg-[var(--accent)]',
    },
    {
      icon: FileCheck2,
      title: t('home.why3Title'),
      desc: t('home.why3Desc'),
      badge: '03',
      color: 'from-[rgb(var(--accent-rgb)/0.25)] to-[rgb(var(--accent-rgb)/0.05)] text-[var(--accent)] border-[rgb(var(--accent-rgb)/0.3)]',
      accentGlow: 'hover:border-[rgb(var(--accent-rgb)/0.5)] hover:shadow-[rgb(var(--accent-rgb)/0.15)]',
      dotColor: 'bg-[var(--accent)]',
    },
    {
      icon: Headset,
      title: t('home.why4Title'),
      desc: t('home.why4Desc'),
      badge: '04',
      color: 'from-[rgb(var(--accent-rgb)/0.25)] to-[rgb(var(--accent-rgb)/0.05)] text-[var(--accent)] border-[rgb(var(--accent-rgb)/0.3)]',
      accentGlow: 'hover:border-[var(--accent)]/50 hover:shadow-[rgb(var(--accent-rgb)/0.15)]',
      dotColor: 'bg-[var(--accent)]',
    },
  ];

  return (
    <Section title={t('home.whyTitle')} hint={t('home.whySubtitle')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {benefits.map((item) => (
          <div
            key={item.title}
            className={`group relative overflow-hidden rounded-3xl bg-white/70 dark:bg-[#111827]/65 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl dark:hover:shadow-[0_20px_45px_-12px_rgba(0,0,0,0.7)] ${item.accentGlow}`}
          >
            {/* Top gradient accent line on hover */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Decorative background watermark icon */}
            <item.icon
              aria-hidden="true"
              className="absolute -right-3 -bottom-3 w-28 h-28 text-gray-900/[0.03] dark:text-white/[0.04] group-hover:scale-110 group-hover:text-[var(--accent)]/10 transition-all duration-500 pointer-events-none"
            />

            <div>
              {/* Header row: Icon + Step Badge */}
              <div className="flex items-center justify-between mb-5">
                <div
                  className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${item.color} border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}
                >
                  <item.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="text-2xl font-black text-gray-200 dark:text-slate-700/60 font-mono tracking-wider group-hover:text-[var(--accent)]/40 transition-colors">
                  {item.badge}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-base sm:text-[17px] text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
                {item.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                {item.desc}
              </p>
            </div>

            {/* Bottom active pill */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${item.dotColor} animate-pulse`} />
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                RentHub Verified
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-7">
        {[
          { value: siteStats ? String(siteStats.listings) : '—', label: t('home.statsListings'), icon: Star },
          { value: siteStats ? String(siteStats.users) : '—', label: t('home.statsUsers'), icon: Users },
          { value: siteStats ? String(siteStats.cities) : '—', label: t('home.statsCities'), icon: MapPin },
          { value: siteStats ? siteStats.avg_rating.toFixed(1) : '—', label: t('home.statsRating'), icon: ShieldCheck },
        ].map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-[#111827]/65 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 p-5 sm:p-6 text-center shadow-sm hover:shadow-lg dark:hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.6)] hover:border-[var(--accent)]/40 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] text-[var(--accent)] mb-2 group-hover:scale-110 transition-transform">
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-[var(--accent)] transition-colors">
              {stat.value}
            </div>
            <div className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {stat.label}
            </div>
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
