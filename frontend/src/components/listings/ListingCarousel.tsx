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
    // On a phone each press moves exactly one card: the shelf there is half
    // a screen wide, snap-mandatory would round a big jump to a card edge
    // anyway, and "one press, one card" is what the two buttons read as.
    // sm and up keeps the old big jump.
    const phone =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
    const first = el.firstElementChild as HTMLElement | null;
    const step =
      phone && first
        ? first.offsetWidth + (parseFloat(getComputedStyle(el).gap) || 0)
        : Math.max(240, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  // Drag-to-shelf with a mouse, phones and narrow windows only. A finger
  // already scrolls an overflow-x strip natively, but a mouse has no
  // gesture at all — in a 320–639px window the cards simply could not be
  // moved by hand. Press-drag now pulls the shelf; a drag that ends on a
  // card swallows the click so it does not open the listing you meant to
  // pull. >=640 keeps its arrows and its wheel, untouched.
  const dragRef = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const onDragStart = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 639px)').matches) return;
    const el = stripRef.current;
    if (!el) return;
    // Stop the browser from dragging the card photo / selecting the title.
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const el = stripRef.current;
    if (!d.active || !el) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 3) d.moved = true;
    el.scrollLeft = d.startLeft - dx;
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
  };

  const onStripClickCapture = (e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
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
        className="no-scrollbar flex gap-4 lg:gap-6 overflow-x-auto snap-x snap-mandatory pb-1 max-sm:cursor-grab max-sm:active:cursor-grabbing"
        data-testid="carousel-strip"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerLeave={onDragEnd}
        onClickCapture={onStripClickCapture}
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

      {/* Phones: the same two controls, but as a small pair under the shelf
          instead of circles sitting on the photos — one press slides exactly
          one card, and there is no gesture to learn. sm and up keeps the
          overlay arrows below, untouched. */}
      {canScroll && (
        <div className="mt-3 flex sm:hidden justify-end gap-2">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label={t('common.back')}
            className="glass-popover w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-95 transition"
            data-testid="carousel-prev-phone"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label={t('common.next')}
            className="glass-popover w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-95 transition"
            data-testid="carousel-next-phone"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

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
