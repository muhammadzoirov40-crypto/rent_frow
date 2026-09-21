import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Mail, Phone, Star, Calendar, Camera, Save, Loader2,
  Heart, ListChecks, Settings, Edit2, Trash2, MapPin, Clock,
  Check, X, ChevronRight, Package
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { auth, listings, favorites, rentalRequests } from '../api';
import useAuthStore from '../store/authStore';
import type { Listing, RentalRequest } from '../api';

type Tab = 'listings' | 'favorites' | 'my-requests' | 'owner-requests' | 'settings';

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'pending', bg: 'bg-amber-100', text: 'text-amber-700' },
  accepted: { label: 'accepted', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rejected: { label: 'rejected', bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { label: 'cancelled', bg: 'bg-gray-100', text: 'text-gray-600' },
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, updateUser, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('listings');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.display_name || '');
  const [editPhone, setEditPhone] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: auth.getMe,
  });

  const meUser = meData || user;

  const { data: userListings = [] } = useQuery({
    queryKey: ['owner-listings'],
    queryFn: listings.getOwnerListings,
  });

  const { data: favs = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: favorites.getFavorites,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-requests'],
    queryFn: rentalRequests.getMyRequests,
  });

  const { data: ownerRequests = [] } = useQuery({
    queryKey: ['owner-requests'],
    queryFn: rentalRequests.getOwnerRequests,
  });

  const updateProfileMutation = useMutation({
    mutationFn: auth.updateProfile,
    onSuccess: (data) => {
      updateUser(data as any);
      setIsEditing(false);
      toast.success(t('profile.profileUpdated'));
    },
    onError: () => toast.error(t('profile.failedUpdate')),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: auth.uploadAvatar,
    onSuccess: (data) => {
      updateUser({ avatar_url: data.avatar_url });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('profile.avatarUpdated'));
    },
    onError: () => toast.error(t('profile.failedAvatar')),
  });

  const deleteListingMutation = useMutation({
    mutationFn: listings.deleteListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-listings'] });
      toast.success(t('profile.deleted'));
    },
    onError: () => toast.error(t('profile.failedToDelete')),
  });

  const toggleFavMutation = useMutation({
    mutationFn: listings.toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: rentalRequests.cancelRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      toast.success(t('profile.requestCancelled'));
    },
    onError: () => toast.error(t('profile.failedAction')),
  });

  const acceptRequestMutation = useMutation({
    mutationFn: rentalRequests.acceptRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-requests'] });
      toast.success(t('profile.requestAccepted'));
    },
    onError: () => toast.error(t('profile.failedAction')),
  });

  const rejectRequestMutation = useMutation({
    mutationFn: rentalRequests.rejectRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-requests'] });
      toast.success(t('profile.requestRejected'));
    },
    onError: () => toast.error(t('profile.failedAction')),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatarMutation.mutate(file);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ display_name: editName, phone: editPhone } as any);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'listings', label: t('profile.tabs.myListings'), icon: Package, count: userListings.length },
    { id: 'favorites', label: t('profile.tabs.favorites'), icon: Heart, count: favs.length },
    { id: 'my-requests', label: t('profile.tabs.myRequests'), icon: ListChecks, count: myRequests.length },
    { id: 'owner-requests', label: t('profile.tabs.ownerRequests'), icon: ChevronRight, count: ownerRequests.length },
    { id: 'settings', label: t('profile.tabs.settings'), icon: Settings },
  ];

  if (meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-[#0a0a1a]">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group" onClick={() => avatarInputRef.current?.click()}>
              {meUser?.avatar_url ? (
                <img
                  src={meUser.avatar_url}
                  alt={meUser.display_name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-white/10 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#e85d2c] flex items-center justify-center shadow-lg">
                  <span className="text-white text-3xl font-bold">
                    {(meUser?.display_name || meUser?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-bold text-[#1A1A2E] dark:text-white border-b-2 border-[#FF6B35] outline-none bg-transparent w-full max-w-xs"
                  placeholder={t('profile.fullName')}
                />
              ) : (
                <h1 className="text-2xl font-bold text-[#1A1A2E] dark:text-white">
                  {meUser?.display_name || 'Без имени'}
                </h1>
              )}
              <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                <Mail className="w-3.5 h-3.5" />
                {meUser?.email}
              </p>
              {isEditing && (
                <div className="mt-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder={t('profile.fullName')}
                    className="text-sm border-b border-gray-300 dark:border-white/20 outline-none bg-transparent dark:text-white"
                  />
                </div>
              )}
              {!isEditing && meUser?.phone && (
                <p className="text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5 justify-center sm:justify-start text-sm">
                  <Phone className="w-3.5 h-3.5" />
                  {meUser.phone}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {t('profile.reviews', { count: 0 })}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {meUser?.created_at
                    ? new Date(meUser.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })
                    : 'Недавно'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-1.5 bg-[#FF6B35] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#e85d2c] transition disabled:opacity-50"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {t('profile.saveAvatar')}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                  >
                    {t('profile.cancel')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setEditName(meUser?.display_name || '');
                    setEditPhone(meUser?.phone || '');
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  {t('profile.editProfile')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 bg-white dark:bg-[#1A1A2E] rounded-xl p-1 shadow-sm border border-gray-100 dark:border-white/10 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'listings' && (
          <div className="space-y-4">
            {userListings.length === 0 ? (
              <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#1A1A2E] dark:text-white mb-1">{t('profile.myListingsEmpty')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('profile.myListingsEmptyHint')}</p>
                <Link
                  to="/create-listing"
                  className="inline-flex items-center gap-2 bg-[#FF6B35] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e85d2c] transition"
                >
                  {t('profile.createListing')}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userListings.map((listing) => (
                  <div key={listing.id} className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition">
                    <div className="relative h-40 bg-gray-100 dark:bg-white/5">
                      {listing.images?.[0] ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-1.5">
                        <Link
                          to={`/create-listing?edit=${listing.id}`}
                          className="bg-white/90 dark:bg-white/10 backdrop-blur-sm p-2 rounded-lg hover:bg-white dark:hover:bg-white/20 transition shadow-sm"
                        >
                          <Edit2 className="w-4 h-4 text-[#1A1A2E] dark:text-white" />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm(t('profile.deleteListing'))) {
                              deleteListingMutation.mutate(listing.id);
                            }
                          }}
                          className="bg-white/90 dark:bg-white/10 backdrop-blur-sm p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition shadow-sm"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-[#1A1A2E] dark:text-white truncate">{listing.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {listing.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {listing.city.name}
                          </span>
                        )}
                        <span className="font-bold text-[#FF6B35]">
                          {listing.price.toLocaleString()} {listing.currency || 'сомони'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          listing.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {listing.is_available ? t('profile.available') : t('profile.unavailable')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="space-y-4">
            {favs.length === 0 ? (
              <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#1A1A2E] dark:text-white mb-1">{t('profile.favoritesEmpty')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('profile.favoritesEmptyHint')}</p>
                <Link
                  to="/search"
                  className="inline-flex items-center gap-2 bg-[#FF6B35] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e85d2c] transition"
                >
                  {t('profile.findListings')}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favs.map((listing) => (
                  <div key={listing.id} className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition">
                    <div className="relative h-40 bg-gray-100 dark:bg-white/5">
                      {listing.images?.[0] ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="w-10 h-10" />
                        </div>
                      )}
                      <button
                        onClick={() => toggleFavMutation.mutate(listing.id)}
                        className="absolute top-3 right-3 bg-white/90 dark:bg-white/10 backdrop-blur-sm p-2 rounded-lg hover:bg-white dark:hover:bg-white/20 transition shadow-sm"
                      >
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      </button>
                    </div>
                    <div className="p-4">
                      <Link to={`/listing/${listing.id}`} className="font-semibold text-[#1A1A2E] dark:text-white hover:text-[#FF6B35] transition truncate block">
                        {listing.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {listing.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {listing.city.name}
                          </span>
                        )}
                        <span className="font-bold text-[#FF6B35]">
                          {listing.price.toLocaleString()} {listing.currency || 'сомони'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-requests' && (
          <div className="space-y-3">
            {myRequests.length === 0 ? (
              <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
                <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#1A1A2E] dark:text-white mb-1">{t('profile.requestsEmpty')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('profile.requestsEmptyHint')}</p>
                <Link
                  to="/search"
                  className="inline-flex items-center gap-2 bg-[#FF6B35] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e85d2c] transition"
                >
                  {t('profile.findEquipment')}
                </Link>
              </div>
            ) : (
              myRequests.map((req) => {
                const statusKey = req.status as string;
                const status = statusConfig[statusKey] || statusConfig.pending;
                return (
                  <div key={req.id} className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-[#1A1A2E] dark:text-white truncate">
                            {req.listing?.title || `Объявление #${req.listing_id}`}
                          </h3>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.bg} ${status.text}`}>
                            {t(`profile.status.${statusKey}`)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(req.start_date).toLocaleDateString('ru-RU')} — {new Date(req.end_date).toLocaleDateString('ru-RU')}
                          </span>
                          {req.listing?.price && (
                            <span className="font-bold text-[#FF6B35]">
                              {req.listing.price.toLocaleString()} {req.listing.currency || 'сомони'}/день
                            </span>
                          )}
                        </div>
                        {req.message && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5 rounded-lg p-3">{req.message}</p>
                        )}
                      </div>
                      {req.status === 'pending' && (
                        <button
                          onClick={() => cancelRequestMutation.mutate(req.id)}
                          disabled={cancelRequestMutation.isPending}
                          className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-50 whitespace-nowrap"
                        >
                          {t('profile.cancel')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'owner-requests' && (
          <div className="space-y-3">
            {ownerRequests.length === 0 ? (
              <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
                <ChevronRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#1A1A2E] dark:text-white mb-1">{t('profile.ownerRequestsEmpty')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.ownerRequestsEmptyHint')}</p>
              </div>
            ) : (
              ownerRequests.map((req) => {
                const statusKey = req.status as string;
                const status = statusConfig[statusKey] || statusConfig.pending;
                return (
                  <div key={req.id} className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-[#1A1A2E] dark:text-white truncate">
                            {req.listing?.title || `Объявление #${req.listing_id}`}
                          </h3>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.bg} ${status.text}`}>
                            {t(`profile.status.${statusKey}`)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          От: <span className="font-medium text-gray-700 dark:text-gray-300">{req.requester?.display_name || req.requester?.email || `Пользователь #${req.requester_id}`}</span>
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(req.start_date).toLocaleDateString('ru-RU')} — {new Date(req.end_date).toLocaleDateString('ru-RU')}
                          </span>
                          {req.listing?.price && (
                            <span className="font-bold text-[#FF6B35]">
                              {req.listing.price.toLocaleString()} {req.listing.currency || 'сомони'}/день
                            </span>
                          )}
                        </div>
                        {req.message && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5 rounded-lg p-3">{req.message}</p>
                        )}
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2 whitespace-nowrap">
                          <button
                            onClick={() => acceptRequestMutation.mutate(req.id)}
                            disabled={acceptRequestMutation.isPending}
                            className="flex items-center gap-1 text-sm bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg font-medium hover:bg-emerald-600 transition disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            {t('profile.requestAccepted')}
                          </button>
                          <button
                            onClick={() => rejectRequestMutation.mutate(req.id)}
                            disabled={rejectRequestMutation.isPending}
                            className="flex items-center gap-1 text-sm bg-red-500 text-white px-3.5 py-1.5 rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            {t('profile.requestRejected')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-[#1A1A2E] dark:text-white text-lg">{t('profile.accountSettings')}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div>
                  <p className="font-medium text-[#1A1A2E] dark:text-white">{t('profile.emailLabel')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{meUser?.email}</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">{t('profile.confirmed')}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div>
                  <p className="font-medium text-[#1A1A2E] dark:text-white">{t('profile.roleLabel')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{meUser?.role === 'ADMIN' ? t('profile.admin') : t('profile.user')}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-4 border-2 border-red-200 text-red-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            >
              {t('profile.signOut')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
