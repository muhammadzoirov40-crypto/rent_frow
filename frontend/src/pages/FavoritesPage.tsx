import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { favorites, type ListingListItem } from '../api';
import BackButton from '../components/ui/BackButton';
import ListingGrid from '../components/listings/ListingGrid';

export default function FavoritesPage() {
  const { t } = useTranslation();

  const { data: favs = [], isLoading } = useQuery<ListingListItem[]>({
    queryKey: ['favorites'],
    queryFn: () => favorites.getFavorites(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <BackButton className="mb-4" />
        <h1 className="text-3xl font-bold text-[#1A1A2E] dark:text-white mb-2">{t('favorites.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{t('favorites.count', { count: favs.length })}</p>

        {favs.length === 0 ? (
          <div className="glass-section dark:border-white/10 rounded-2xl border border-gray-100 p-12 sm:p-16 text-center">
            <div className="w-20 h-20 rounded-full bg-[rgb(var(--accent-rgb)/0.1)] flex items-center justify-center mx-auto mb-5">
              <Heart className="w-10 h-10 text-[var(--accent)]" />
            </div>
            <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white mb-2">{t('favorites.empty')}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {t('favorites.emptyHint')}
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[var(--accent-hover)] transition shadow-lg shadow-[rgb(var(--accent-rgb)/0.2)]"
            >
              {t('favorites.findListings')}
            </Link>
          </div>
        ) : (
          // The same card the search grid uses: the photo with its chip and
          // the heart, city, rating and the review count — nothing waits
          // for the listing to be opened.
          <ListingGrid listings={favs} loading={false} twoOnPhone />
        )}
      </div>
    </div>
  );
}
