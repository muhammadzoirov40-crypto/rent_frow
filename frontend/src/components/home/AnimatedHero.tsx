import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Car, Wrench } from 'lucide-react';
import SearchBar from '../search/SearchBar';
import { useTranslation } from 'react-i18next';

export default function AnimatedHero() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden pt-4 pb-10 md:pt-6 md:pb-14">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[var(--accent,#FF6B35)]/15 via-[rgb(var(--accent-rgb)/0.1)] to-transparent blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          {/* LEFT: Heading, Badge, Subtitle & Search */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-start-1 lg:col-span-12 lg:row-start-1 space-y-6 min-w-0"
          >
            {/* Title with Gradient Accent */}
            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white">
              {t('home.heroTitle')}{' '}
              <span className="sm:whitespace-nowrap">
                <span className="bg-gradient-to-r from-[var(--hero-rent-from)] via-[var(--hero-rent-via)] to-[var(--hero-rent-to)] bg-clip-text text-transparent bg-[length:200%_200%] animate-[renthubShine_6s_ease-in-out_infinite] drop-shadow-[0_2px_16px_var(--hero-rent-shadow)]">
                  Rent
                </span>
                <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--accent-light)] to-[var(--accent-hover)] bg-clip-text text-transparent bg-[length:200%_200%] animate-[renthubShine_6s_ease-in-out_infinite] drop-shadow-[0_2px_16px_rgb(var(--accent-rgb)/0.4)]">
                  Hub
                </span>
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              {t('home.heroSubtitle')}
            </p>

            {/* Category Shortcuts — centred: the label takes its own line on
                narrow screens so the three chips sit together, centred, on
                the next one instead of ragged left-aligned wraps. */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 pt-2">
              <span className="w-full sm:w-auto text-center text-xs font-semibold text-slate-400">{t('home.heroQuickJump')}</span>
              <a
                href="#categories"
                className="glass-card glass-card-hover inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold hover:text-[var(--accent,#FF6B35)] text-slate-700 dark:text-slate-300 transition-all"
              >
                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--accent,#FF6B35)]" />
                {t('home.heroPillProperty')}
              </a>
              <a
                href="#categories"
                className="glass-card glass-card-hover inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold hover:text-[var(--accent)] text-slate-700 dark:text-slate-300 transition-all"
              >
                <Car className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--accent)]" />
                {t('home.heroPillTransport')}
              </a>
              <a
                href="#categories"
                className="glass-card glass-card-hover inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold hover:text-[var(--accent)] text-slate-700 dark:text-slate-300 transition-all"
              >
                <Wrench className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--accent)]" />
                {t('home.heroPillEquipment')}
              </a>
            </div>
          </motion.div>
          {/* One line or nothing: the bar needs ~710px to keep every field on a
              single row, which is wider than the text column can give it, so it
              owns a full-width row of its own (mobile order is unchanged). */}
          <div className="lg:col-start-1 lg:col-span-12 lg:row-start-2 w-full">
            <SearchBar />
          </div>

          {/* The two card columns that used to scroll endlessly up and down
              here are gone: the hero is text + search now, full width, the
              same on every screen. */}
        </div>
      </div>
    </div>
  );
}
