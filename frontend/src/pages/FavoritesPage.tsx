import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Package, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { favorites, listings, type ListingListItem } from '../api';

const PRICE_UNIT_LABELS: Record<string, string> = {
  per_hour: '/час',
  per_day: '/день',
  per_week: '/неделю',
  per_month: '/месяц',
};

export default function FavoritesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: favs = [], isLoading } = useQuery<ListingListItem[]>({
    queryKey: ['favorites'],
    queryFn: () => favorites.getFavorites(),
  });

  const toggleFavMutation = useMutation({
    mutationFn: listings.toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success(t('favorites.removed'));
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1A1A2E] dark:text-white mb-2">{t('favorites.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{t('favorites.count', { count: favs.length })}</p>

        {favs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Heart className="w-16 h-16 text-gray-200 mx-auto mb-5" />
            <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white mb-2">{t('favorites.empty')}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {t('favorites.emptyHint')}
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-[#FF6B35] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#e85d2c] transition shadow-lg shadow-[#FF6B35]/20"
            >
              {t('favorites.findListings')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {favs.map((listing) => (
              <div key={listing.id} className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 group">
                <div className="relative h-48 bg-gray-100">
                  {listing.primary_image ? (
                    <img
                      src={listing.primary_image}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Package className="w-12 h-12" />
                    </div>
                  )}
                  <button
                    onClick={() => toggleFavMutation.mutate(listing.id)}
                    disabled={toggleFavMutation.isPending}
                    className="absolute top-3 right-3 bg-white/90 dark:bg-white/10 backdrop-blur-sm p-2.5 rounded-xl hover:bg-white dark:hover:bg-white/20 transition shadow-md disabled:opacity-50"
                  >
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  </button>
                </div>
                <div className="p-5">
                  <Link
                    to={`/listing/${listing.id}`}
                    className="font-bold text-[#1A1A2E] dark:text-white hover:text-[#FF6B35] transition text-lg block truncate"
                  >
                    {listing.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {listing.city_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {listing.city_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
                    <span className="text-xl font-bold text-[#FF6B35]">
                      {listing.price.toLocaleString()} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">сом{PRICE_UNIT_LABELS[listing.price_unit] || ''}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
