import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Search, Compass } from 'lucide-react';

/**
 * Catch-all route. Replaces the old silent <Navigate to="/" /> so that a typo'd
 * or stale URL tells the user what happened instead of quietly landing home.
 */
export default function NotFoundPage() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="relative inline-flex items-center justify-center">
          <span
            aria-hidden
            className="text-[7rem] sm:text-[9rem] font-black leading-none select-none tracking-tighter text-[rgb(var(--accent-rgb)/0.14)] dark:text-[rgb(var(--accent-rgb)/0.22)]"
          >
            404
          </span>
          <Compass className="absolute w-10 h-10 sm:w-12 sm:h-12 text-[var(--accent)]" />
        </div>

        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#1A1A2E] dark:text-white">
          {t('notFound.title')}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
          {t('notFound.desc')}
        </p>

        <p className="mt-5 text-[11px] text-gray-400 dark:text-gray-500">{t('notFound.path')}</p>
        <p
          dir="ltr"
          className="mt-1 inline-block max-w-full truncate px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 font-mono text-xs text-gray-600 dark:text-gray-300"
        >
          {location.pathname}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold shadow-lg shadow-[rgb(var(--accent-rgb)/0.25)] hover:opacity-90 transition"
          >
            <Home className="w-4 h-4" />
            {t('notFound.home')}
          </Link>
          <Link
            to="/search"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition"
          >
            <Search className="w-4 h-4" />
            {t('notFound.search')}
          </Link>
        </div>
      </div>
    </div>
  );
}
