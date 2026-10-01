import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
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
  ChevronRight,
  Shield,
  Clock,
  Tag,
  Home,
  FileText,
  AlertTriangle,
  BadgeCheck,
  Trash2,
  Pencil,
  Maximize2,
  X,
  Check,
} from 'lucide-react';
import { formatDate } from '../utils/dates';
import { previousPath } from '../utils/navHistory';
import AvailabilityCalendar from '../components/listings/AvailabilityCalendar';

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
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const touchX = useRef<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

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

  const galleryLen = listing?.images?.length ?? 0;
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
      if (galleryLen > 0 && e.key === 'ArrowRight') {
        setCurrentImageIndex((i) => (i + 1) % galleryLen);
      }
      if (galleryLen > 0 && e.key === 'ArrowLeft') {
        setCurrentImageIndex((i) => (i - 1 + galleryLen) % galleryLen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, galleryLen]);

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
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
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
      setBookingSuccess(true);
      setShowConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['owner-requests'] });
    },
    onError: (error: any) => {
      setShowConfirm(false);
      const detail = error?.response?.data?.detail;
      const messages: Record<string, string> = {
        'Cannot rent your own listing': t('listing.ownListing'),
        'Listing is not available for the selected dates': t('listing.datesTaken'),
        'End date must be after start date': t('listing.endAfterStart'),
        'Listing not found': t('listing.listingNotFound'),
      };
      if (typeof detail === 'string' && messages[detail]) {
        toast.error(messages[detail]);
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else if (Array.isArray(detail)) {
        toast.error(detail.map((e: any) => e.msg).join(', '));
      } else {
        toast.error(t('listing.failedToSend'));
      }
    },
  });

  const requestRental = () => {
    if (!isAuthenticated) {
      toast.error(t('listing.loginRequired'));
      navigate('/login');
      return;
    }
    if (!startDate || !endDate) {
      toast.error(t('listing.selectDatesRequired'));
      return;
    }
    setShowConfirm(true);
  };

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
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else if (Array.isArray(detail)) {
        toast.error(detail.map((e: any) => e.msg).join(', '));
      } else {
        toast.error(t('listing.failedToPublish'));
      }
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: number) => reviews.deleteReview(reviewId),
    onSuccess: () => {
      toast.success(t('listing.reviewDeleted'));
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error(t('listing.failedToDeleteReview'));
      }
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
  const subtotal = (() => {
    const u = listing.price_unit;
    if (u === 'per_hour') return listing.price * days * 24;
    if (u === 'per_week') return listing.price * (days / 7);
    if (u === 'per_month') return listing.price * (days / 30);
    return listing.price * days;
  })();
  const total = Math.round(subtotal);
  const isOwner = isAuthenticated && user?.id === listing.owner_id;
  const avgRating = listingReviews.length > 0 ? Math.round(listingReviews.reduce((s, r) => s + r.rating, 0) / listingReviews.length) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate(previousPath(location.pathname) || '/')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A1A2E] dark:hover:text-white mb-6 transition-colors">
          <ChevronLeft size={16} />
          {t('listing.back')}
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-[60%] space-y-8">
            {images.length > 0 ? (
              <div className="space-y-3">
                <div
                  className="relative bg-white dark:bg-[#1A1A2E] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 aspect-[4/3] touch-pan-y"
                  onTouchStart={(e) => {
                    touchX.current = e.touches[0].clientX;
                  }}
                  onTouchEnd={(e) => {
                    if (touchX.current == null || images.length < 2) return;
                    const dx = e.changedTouches[0].clientX - touchX.current;
                    if (Math.abs(dx) > 40) {
                      setCurrentImageIndex((i) =>
                        dx < 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length,
                      );
                    }
                    touchX.current = null;
                  }}
                >
                  <img
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className="bg-black/65 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
                      {currentImageIndex + 1}/{images.length}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFullscreen(true)}
                      aria-label={t('listing.fullscreen')}
                      className="w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/80 transition"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous image"
                        onClick={() => setCurrentImageIndex((i) => (i - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-black/60 text-gray-800 dark:text-white flex items-center justify-center shadow-md hover:scale-105 transition hidden sm:flex"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next image"
                        onClick={() => setCurrentImageIndex((i) => (i + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-black/60 text-gray-800 dark:text-white flex items-center justify-center shadow-md hover:scale-105 transition hidden sm:flex"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        aria-label={`${i + 1}/${images.length}`}
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
                    {formatDate(listing.created_at)}
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
            <div id="booking-card" className="sticky top-6 space-y-4">
              <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                <h1 className="text-xl font-bold text-[#1A1A2E] dark:text-white mb-3">{listing.title}</h1>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {listing.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/70 text-white ring-1 ring-white/15">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {t('listing.verified')}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {(listing.average_rating ?? 0) > 0 ? listing.average_rating.toFixed(1) : '—'}
                    <span className="font-normal text-gray-400 dark:text-gray-500">
                      · {listingReviews.length} {t('listing.reviews')}
                    </span>
                  </span>
                </div>

                {(listing.city_name || listing.district_name) && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <MapPin className="w-4 h-4 shrink-0 text-[#FF6B35]" />
                    <span className="truncate">
                      {listing.city_name}
                      {listing.district_name ? `, ${listing.district_name}` : ''}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-[#FF6B35]">{listing.price.toLocaleString('ru-RU')}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
                    {t('common.somoni')} / {t('listing.' + listing.price_unit)}
                  </span>
                </div>

                {bookingSuccess && !isOwner && user?.role !== 'ADMIN' ? (
                  <div className="text-center py-4" data-testid="booking-success">
                    <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mb-3">
                      <Check className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="font-bold text-[#1A1A2E] dark:text-white mb-1">{t('booking.successTitle')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('booking.successText')}</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => navigate('/rental-requests')}
                        className="w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-[#FF6B35]/20 flex items-center justify-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        {t('booking.viewBooking')}
                      </button>
                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            navigate('/login');
                            return;
                          }
                          messageMutation.mutate();
                        }}
                        disabled={messageMutation.isPending}
                        className="w-full border-2 border-[#1A1A2E] dark:border-white/10 text-[#1A1A2E] dark:text-white hover:bg-[#1A1A2E] hover:text-white font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <MessageSquare size={16} />
                        {t('booking.messageOwner')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                <div className="mb-4">
                  <AvailabilityCalendar
                    listingId={Number(id)}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(s, e) => {
                      setStartDate(s);
                      setEndDate(e);
                    }}
                  />
                </div>

                {startDate && endDate && (
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 mb-4 space-y-2 text-sm" data-testid="booking-summary">
                    <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-white/10">
                      <span className="font-bold text-[#1A1A2E] dark:text-white truncate">{listing.title}</span>
                      {listing.owner?.display_name && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{listing.owner.display_name}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                      <span>{t('booking.start')}</span>
                      <span className="font-semibold text-[#1A1A2E] dark:text-white">{formatDate(startDate)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                      <span>{t('booking.end')}</span>
                      <span className="font-semibold text-[#1A1A2E] dark:text-white">{formatDate(endDate)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                      <span>{t('booking.duration')}</span>
                      <span className="font-semibold text-[#1A1A2E] dark:text-white">
                        {days} {t('listing.days')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-white/10">
                      <span>
                        {listing.price.toLocaleString('ru-RU')} {t('common.somoni')} × {days}
                      </span>
                      <span className="font-semibold text-[#1A1A2E] dark:text-white">
                        {Math.round(subtotal).toLocaleString('ru-RU')} {t('common.somoni')}
                      </span>
                    </div>
                    {(listing.deposit ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                        <span>{t('booking.deposit')}</span>
                        <span className="font-semibold text-[#1A1A2E] dark:text-white">
                          {listing.deposit.toLocaleString('ru-RU')} {t('common.somoni')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/10">
                      <span className="font-bold text-[#1A1A2E] dark:text-white">{t('booking.total')}</span>
                      <span className="text-lg font-extrabold text-[#FF6B35]">
                        {total.toLocaleString('ru-RU')} {t('common.somoni')}
                      </span>
                    </div>
                  </div>
                )}

                {(isOwner || user?.role === 'ADMIN') ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate(`/create-listing?edit=${listing.id}`)}
                      className="w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#FF6B35]/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Pencil size={16} />
                      {t('listing.editListing')}
                    </button>
                    <div className="w-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm font-medium py-3 px-4 rounded-xl text-center">
                      {t('listing.ownListingHint')}
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={requestRental}
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
                  </>
                )}
                  </>
                )}

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
                {listingReviews.map((review) => {
                  const canDelete =
                    isAuthenticated &&
                    (user?.role === 'ADMIN' || review.customer_id === user?.id);

                  return (
                    <div key={review.id} className="border border-gray-100 dark:border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#1A1A2E]/10 dark:bg-white/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-[#1A1A2E] dark:text-white">
                              {(review.customer_name || 'U')[0]}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{review.customer_name || 'Пользователь'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm(t('listing.confirmDeleteReview'))) {
                                  deleteReviewMutation.mutate(review.id);
                                }
                              }}
                              disabled={deleteReviewMutation.isPending}
                              className="text-red-500 hover:text-red-600 transition disabled:opacity-50"
                              title={t('listing.deleteReview')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <StarRating rating={review.rating} size={14} />
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{review.comment}</p>
                    </div>
                  );
                })}
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
            <div className="flex flex-wrap gap-4 pb-4">
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

      {showConfirm && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!rentalMutation.isPending) setShowConfirm(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-booking-title"
            data-testid="confirm-booking-modal"
            className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-booking-title" className="text-lg font-bold text-[#1A1A2E] dark:text-white mb-1">
              {t('booking.confirmTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('booking.confirmText')}</p>
            <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 space-y-1.5 text-sm mb-5">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">{t('booking.start')}</span>
                <span className="font-semibold text-[#1A1A2E] dark:text-white">{formatDate(startDate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">{t('booking.end')}</span>
                <span className="font-semibold text-[#1A1A2E] dark:text-white">{formatDate(endDate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">{t('booking.duration')}</span>
                <span className="font-semibold text-[#1A1A2E] dark:text-white">
                  {days} {t('listing.days')}
                </span>
              </div>
              <div className="flex justify-between gap-4 pt-1.5 border-t border-gray-200 dark:border-white/10">
                <span className="font-bold text-[#1A1A2E] dark:text-white">{t('booking.total')}</span>
                <span className="font-extrabold text-[#FF6B35]">
                  {total.toLocaleString('ru-RU')} {t('common.somoni')}
                </span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={rentalMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => rentalMutation.mutate()}
                disabled={rentalMutation.isPending}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#FF6B35] hover:bg-[#e55a2b] disabled:opacity-60 transition flex items-center gap-2"
              >
                {rentalMutation.isPending ? t('listing.sendingRequest') : t('booking.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {fullscreen && images.length > 0 && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
          onClick={() => setFullscreen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <span className="text-white text-sm font-semibold">
              {currentImageIndex + 1}/{images.length}
            </span>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={(e) => {
                e.stopPropagation();
                setFullscreen(false);
              }}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="flex-1 flex items-center justify-center gap-3 px-3 pb-6 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {images.length > 1 && (
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => setCurrentImageIndex((i) => (i - 1 + images.length) % images.length)}
                className="w-10 h-10 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <img
              src={images[currentImageIndex]}
              alt={listing.title}
              className="max-h-full max-w-full object-contain rounded-lg"
            />
            {images.length > 1 && (
              <button
                type="button"
                aria-label="Next image"
                onClick={() => setCurrentImageIndex((i) => (i + 1) % images.length)}
                className="w-10 h-10 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {!isOwner && listing.status === 'ACTIVE' && (
        <div className="lg:hidden fixed left-0 right-0 bottom-20 z-40 px-4">
          <div className="bg-white dark:bg-[#151528] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl shadow-black/10 px-3 py-2.5 flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-lg font-extrabold text-[#FF6B35] leading-none">
                {listing.price.toLocaleString('ru-RU')}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                сом / {t('listing.' + listing.price_unit)}
              </div>
            </div>
            <button
              onClick={requestRental}
              disabled={rentalMutation.isPending}
              className="flex-1 bg-[#FF6B35] hover:bg-[#e55a2b] disabled:bg-gray-300 text-white text-sm font-semibold py-3 rounded-xl transition active:scale-[0.98]"
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
              aria-label={t('listing.sendMessage')}
              className="w-11 h-11 shrink-0 border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-center text-[#1A1A2E] dark:text-white"
            >
              <MessageSquare size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
