import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles, Building2, Car, Wrench, ArrowRight } from 'lucide-react';
import SearchBar from '../search/SearchBar';
import { listings, type ListingListItem } from '../../api';
import { useTranslation } from 'react-i18next';

// Fallback high quality items if backend has few listings
const FALLBACK_LISTINGS = [
  {
    id: 101,
    title: 'Penthouse Loft Душанбе',
    city_name: 'Душанбе, И. Сомонӣ',
    price: 450,
    price_unit: 'day',
    primary_image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
    categoryKey: 'home.heroTagProperty',
    badgeColor: '#FF6B35',
  },
  {
    id: 102,
    title: 'BMW M5 F90 Competition',
    city_name: 'Душанбе, марказ',
    price: 790,
    price_unit: 'day',
    primary_image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&auto=format&fit=crop&q=80',
    categoryKey: 'home.heroTagTransport',
    badgeColor: '#00F0FF',
  },
  {
    id: 103,
    title: 'Маҷмӯи DeWalt & Bosch Set',
    city_name: 'Хуҷанд',
    price: 110,
    price_unit: 'day',
    primary_image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80',
    categoryKey: 'home.heroTagEquipment',
    badgeColor: '#10B981',
  },
  {
    id: 104,
    title: 'Sony FX3 + 24-70mm GM',
    city_name: 'Душанбе',
    price: 280,
    price_unit: 'day',
    primary_image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
    categoryKey: 'home.heroTagPhoto',
    badgeColor: '#A855F7',
  },
  {
    id: 105,
    title: 'Mercedes-Benz G63 AMG',
    city_name: 'Душанбе, Сино',
    price: 1200,
    price_unit: 'day',
    primary_image: 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=600&auto=format&fit=crop&q=80',
    categoryKey: 'home.heroTagTransport',
    badgeColor: '#00F0FF',
  },
  {
    id: 106,
    title: 'Ҳавлии боҳашамат дар Варзоб',
    city_name: 'Варзоб',
    price: 950,
    price_unit: 'day',
    primary_image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80',
    categoryKey: 'home.heroTagProperty',
    badgeColor: '#FF6B35',
  },
  {
    id: 107,
    title: 'DJI Mavic 3 Pro Cine',
    city_name: 'Душанбе',
    price: 350,
    price_unit: 'day',
    primary_image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80',
    categoryKey: 'home.heroTagEquipment',
    badgeColor: '#10B981',
  },
  {
    id: 108,
    title: 'Студияи замонавӣ (Loft)',
    city_name: 'Хуҷанд, марказ',
    price: 320,
    price_unit: 'day',
    primary_image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=80',
    categoryKey: 'home.heroTagProperty',
    badgeColor: '#FF6B35',
  },
];

interface RealCardProps {
  item: {
    id: number;
    title: string;
    city_name?: string | null;
    price: number;
    price_unit?: string;
    primary_image?: string | null;
    category_name?: string | null;
    categoryKey?: string;
    badgeColor?: string;
  };
}

function InfiniteCard({ item }: RealCardProps) {
  const { t } = useTranslation();
  const image =
    item.primary_image ||
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80';
  const category = item.categoryKey
    ? t(item.categoryKey)
    : item.category_name || t('home.heroFallbackTag');
  const badgeColor = item.badgeColor || '#00F0FF';

  return (
    <Link
      to={`/listings/${item.id}`}
      className="block group bg-slate-900/60 hover:bg-slate-800/85 border border-white/10 hover:border-[#FF6B35]/50 rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300 overflow-hidden cursor-pointer w-full text-left"
    >
      <div className="h-32 sm:h-36 w-full rounded-xl overflow-hidden relative bg-slate-800">
        <img
          src={image}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
        <span
          className="absolute top-2 left-2 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md border border-white/10"
          style={{ backgroundColor: `${badgeColor}33`, color: badgeColor }}
        >
          {category}
        </span>
      </div>

      <div className="mt-3">
        <h4 className="text-sm font-bold text-white truncate group-hover:text-[#FF6B35] transition-colors">
          {item.title}
        </h4>
        <p className="text-[11px] text-slate-400 truncate mt-0.5">
          {item.city_name || t('home.heroCountry')}
        </p>

        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-xs font-black text-[#00F0FF]">
            {item.price} <span className="text-[10px] text-slate-400 font-normal">{t('home.heroPerDay')}</span>
          </span>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors flex items-center gap-0.5">
            {t('common.viewDetails')} &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AnimatedHero() {
  const { t } = useTranslation();
  // Fetch real listings from backend
  const { data } = useQuery({
    queryKey: ['heroRealListings'],
    queryFn: () => listings.search({ page: 1, page_size: 16 }),
    staleTime: 5 * 60 * 1000,
  });

  const realItems = data?.items && data.items.length > 0 ? data.items : [];
  
  // Combine real items with fallback if real items are fewer than 8
  const allCards = realItems.length >= 8 ? realItems : [...realItems, ...FALLBACK_LISTINGS];

  // Divide into Column 1 and Column 2
  const col1 = allCards.filter((_, idx) => idx % 2 === 0);
  const col2 = allCards.filter((_, idx) => idx % 2 === 1);

  // Duplicate for seamless infinite loop scroll
  const col1Repeated = [...col1, ...col1];
  const col2Repeated = [...col2, ...col2];

  return (
    <div className="relative overflow-hidden pt-6 pb-16 md:pt-10 md:pb-24">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[var(--accent,#FF6B35)]/15 via-[#00F0FF]/10 to-transparent blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* LEFT: Heading, Badge, Subtitle & Search */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-6"
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent,#FF6B35)]/10 border border-[var(--accent,#FF6B35)]/25 text-xs font-bold text-[var(--accent,#FF6B35)] shadow-sm">
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
              <span>{t('home.heroKicker')}</span>
            </div>

            {/* Title with Gradient Accent */}
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white">
              {t('home.heroTitle')}{' '}
              <span className="bg-gradient-to-r from-[var(--accent,#FF6B35)] via-[#FF7A3D] to-[#00F0FF] bg-clip-text text-transparent">
                RentHub
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              {t('home.heroSubtitle')}
            </p>

            {/* Search Bar */}
            <div className="pt-2 max-w-xl">
              <SearchBar />
            </div>

            {/* Category Shortcuts */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="text-xs font-semibold text-slate-400">{t('home.heroQuickJump')}</span>
              <a
                href="#categories"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 hover:bg-[var(--accent,#FF6B35)]/10 hover:text-[var(--accent,#FF6B35)] text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700/60"
              >
                <Building2 className="w-3.5 h-3.5 text-[var(--accent,#FF6B35)]" />
                {t('home.heroPillProperty')}
              </a>
              <a
                href="#categories"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 hover:bg-[#00F0FF]/10 hover:text-[#00F0FF] text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700/60"
              >
                <Car className="w-3.5 h-3.5 text-[#00F0FF]" />
                {t('home.heroPillTransport')}
              </a>
              <a
                href="#categories"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-500/10 hover:text-emerald-500 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700/60"
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-500" />
                {t('home.heroPillEquipment')}
              </a>
            </div>
          </motion.div>

          {/* RIGHT: REAL POSTS WITH OPPOSITE INFINITE SCROLL */}
          {/* Column 1 scrolls DOWN -> UP (ба боло меравад) */}
          {/* Column 2 scrolls UP -> DOWN (аз боло ба поён меравад) */}
          <div className="lg:col-span-6 relative flex items-center justify-center pt-4 lg:pt-0">
            <div className="relative w-full max-w-lg h-[540px] sm:h-[600px] overflow-hidden rounded-3xl p-2 mask-gradient">
              
              {/* Fade masks top and bottom for smooth disappearing */}
              <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[var(--bg-page,#090D16)] via-[var(--bg-page,#090D16)]/80 to-transparent z-20 pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[var(--bg-page,#090D16)] via-[var(--bg-page,#090D16)]/80 to-transparent z-20 pointer-events-none" />

              <div className="grid grid-cols-2 gap-4 h-full">
                
                {/* COLUMN 1: Infinite Scroll UPWARDS (ба боло) */}
                <div className="overflow-hidden relative h-full">
                  <motion.div
                    className="flex flex-col gap-4 pb-4"
                    animate={{
                      y: ['0%', '-50%'],
                    }}
                    transition={{
                      duration: 22,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    whileHover={{ transition: { duration: 0 } }}
                  >
                    {col1Repeated.map((item, idx) => (
                      <InfiniteCard key={`col1-${item.id}-${idx}`} item={item} />
                    ))}
                  </motion.div>
                </div>

                {/* COLUMN 2: Infinite Scroll DOWNWARDS (аз боло ба поён) */}
                <div className="overflow-hidden relative h-full">
                  <motion.div
                    className="flex flex-col gap-4 pb-4"
                    animate={{
                      y: ['-50%', '0%'],
                    }}
                    transition={{
                      duration: 24,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    whileHover={{ transition: { duration: 0 } }}
                  >
                    {col2Repeated.map((item, idx) => (
                      <InfiniteCard key={`col2-${item.id}-${idx}`} item={item} />
                    ))}
                  </motion.div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
