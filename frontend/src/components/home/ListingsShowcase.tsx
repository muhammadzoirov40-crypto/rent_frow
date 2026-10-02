import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, Compass, Star, BadgeCheck, Flame, Sparkles, Clock, Package } from 'lucide-react';
import { listings, type ListingListItem } from '../../api/index';
import ListingGrid from '../listings/ListingGrid';
import EmptyState from '../ui/EmptyState';
import Section from './Section';

export type ShowcaseTab = 'popular' | 'recommended' | 'nearYou' | 'recent' | 'topRated' | 'verified';

interface ShowcaseSpec {
  key: ShowcaseTab;
  icon: React.ElementType;
  params: Record<string, unknown>;
}

const TABS: Record<ShowcaseTab, ShowcaseSpec> = {
  popular: { key: 'popular', icon: Flame, params: { sort_by: 'views' } },
  recommended: { key: 'recommended', icon: Sparkles, params: { sort_by: 'rating', min_rating: 3 } },
  nearYou: { key: 'nearYou', icon: Compass, params: { sort_by: 'views' } },
  recent: { key: 'recent', icon: Clock, params: { sort_by: 'created_at' } },
  topRated: { key: 'topRated', icon: Star, params: { sort_by: 'rating' } },
  verified: { key: 'verified', icon: BadgeCheck, params: { is_verified: true, sort_by: 'rating' } },
};

const TAB_ORDER: ShowcaseTab[] = ['popular', 'recommended', 'topRated', 'verified', 'recent'];

const PAGE_SIZE = 6;

interface ListingsShowcaseProps {
  /** Which tabs to offer. Defaults to the full discovery set. */
  tabs?: ShowcaseTab[];
  /** Coordinates for the "near you" tab; the tab is hidden when omitted. */
  coords?: { lat: number; lng: number } | null;
  initialTab?: ShowcaseTab;
}

const HINT_KEYS: Record<ShowcaseTab, string> = {
  popular: 'home.popularListingsHint',
  recommended: 'home.recommendedHint',
  nearYou: 'home.nearYouHint',
  recent: 'home.recentlyAddedHint',
  topRated: 'home.topRatedHint',
  verified: 'home.verifiedHint',
};

const TITLE_KEYS: Record<ShowcaseTab, string> = {
  popular: 'home.popularListings',
  recommended: 'home.recommended',
  nearYou: 'home.nearYou',
  recent: 'home.recentlyAdded',
  topRated: 'home.topRated',
  verified: 'home.verifiedListings',
};

export default function ListingsShowcase({ tabs, coords, initialTab }: ListingsShowcaseProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const available = useMemo(() => {
    const base = tabs && tabs.length > 0 ? tabs : TAB_ORDER;
    return base.filter((key) => (key === 'nearYou' ? Boolean(coords) : true));
  }, [tabs, coords]);

  const [selected, setSelected] = useState<ShowcaseTab>(
    initialTab && available.includes(initialTab) ? initialTab : available[0],
  );
  const active = available.includes(selected) ? selected : available[0];

  const params = useMemo(() => {
    const spec = TABS[active];
    const p: Record<string, unknown> = { page: 1, page_size: PAGE_SIZE, ...spec.params };
    if (active === 'nearYou' && coords) {
      p.lat = coords.lat;
      p.lng = coords.lng;
      p.radius = 25;
      p.limit = PAGE_SIZE;
    }
    return p;
  }, [active, coords]);

  const { data, isLoading } = useQuery({
    queryKey: ['showcase', active, params],
    queryFn: () =>
      active === 'nearYou' && coords
        ? listings.nearby({ lat: coords.lat, lng: coords.lng, radius: 25, limit: PAGE_SIZE })
            .then((items) => ({ items: items as ListingListItem[], total: items.length, pages: 1, page: 1 }))
        : listings.search(params),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  if (available.length === 0) return null;

  const items: ListingListItem[] = data?.items || [];
  const empty = !isLoading && items.length === 0;

  return (
    <Section
      title={t(TITLE_KEYS[active])}
      hint={t(HINT_KEYS[active])}
      actionLabel={t('common.viewAll')}
      onAction={() =>
        navigate(
          active === 'nearYou'
            ? '/search'
            : `/search?${new URLSearchParams(
                Object.entries(TABS[active].params)
                  .filter(([, v]) => v !== undefined)
                  .map(([k, v]) => [k, String(v)]),
              ).toString()}`,
        )
      }
    >
      {available.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {available.map((key) => {
            const Icon = TABS[key].icon;
            const isActive = key === active;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition ${
                  isActive
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]'
                    : 'bg-white dark:bg-[#12141a] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-[rgb(var(--accent-rgb)/0.5)] hover:text-[var(--accent)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(TITLE_KEYS[key])}
              </button>
            );
          })}
        </div>
      )}

      {empty ? (
        <div className="bg-white dark:bg-[#12141a] border border-gray-200 dark:border-white/10 rounded-2xl">
          <EmptyState
            icon={active === 'nearYou' ? MapPin : Package}
            title={active === 'nearYou' ? t('home.nearYouEmpty') : t('home.noListingsYet')}
            description={t('home.noListingsYetHint')}
            actionLabel={t('common.viewAll')}
            onAction={() => navigate('/search')}
          />
        </div>
      ) : (
        <ListingGrid listings={items} loading={isLoading} />
      )}
    </Section>
  );
}
