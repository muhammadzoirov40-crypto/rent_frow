import { Link } from 'react-router-dom';
import { MapPin, Star, Heart, BadgeCheck, ArrowRight, Camera, Image as ImageIcon } from 'lucide-react';
import { listings, type Listing, type ListingListItem } from '../../api/index';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '../../utils/format';

type ListingCardData = (Listing | ListingListItem) & {
  images?: { id: number; image_url: string }[];
  primary_image?: string | null;
  city?: { name: string } | null;
  city_name?: string | null;
  district?: { name: string } | null;
  owner?: { display_name: string | null; avatar_url?: string | null; role?: string } | null;
  rating_sum?: number;
  rating_count?: number;
  average_rating?: number;
};

interface ListingCardProps {
  listing: ListingCardData;
}

function getImageUrl(listing: ListingCardData): string | null {
  if ('primary_image' in listing && listing.primary_image) return listing.primary_image;
  if (listing.images && listing.images.length > 0) {
    const img = listing.images[0];
    if (typeof img === 'string') return img;
    if ('image_url' in img) return img.image_url;
  }
  return null;
}

function getCityName(listing: ListingCardData): string | null {
  if ('city_name' in listing && listing.city_name) return listing.city_name;
  if (listing.city && 'name' in listing.city) return listing.city.name;
  return null;
}

function getDistrictName(listing: ListingCardData): string | null {
  if (listing.district && 'name' in listing.district) return listing.district.name;
  if ('district_name' in listing && listing.district_name) return listing.district_name;
  return null;
}

function getRating(listing: ListingCardData): string | null {
  const ratingCount = listing.rating_count ?? 0;
  const ratingSum = listing.rating_sum ?? 0;
  const avg = listing.average_rating ?? 0;
  if (ratingCount > 0) return (ratingSum / ratingCount).toFixed(1);
  if (avg > 0) return avg.toFixed(1);
  return null;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { t } = useTranslation();
  const [isFavorited, setIsFavorited] = useState(listing.is_favorited ?? false);
  const queryClient = useQueryClient();

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await listings.toggleFavorite(listing.id);
      setIsFavorited(res.is_favorited);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch {}
  };

  const imageUrl = getImageUrl(listing);
  const rating = getRating(listing);
  const cityName = getCityName(listing);
  const districtName = getDistrictName(listing);
  const reviewCount = listing.rating_count;
  const isVerified = 'is_verified' in listing && listing.is_verified === true;
  const imageCount =
    'images' in listing && Array.isArray(listing.images) ? listing.images.length : 0;

  const status = 'status' in listing ? listing.status : undefined;
  const available =
    'available' in listing && typeof listing.available === 'boolean' ? listing.available : null;

  let availability: { label: string; cls: string } | null = null;
  if (status === 'RENTED') {
    availability = {
      label: t('listing.booked'),
      cls: 'bg-white/95 text-red-700 ring-red-200 dark:bg-slate-900/90 dark:text-red-400 dark:ring-red-500/30',
    };
  } else if (available === true) {
    availability = {
      label: t('listing.available'),
      cls: 'bg-white/95 text-emerald-700 ring-emerald-200 dark:bg-slate-900/90 dark:text-emerald-400 dark:ring-emerald-500/30',
    };
  } else if (available === false) {
    availability = {
      label: t('listing.unavailable'),
      cls: 'bg-white/95 text-gray-600 ring-gray-200 dark:bg-slate-900/90 dark:text-gray-300 dark:ring-white/15',
    };
  }

  const hasPrice = typeof listing.price === 'number';
  const unitKey = /^per_(hour|day|week|month)$/.test(listing.price_unit)
    ? `listing.${listing.price_unit}`
    : null;

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group block bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl rounded-2xl overflow-hidden border border-gray-200/80 dark:border-white/10 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[rgb(var(--accent-rgb)/0.5)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-slate-800 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 ring-1 ring-black/5 shadow-sm">
              <ImageIcon className="w-7 h-7 text-gray-400 dark:text-slate-500" aria-hidden="true" />
            </div>
          </div>
        )}

        {isVerified && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/65 text-white ring-1 ring-white/20 backdrop-blur-sm">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            {t('listing.verified')}
          </span>
        )}

        <button
          type="button"
          onClick={toggleFavorite}
          aria-label={isFavorited ? t('listing.inFavorites') : t('listing.addToFavorites')}
          aria-pressed={isFavorited}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex items-center justify-center shadow-md ring-1 ring-black/5 hover:scale-110 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-slate-400'
            }`}
            aria-hidden="true"
          />
        </button>

        {availability && (
          <span
            className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm ring-1 ring-inset ${availability.cls}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                available === true && status !== 'RENTED' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              aria-hidden="true"
            />
            {availability.label}
          </span>
        )}

        {imageCount > 1 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-black/65 text-white ring-1 ring-white/20 backdrop-blur-sm">
            <Camera className="w-3.5 h-3.5" aria-hidden="true" />
            {imageCount}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2">
        <h3 className="font-bold text-[#1A1A2E] dark:text-white text-[15px] leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[var(--accent)] transition-colors">
          {listing.title}
        </h3>

        {(cityName || districtName) && (
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 dark:text-slate-400 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
            <span className="truncate">
              {cityName}
              {districtName ? `, ${districtName}` : ''}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[13px]">
          <Star
            className={`w-4 h-4 ${rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-slate-600'}`}
            aria-hidden="true"
          />
          <span className="font-bold text-gray-800 dark:text-white">{rating ?? '—'}</span>
          {typeof reviewCount === 'number' && (
            <span className="text-gray-400 dark:text-slate-500">
              ({reviewCount} {t('listing.reviews')})
            </span>
          )}
        </div>

        {hasPrice && (
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[22px] font-extrabold leading-none text-[var(--accent)] tracking-tight">
              {formatAmount(listing.price)}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              {t('common.somoni')}
              {unitKey ? ` / ${t(unitKey)}` : ''}
            </span>
          </div>
        )}

        <div className="mt-1 pt-3 border-t border-gray-100 dark:border-white/10">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--accent)]">
            {t('common.viewDetails')}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
