import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listings, reviews, rentalRequests, messages } from '../api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import {
  Heart,
  Star,
  MapPin,
  Calendar,
  Phone,
  MessageSquare,
  ChevronLeft,
  Shield,
  Clock,
  Tag,
  Home,
  FileText,
  AlertTriangle,
  BadgeCheck,
} from 'lucide-react';

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= rating ? 'fill-[#FF6B35] text-[#FF6B35]' : 'fill-gray-200 text-gray-200'}
        />
      ))}
    </div>
  );
}

export default function ListingPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);

  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listings.getOne(Number(id)),
    enabled: !!id,
  });

  useEffect(() => {
    if (listing) {
      setIsFavorited(listing.is_favorited);
    }
  }, [listing]);

  const { data: listingReviews = [] } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviews.getReviews(Number(id)),
    enabled: !!id,
  });

  const { data: similarData } = useQuery({
    queryKey: ['similarListings', listing?.category_id],
    queryFn: () =>
      listings.search({
        category_id: listing?.category_id,
        page_size: 6,
      }),
    enabled: !!listing?.category_id,
  });

  const favoriteMutation = useMutation({
    mutationFn: () => listings.toggleFavorite(Number(id)),
    onSuccess: (data) => {
      setIsFavorited(data.is_favorited);
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      toast.success(data.is_favorited ? t('listing.addedToFavorites') : t('listing.removedFromFavorites'));
    },
  });

  const rentalMutation = useMutation({
    mutationFn: () =>
      rentalRequests.create({
        listing_id: Number(id),
        start_date: startDate,
        end_date: endDate,
      }),
    onSuccess: () => {
      toast.success(t('listing.rentalRequestSent'));
      setStartDate('');
      setEndDate('');
    },
    onError: () => {
      toast.error(t('listing.failedToSend'));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      reviews.createReview(Number(id), { rating: reviewRating, comment: reviewComment }),
    onSuccess: () => {
      toast.success(t('listing.reviewPublished'));
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
    },
    onError: () => {
      toast.error(t('listing.failedToPublish'));
    },
  });

  const messageMutation = useMutation({
    mutationFn: () => {
      if (!listing?.owner_id) throw new Error('No owner');
      return messages.createConversation({
        user_id: listing.owner_id,
        listing_id: Number(id),
      });
    },
    onSuccess: (conv) => {
      navigate(`/messages?conversation=${conv.id}`);
    },
    onError: () => {
      toast.error(t('listing.failedToCreate'));
    },
  });

  if (listingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-[#0a0a1a]">
        <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 dark:bg-[#0a0a1a]">
        <AlertTriangle size={48} className="text-gray-400" />
        <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white">{t('common.error')}</h2>
        <Link to="/" className="text-[#FF6B35] hover:underline font-medium">
          {t('common.back')}
        </Link>
      </div>
    );
  }

  const images = listing.images && listing.images.length > 0
    ? listing.images.map((img) => typeof img === 'string' ? img : img.image_url)
    : [];
  const days = startDate && endDate ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)) : 1;
  const total = days * listing.price;
  const avgRating = listingReviews.length > 0 ? Math.round(listingReviews.reduce((s, r) => s + r.rating, 0) / listingReviews.length) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A1A2E] dark:hover:text-white mb-6 transition-colors">
          <ChevronLeft size={16} />
          {t('listing.back')}
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-[60%] space-y-8">
            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="relative bg-white dark:bg-[#1A1A2E] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 aspect-[4/3]">
                  <img
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
                    {currentImageIndex + 1}/{images.length}
                  </div>
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          i === currentImageIndex
                            ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]/30'
                            : 'border-gray-200 dark:border-white/10 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 aspect-[4/3] flex items-center justify-center">
                <Home size={64} className="text-gray-300" />
              </div>
            )}

            <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-3">
                <FileText size={20} className="text-[#FF6B35]" />
                {t('listing.description')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {listing.description || t('listing.noDescription')}
              </p>
            </div>

            <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <Tag size={20} className="text-[#FF6B35]" />
                {t('listing.characteristics')}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {listing.category_name && (
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('listing.category')}</span>
                    <span className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{listing.category_name}</span>
                  </div>
                )}
                {listing.city_name && (
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('listing.city')}</span>
                    <span className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{listing.city_name}</span>
                  </div>
                )}
                {listing.district_name && (
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('listing.district')}</span>
                    <span className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{listing.district_name}</span>
                  </div>
                )}
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('listing.datePosted')}</span>
                  <span className="text-sm font-semibold text-[#1A1A2E] dark:text-white">
                    {new Date(listing.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('listing.status')}</span>
                  <span className={`text-sm font-semibold ${listing.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {listing.status === 'ACTIVE' ? t('listing.available') : t('listing.unavailable')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-[40%]">
            <div className="sticky top-6 space-y-4">
              <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                <h1 className="text-xl font-bold text-[#1A1A2E] dark:text-white mb-4">{listing.title}</h1>
                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-[#FF6B35]">{listing.price}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">сом / {t('listing.' + listing.price_unit)}</span>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('listing.from')}</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('listing.to')}</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition"
                    />
                  </div>
                </div>

                {startDate && endDate && (
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 mb-4">
                    <span className="text-sm text-gray-500 dark:text-gray-300">
                      {days} {t('listing.days')} x {listing.price} сом ={' '}
                      <span className="font-bold text-[#FF6B35]">{total} сом</span>
                    </span>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error(t('listing.loginRequired'));
                      navigate('/login');
                      return;
                    }
                    if (!startDate || !endDate) {
                      toast.error(t('listing.selectDatesRequired'));
                      return;
                    }
                    rentalMutation.mutate();
                  }}
                  disabled={rentalMutation.isPending || listing.status !== 'ACTIVE'}
                  className="w-full bg-[#FF6B35] hover:bg-[#e55a2b] disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#FF6B35]/20 active:scale-[0.98]"
                >
                  {rentalMutation.isPending ? t('listing.sendingRequest') : t('listing.requestRental')}
                </button>

                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error(t('listing.loginRequired'));
                      navigate('/login');
                      return;
                    }
                    messageMutation.mutate();
                  }}
                  disabled={messageMutation.isPending}
                  className="w-full mt-2 border-2 border-[#1A1A2E] dark:border-white/10 text-[#1A1A2E] dark:text-white hover:bg-[#1A1A2E] hover:text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <MessageSquare size={18} />
                  {t('listing.sendMessage')}
                </button>

                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error(t('listing.loginRequired'));
                      navigate('/login');
                      return;
                    }
                    favoriteMutation.mutate();
                  }}
                  className="w-full mt-2 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-[#FF6B35] hover:text-[#FF6B35] font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Heart size={18} className={isFavorited ? 'fill-[#FF6B35] text-[#FF6B35]' : ''} />
                  {isFavorited ? t('listing.inFavorites') : t('listing.addToFavorites')}
                </button>
              </div>

              {listing.owner && (
                <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-[#FF6B35]/10 flex items-center justify-center overflow-hidden">
                      {listing.owner.avatar_url ? (
                        <img src={listing.owner.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-[#FF6B35]">
                          {listing.owner.display_name?.[0] || 'U'}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#1A1A2E] dark:text-white text-sm">{listing.owner.display_name}</span>
                        {listing.owner.is_verified && <BadgeCheck size={16} className="text-[#FF6B35]" />}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <Calendar size={12} />
                        {t('listing.onSite')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <StarRating rating={avgRating} size={14} />
                    <span className="text-sm text-gray-500 dark:text-gray-400">({listingReviews.length})</span>
                  </div>
                  {listing.owner.phone && (
                    <button
                      onClick={() => setShowPhone(!showPhone)}
                      className="w-full border border-gray-200 dark:border-white/10 text-[#1A1A2E] dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 font-medium py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                    >
                      <Phone size={16} />
                      {showPhone ? listing.owner.phone : t('listing.showPhone')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
            <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-6">
              <Star size={20} className="text-[#FF6B35]" />
              {t('listing.reviews')} ({listingReviews.length})
            </h2>

            {listingReviews.length > 0 && (
              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <span className="text-4xl font-extrabold text-[#FF6B35]">{avgRating}</span>
                <div>
                  <StarRating rating={avgRating} size={20} />
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 block">{listingReviews.length} {t('profile.reviews')}</span>
                </div>
              </div>
            )}

            {listingReviews.length > 0 ? (
              <div className="space-y-4">
                {listingReviews.map((review) => (
                  <div key={review.id} className="border border-gray-100 dark:border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1A1A2E]/10 dark:bg-white/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#1A1A2E] dark:text-white">
                            {review.reviewer?.display_name?.[0] || 'U'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{review.reviewer?.display_name || 'Пользователь'}</span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <StarRating rating={review.rating} size={14} />
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">{t('listing.noReviews')}</p>
            )}

            {isAuthenticated && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/10">
                {!showReviewForm ? (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="text-[#FF6B35] hover:text-[#e55a2b] font-medium text-sm transition-colors"
                  >
                    {t('listing.leaveReview')}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('listing.reviewRating')}</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button key={r} onClick={() => setReviewRating(r)}>
                            <Star
                              size={24}
                              className={`cursor-pointer transition-colors ${
                                r <= reviewRating ? 'fill-[#FF6B35] text-[#FF6B35]' : 'fill-gray-200 text-gray-200 hover:fill-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder={t('listing.reviewPlaceholder')}
                      rows={3}
                      className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!reviewComment.trim()) {
                            toast.error(t('listing.reviewPlaceholder'));
                            return;
                          }
                          reviewMutation.mutate();
                        }}
                        disabled={reviewMutation.isPending}
                        className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white text-sm font-semibold py-2 px-4 rounded-xl transition disabled:opacity-50"
                      >
                        {reviewMutation.isPending ? t('listing.sending') : t('listing.sendReview')}
                      </button>
                      <button
                        onClick={() => {
                          setShowReviewForm(false);
                          setReviewComment('');
                        }}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium py-2 px-4 rounded-xl transition"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {similarData?.items && similarData.items.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white mb-4">{t('listing.similarListings')}</h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {similarData.items.map((item) => (
                <Link
                  key={item.id}
                  to={`/listing/${item.id}`}
                  className="flex-shrink-0 w-64 bg-white dark:bg-[#1A1A2E] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="h-40 bg-gray-100 dark:bg-white/5 overflow-hidden">
                    {item.primary_image ? (
                      <img src={item.primary_image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : null}
                    {!item.primary_image && (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home size={32} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-[#1A1A2E] dark:text-white truncate group-hover:text-[#FF6B35] transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.city_name}</span>
                    </div>
                    <span className="block mt-2 text-lg font-bold text-[#FF6B35]">{item.price} сом</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
