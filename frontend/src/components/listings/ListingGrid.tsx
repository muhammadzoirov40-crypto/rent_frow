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
}

export default function ListingGrid({ listings, loading }: ListingGridProps) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
