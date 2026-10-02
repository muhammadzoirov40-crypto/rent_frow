import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Image as ImageIcon, MapPin, Sparkles, Star, User } from 'lucide-react';
import type { AIListingCard } from '../../api';
import { formatPrice, formatPriceUnit } from '../../utils/format';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  listings?: AIListingCard[];
}

/** Compact horizontal card — same tokens as the rest of RentHub, sized for a chat panel. */
function ListingRow({ listing }: { listing: AIListingCard }) {
  const { t, i18n } = useTranslation();

  const place = [listing.city_name, listing.district_name].filter(Boolean).join(' · ');
  const rating =
    listing.average_rating && listing.average_rating > 0 ? listing.average_rating.toFixed(1) : null;

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group flex items-center gap-3 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 transition hover:border-[var(--accent)]/50 hover:bg-white dark:hover:bg-white/10"
    >
      <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-[rgb(var(--accent-rgb)/0.1)] flex items-center justify-center">
        {listing.primary_image ? (
          <img
            src={listing.primary_image}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-5 h-5 text-[var(--accent)]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#1A1A2E] dark:text-white truncate transition group-hover:text-[var(--accent)]">
          {listing.title}
        </p>
        <p className="text-[13px] font-bold text-[var(--accent)]">
          {formatPrice(listing.price, t, i18n.language)}
          <span className="text-[11px] font-medium opacity-70">
            {formatPriceUnit(t, listing.price_unit)}
          </span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
          {place && (
            <>
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{place}</span>
            </>
          )}
          {rating && (
            <span className="inline-flex items-center gap-0.5 shrink-0">
              {place && <span aria-hidden>·</span>}
              <Star className="w-3 h-3 fill-current text-amber-400" />
              {rating}
            </span>
          )}
        </p>
      </div>

      <ArrowRight className="w-4 h-4 shrink-0 text-gray-300 dark:text-gray-600 transition group-hover:text-[var(--accent)] group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function AIChatMessage({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 shrink-0 mt-1 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="flex flex-col gap-2 max-w-[85%] min-w-0">
        <div
          className={
            isUser
              ? 'px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.25)]'
              : 'px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white dark:bg-[#12121f] border border-gray-100 dark:border-white/10 text-[#1A1A2E] dark:text-white'
          }
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {message.listings && message.listings.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1">
              {t('assistant.found')} ({message.listings.length})
            </p>
            {message.listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 shrink-0 mt-1 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center">
          <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
      )}
    </div>
  );
}
