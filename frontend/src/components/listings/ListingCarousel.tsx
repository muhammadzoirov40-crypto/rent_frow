import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ListingCard from './ListingCard';
import SkeletonCard from '../ui/SkeletonCard';
import { type Listing, type ListingListItem } from '../../api/index';

type CarouselItem = Listing | ListingListItem;

interface ListingCarouselProps {
  listings: CarouselItem[];
  loading: boolean;
}

/**
 * The home page's shelf: cards side by side, swiped or scrolled left and
 * right instead of stacked into rows, so a dozen listings fit one glance.
 * A card is deliberately cut at the right edge - the shelf visibly continues,
 * which is what tells people to swipe. The search page keeps ListingGrid: a
 * wall is right there, a shelf is right here.
 */
export default function ListingCarousel({ listings, loading }: ListingCarouselProps) {
  const { t } = useTranslation();
  const stripRef = useRef<HTMLDivElement>(null);
  // Arrows only earn their place when there is something off-screen to reach;
  // with three listings on a wide monitor there is nothing to scroll.
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    setCanScroll(el.scrollWidth > el.clientWidth + 8);
  }, [listings]);

  const nudge = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex gap-4 lg:gap-6 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[80%] sm:w-[46%] lg:w-[31%]">
            <SkeletonCard />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" data-testid="listing-carousel">
      <div
        ref={stripRef}
        className="no-scrollbar flex gap-4 lg:gap-6 overflow-x-auto snap-x snap-mandatory pb-1"
        data-testid="carousel-strip"
      >
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="snap-start shrink-0 w-[80%] sm:w-[46%] lg:w-[31%]"
          >
            <ListingCard listing={listing} />
          </div>
        ))}
      </div>

      {canScroll && (
        <>
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label={t('common.back')}
            className="flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-[#1A1A2E]/95 border border-gray-200 dark:border-white/10 shadow-md items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[var(--accent)] hover:border-[var(--accent)] transition z-10"
            data-testid="carousel-prev"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label={t('common.next')}
            className="flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-[#1A1A2E]/95 border border-gray-200 dark:border-white/10 shadow-md items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[var(--accent)] hover:border-[var(--accent)] transition z-10"
            data-testid="carousel-next"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  );
}
