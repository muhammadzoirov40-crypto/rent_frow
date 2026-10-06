import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Search, Sparkles, Building2, Car, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SearchBar from '../search/SearchBar';

const FLOATING_CARDS = [
  {
    id: 1,
    title: 'Penthouse Loft',
    subtitleKey: 'home.heroCardWhere',
    price: '450',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
    tagKey: 'home.heroTagProperty',
    color: '#FF6B35',
    yOffset: -15,
  },
  {
    id: 2,
    title: 'BMW M5 F90',
    subtitleKey: 'home.heroCardSpec',
    price: '790',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&auto=format&fit=crop&q=80',
    tagKey: 'home.heroTagTransport',
    color: '#00F0FF',
    yOffset: 25,
  },
  {
    id: 3,
    title: 'DeWalt & Bosch Set',
    subtitleKey: 'home.heroCardPro',
    price: '110',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80',
    tagKey: 'home.heroTagEquipment',
    color: '#10B981',
    yOffset: -10,
  },
  {
    id: 4,
    title: 'Sony FX3 + 24-70mm',
    subtitleKey: 'home.heroCardCam',
    price: '280',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
    tagKey: 'home.heroTagPhoto',
    color: '#A855F7',
    yOffset: 30,
  },
];

export default function AnimatedHero() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden pt-6 pb-16 md:pt-10 md:pb-24">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-gradient-to-tr from-[var(--accent,#FF6B35)]/15 via-[#00F0FF]/10 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* LEFT: Heading, Badge, Subtitle & Search */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-6"
          >
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent,#FF6B35)]/10 border border-[var(--accent,#FF6B35)]/25 text-xs font-bold text-[var(--accent,#FF6B35)] shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
              <span>{t('home.heroKicker')}</span>
            </motion.div>

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

            {/* Integrated Search Bar */}
            <div className="pt-2 max-w-xl">
              <SearchBar />
            </div>

            {/* Quick Category Pills */}
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

          {/* RIGHT: The Reel-style Animated Floating Slanted Cards Stack */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative flex items-center justify-center pt-4 lg:pt-0"
          >
            {/* The Slanted Grid / Floating Column like in the Video (code.xr reel) */}
            <div className="grid grid-cols-2 gap-4 sm:gap-5 w-full max-w-md transform sm:rotate-[-4deg] hover:rotate-0 transition-transform duration-700">
              
              {/* Column 1 */}
              <div className="space-y-4 sm:space-y-5">
                {FLOATING_CARDS.slice(0, 2).map((item, idx) => (
                  <motion.div
                    key={item.id}
                    animate={{
                      y: [0, item.yOffset, 0],
                    }}
                    transition={{
                      duration: 4.5 + idx,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    whileHover={{ scale: 1.04, rotate: 1 }}
                    className="group bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 sm:p-3.5 shadow-xl backdrop-blur-md transition-all cursor-pointer overflow-hidden relative"
                  >
                    <div className="h-32 sm:h-36 w-full rounded-xl overflow-hidden relative bg-slate-800">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <span
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow"
                        style={{ backgroundColor: `${item.color}25`, color: item.color }}
                      >
                        {t(item.tagKey)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {t(item.subtitleKey)}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-black text-[var(--accent,#FF6B35)]">
                          {item.price} {t('home.heroPerDay')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">
                          {t('common.viewDetails')} &rarr;
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Column 2 (Offsetted for diagonal aesthetic) */}
              <div className="space-y-4 sm:space-y-5 pt-8 sm:pt-10">
                {FLOATING_CARDS.slice(2, 4).map((item, idx) => (
                  <motion.div
                    key={item.id}
                    animate={{
                      y: [0, item.yOffset, 0],
                    }}
                    transition={{
                      duration: 5 + idx,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    whileHover={{ scale: 1.04, rotate: -1 }}
                    className="group bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 sm:p-3.5 shadow-xl backdrop-blur-md transition-all cursor-pointer overflow-hidden relative"
                  >
                    <div className="h-32 sm:h-36 w-full rounded-xl overflow-hidden relative bg-slate-800">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <span
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow"
                        style={{ backgroundColor: `${item.color}25`, color: item.color }}
                      >
                        {t(item.tagKey)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {t(item.subtitleKey)}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-black text-[var(--accent,#FF6B35)]">
                          {item.price} {t('home.heroPerDay')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">
                          {t('common.viewDetails')} &rarr;
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
