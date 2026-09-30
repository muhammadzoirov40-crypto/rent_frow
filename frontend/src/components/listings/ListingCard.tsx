import { Link } from 'react-router-dom';
import { MapPin, Star, Clock, User, Heart, BadgeCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { listings, type Listing, type ListingListItem } from '../../api/index';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

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

const PRICE_UNIT_LABELS: Record<string, string> = {
  per_hour: '/час',
  per_day: '/день',
  per_week: '/неделю',
  per_month: '/месяц',
};

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
  return null;
}

function getOwnerName(listing: ListingCardData): string | null {
  if (listing.owner && 'display_name' in listing.owner) return listing.owner.display_name;
  return null;
}

function getOwnerAvatar(listing: ListingCardData): string | null {
  if (listing.owner && 'avatar_url' in listing.owner) return listing.owner.avatar_url ?? null;
  return null;
}

function getOwnerRole(listing: ListingCardData): string | undefined {
  if (listing.owner && 'role' in listing.owner) return listing.owner.role;
  return undefined;
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
  const ownerName = getOwnerName(listing);
  const ownerAvatar = getOwnerAvatar(listing);
  const ownerRole = getOwnerRole(listing);

  const timeAgo = formatDistanceToNow(new Date(listing.created_at), {
    addSuffix: true,
    locale: ru,
  });

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="bg-white dark:bg-[#1A1A2E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden group block transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(255,107,53,0.45)] hover:border-[#FF6B35]/40"
    >
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-slate-800 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        {!imageUrl && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
            <User className="w-12 h-12 text-gray-300 dark:text-slate-600" />
          </div>
        )}

        <button
          onClick={toggleFavorite}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex items-center justify-center shadow-md ring-1 ring-black/5 hover:scale-110 active:scale-95 transition-all"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-slate-400'
            }`}
          />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {'available' in listing && typeof listing.available === 'boolean' && (
          <div className="absolute bottom-3 left-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm ring-1 ring-inset ${
                listing.available
                  ? 'bg-white/95 text-emerald-700 ring-emerald-200 dark:bg-slate-900/90 dark:text-emerald-400 dark:ring-emerald-500/30'
                  : 'bg-white/95 text-gray-600 ring-gray-200 dark:bg-slate-900/90 dark:text-gray-300 dark:ring-white/15'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  listing.available ? 'bg-emerald-500' : 'bg-gray-400'
                }`}
              />
              {listing.available ? t('listing.available') : t('listing.unavailable')}
            </span>
          </div>
        )}

        {'is_verified' in listing && listing.is_verified && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-emerald-500 text-white shadow-[0_6px_16px_-6px_rgba(16,185,129,0.9)]">
              <BadgeCheck className="w-3.5 h-3.5" />
              Verified
            </span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="font-bold text-[#1A1A2E] dark:text-white text-[15px] leading-snug group-hover:text-[#FF6B35] transition-colors truncate">
          {listing.title}
        </h3>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xl sm:text-[22px] font-extrabold leading-none text-[#FF6B35] tracking-tight">
            {listing.price.toLocaleString('ru-RU')}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
            сом{PRICE_UNIT_LABELS[listing.price_unit] || ''}
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[#FF6B35]" />
          <span className="truncate">
            {cityName}
            {districtName ? `, ${districtName}` : ''}
          </span>
        </div>

        {ownerName && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
              {ownerAvatar ? (
                <img src={ownerAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-3 h-3 m-auto mt-1 text-gray-400 dark:text-slate-500" />
              )}
            </div>
            <span className="truncate">{ownerName}</span>
            {ownerRole === 'ADMIN' && (
              <BadgeCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />
            )}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-slate-300">
            <Star className={`w-3.5 h-3.5 ${rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-slate-600'}`} />
            <span>{rating || '—'}</span>
            {(listing.rating_count ?? 0) > 0 && (
              <span className="text-gray-400 dark:text-slate-500">({listing.rating_count})</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
