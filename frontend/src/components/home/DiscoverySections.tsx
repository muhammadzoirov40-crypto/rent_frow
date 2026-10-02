import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Compass } from 'lucide-react';
import { listings, type ListingListItem } from '../../api/index';
import { getRecentlyViewed, clearRecentlyViewed } from '../../utils/recentlyViewed';
import ListingGrid from '../listings/ListingGrid';
import EmptyState from '../ui/EmptyState';
import Section from './Section';
import { useGeolocation } from '../../hooks/useGeolocation';

/** Recently viewed listings, straight from localStorage (no network cost). */
export function RecentlyViewedSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const items = getRecentlyViewed(revision);

  if (items.length === 0) return null;

  return (
    <Section
      title={t('home.recentlyViewed')}
      hint={t('home.recentlyViewedHint')}
      actionLabel={t('home.clearRecentlyViewed')}
      onAction={() => {
        clearRecentlyViewed();
        setRevision((r) => r + 1);
      }}
    >
      <ListingGrid listings={items as unknown as ListingListItem[]} loading={false} />
    </Section>
  );
}

/** Opt-in "near you" block: asks for location only when the user clicks. */
export function NearYouSection({ radius = 25 }: { radius?: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { coords, status, request } = useGeolocation();

  const { data, isLoading } = useQuery({
    queryKey: ['nearby', coords, radius],
    queryFn: () => listings.nearby({ lat: coords!.lat, lng: coords!.lng, radius, limit: 6 }),
    enabled: Boolean(coords),
    staleTime: 5 * 60 * 1000,
  });

  const items: ListingListItem[] = data || [];

  if (!coords) {
    return (
      <Section title={t('home.nearYou')} hint={t('home.nearYouHint')}>
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/[0.03] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <span className="w-12 h-12 shrink-0 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] flex items-center justify-center">
            <MapPin className="w-6 h-6 text-[var(--accent)]" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('home.nearYouIdle')}</p>
            {status === 'denied' && (
              <p className="mt-1 text-xs font-semibold text-red-500">{t('search.errorTitle')}</p>
            )}
          </div>
          <button
            onClick={request}
            disabled={status === 'loading'}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white text-sm font-bold transition shadow-lg shadow-[rgb(var(--accent-rgb)/0.25)]"
          >
            <Compass className="w-4 h-4" />
            {status === 'loading' ? t('common.loading') : t('home.useLocation')}
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title={t('home.nearYou')}
      hint={t('home.nearYouHint')}
      actionLabel={items.length > 0 ? t('common.viewAll') : undefined}
      onAction={items.length > 0 ? () => navigate('/search') : undefined}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-gray-100 dark:bg-white/5 animate-skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-[#12141a] border border-gray-200 dark:border-white/10 rounded-2xl">
          <EmptyState
            icon={MapPin}
            title={t('home.nearYouEmpty')}
            description={t('home.nearYouHint')}
            actionLabel={t('common.viewAll')}
            onAction={() => navigate('/search')}
          />
        </div>
      ) : (
        <ListingGrid listings={items} loading={false} />
      )}
    </Section>
  );
}
