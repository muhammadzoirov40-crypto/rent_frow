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
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
        title="Объявления не найдены"
        description="Попробуйте изменить параметры поиска"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
