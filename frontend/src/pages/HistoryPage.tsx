import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { type ListingListItem } from '../api/index';
import { getRecentlyViewed, clearRecentlyViewed } from '../utils/recentlyViewed';
import ListingGrid from '../components/listings/ListingGrid';
import EmptyState from '../components/ui/EmptyState';
import BackButton from '../components/ui/BackButton';

/**
 * What this browser has viewed lately, kept in localStorage and never sent
 * anywhere.  It used to occupy a block on the homepage; it lives here now,
 * reached from the profile menu, so the front page is all listings again.
 */
export default function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const items = getRecentlyViewed(revision);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <BackButton className="mb-4" />
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-[#1A1A2E] dark:text-white mb-2">
              {t('home.recentlyViewed')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{t('home.recentlyViewedHint')}</p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearRecentlyViewed();
                setRevision((r) => r + 1);
              }}
              className="shrink-0 text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition"
            >
              {t('home.clearRecentlyViewed')}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="glass-tile border rounded-2xl">
            <EmptyState
              icon={History}
              title={t('home.recentlyViewed')}
              description={t('home.recentlyViewedEmpty')}
              actionLabel={t('common.viewAll')}
              onAction={() => navigate('/search')}
            />
          </div>
        ) : (
          <ListingGrid listings={items as unknown as ListingListItem[]} loading={false} />
        )}
      </div>
    </div>
  );
}
