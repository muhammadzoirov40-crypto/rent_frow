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
  /**
   * Width of one card. The default is the showcase's shelf (three and a
   * bit across on a desktop); a row that has to fit four - the paid TOP
   * windows, where every extra slot is what was bought - passes its own.
   */
  cardClass?: string;
}

const DEFAULT_CARD_CLASS = 'w-[calc(50%-8px)] sm:w-[46%] lg:w-[31%]';

/**
 * The home page's shelf: cards side by side, swiped or scrolled left and
 * right instead of stacked into rows, so a dozen listings fit one glance.
 * A card is deliberately cut at the right edge - the shelf visibly continues,
 * which is what tells people to swipe. The search page keeps ListingGrid: a
 * wall is right there, a shelf is right here.
 */
export default function ListingCarousel({
  listings,
  loading,
  cardClass = DEFAULT_CARD_CLASS,
}: ListingCarouselProps) {
  const { t } = useTranslation();
  const stripRef = useRef<HTMLDivElement>(null);
  // Arrows only earn their place when there is something off-screen to reach;
  // with three listings on a wide monitor there is nothing to scroll.
  const [canScroll, setCanScroll] = useState(false);

  // Measured again whenever the shelf or the window changes: the cut card at
  // the right edge *is* the invitation to swipe, and an arrow that stays
  // hidden after a resize (or after the cards finally land) would leave that
  // invitation with nothing to point at.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const measure = () => setCanScroll(el.scrollWidth > el.clientWidth + 8);
    measure();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [listings, loading]);

  const nudge = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex gap-4 lg:gap-6 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`shrink-0 ${cardClass}`}>
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
            className={`snap-start shrink-0 ${cardClass}`}
          >
            {/* compact only re-dresses the card below sm — two of them now
                share a phone row, so the title runs 13px and the photo chips
                stand aside; >=640 is byte-identical to the old card. */}
            <ListingCard listing={listing} compact />
          </div>
        ))}
      </div>

      {canScroll && (
        <>
          {/* Phones: the arrows sat on top of the card photos at a third of
              a screen width and covered the very thing they pointed at —
              there the shelf is swiped with a thumb, and snap-x does the
              rest. sm and up keeps them exactly where they were. */}
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label={t('common.back')}
            className="hidden sm:flex glass-popover absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[var(--accent)] hover:border-[var(--accent)] transition z-10"
            data-testid="carousel-prev"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label={t('common.next')}
            className="hidden sm:flex glass-popover absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[var(--accent)] hover:border-[var(--accent)] transition z-10"
            data-testid="carousel-next"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  );
}
