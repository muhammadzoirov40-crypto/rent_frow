import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import ListingCard from './ListingCard';
import SkeletonCard from '../ui/SkeletonCard';
import EmptyState from '../ui/EmptyState';
import { type Listing, type ListingListItem } from '../../api/index';

type ListingGridItem = Listing | ListingListItem;

interface ListingGridProps {
  listings: ListingGridItem[];
  loading: boolean;
  /** The search page on a phone: two cards per row instead of one big
      card, with the tighter gap that goes with it. */
  twoOnPhone?: boolean;
}

export default function ListingGrid({ listings, loading, twoOnPhone = false }: ListingGridProps) {
  const { t } = useTranslation();
  const gridCls = twoOnPhone
    ? 'grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6';
  if (loading) {
    return (
      <div className={gridCls}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t('search.emptyTitle')}
        description={t('search.emptyText')}
        actionLabel={t('common.reset')}
        onAction={() => window.location.assign('/search')}
      />
    );
  }

  return (
    <div className={gridCls}>
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} compact={twoOnPhone} />
      ))}
    </div>
  );
}
