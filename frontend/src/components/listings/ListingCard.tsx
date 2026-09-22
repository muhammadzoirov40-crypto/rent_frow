import { Link } from 'react-router-dom';
import { MapPin, Star, Clock, User, Heart, BadgeCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { listings, type Listing, type ListingListItem } from '../../api/index';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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
  if (listing.owner && 'avatar_url' in listing.owner) return listing.owner.avatar_url;
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
      className="bg-white dark:bg-[#1A1A2E] rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden hover:shadow-lg transition-all duration-300 group block"
    >
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-slate-800 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-slate-700 transition-all"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-slate-400'
            }`}
          />
        </button>

        {'is_verified' in listing && listing.is_verified && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-lg">
              <BadgeCheck className="w-3 h-3" />
              Verified
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-[#1A1A2E] dark:text-white text-sm leading-snug group-hover:text-[#FF6B35] transition-colors truncate">
          {listing.title}
        </h3>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-lg font-extrabold text-[#FF6B35]">
            {listing.price.toLocaleString('ru-RU')}
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            сом{PRICE_UNIT_LABELS[listing.price_unit] || ''}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
          <MapPin className="w-3 h-3 flex-shrink-0" />
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
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
            <Star className="w-3 h-3" />
            <span>{rating || '—'}</span>
            {(listing.rating_count ?? 0) > 0 && (
              <span className="text-gray-400 dark:text-slate-500">({listing.rating_count})</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
