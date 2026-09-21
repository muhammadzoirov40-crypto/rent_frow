import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Clock, Check, X, Loader2, ListChecks,
  ChevronRight, MessageSquare, Package, User, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rentalRequests } from '../api';
import type { RentalRequest } from '../api';

type Tab = 'my-requests' | 'owner-requests';

function RequestCard({
  req,
  type,
  onCancel,
  onAccept,
  onReject,
  isMutating,
  t,
}: {
  req: RentalRequest;
  type: 'renter' | 'owner';
  onCancel?: (id: number) => void;
  onAccept?: (id: number) => void;
  onReject?: (id: number) => void;
  isMutating?: boolean;
  t: (key: string) => string;
}) {
  const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    pending: { label: t('admin.pending'), bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-400' },
    accepted: { label: t('admin.accepted'), bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-400' },
    rejected: { label: t('admin.rejected'), bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-400' },
    cancelled: { label: t('admin.cancelled'), bg: 'bg-gray-100 dark:bg-white/5', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  };

  const status = statusConfig[req.status] || statusConfig.pending;

  return (
    <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-5 sm:p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden flex-shrink-0">
          {req.listing?.images?.[0] ? (
            <img src={req.listing.images[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
              <Package className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/listing/${req.listing_id}`}
                className="font-bold text-[#1A1A2E] dark:text-white hover:text-[#FF6B35] transition block truncate text-base"
              >
                {req.listing?.title || `#${req.listing_id}`}
              </Link>
              {type === 'owner' && req.requester && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {req.requester.display_name || req.requester.email}
                </p>
              )}
              {type === 'renter' && req.owner && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {t('rentalRequests.owner')} {req.owner.display_name || req.owner.email}
                </p>
              )}
            </div>
            <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0 ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(req.start_date).toLocaleDateString('ru-RU')} — {new Date(req.end_date).toLocaleDateString('ru-RU')}
            </span>
            {req.listing?.price != null && (
              <span className="font-bold text-[#FF6B35]">
                {req.listing.price.toLocaleString()} {req.listing.currency || 'сомони'}/день
              </span>
            )}
            <span className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              {new Date(req.created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>

          {req.message && (
            <div className="mt-3 flex items-start gap-2 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
              <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{req.message}</p>
            </div>
          )}

          {req.status === 'pending' && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
              {type === 'renter' && onCancel && (
                <button
                  onClick={() => onCancel(req.id)}
                  disabled={isMutating}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  {t('rentalRequests.cancelRequest')}
                </button>
              )}
              {type === 'owner' && onAccept && onReject && (
                <>
                  <button
                    onClick={() => onAccept(req.id)}
                    disabled={isMutating}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl transition shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {t('rentalRequests.accept')}
                  </button>
                  <button
                    onClick={() => onReject(req.id)}
                    disabled={isMutating}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-4 py-2 rounded-xl transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    {t('rentalRequests.reject')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RentalRequestsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('my-requests');

  const { data: myRequests = [], isLoading: myLoading } = useQuery({
    queryKey: ['my-requests'],
    queryFn: rentalRequests.getMyRequests,
  });

  const { data: ownerRequests = [], isLoading: ownerLoading } = useQuery({
    queryKey: ['owner-requests'],
    queryFn: rentalRequests.getOwnerRequests,
  });

  const cancelMutation = useMutation({
    mutationFn: rentalRequests.cancelRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      toast.success(t('rentalRequests.requestCancelled'));
    },
    onError: () => toast.error(t('rentalRequests.failedCancel')),
  });

  const acceptMutation = useMutation({
    mutationFn: rentalRequests.acceptRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-requests'] });
      toast.success(t('rentalRequests.requestAccepted'));
    },
    onError: () => toast.error(t('rentalRequests.failedAccept')),
  });

  const rejectMutation = useMutation({
    mutationFn: rentalRequests.rejectRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-requests'] });
      toast.success(t('rentalRequests.requestRejected'));
    },
    onError: () => toast.error(t('rentalRequests.failedReject')),
  });

  const isLoading = activeTab === 'my-requests' ? myLoading : ownerLoading;
  const requests = activeTab === 'my-requests' ? myRequests : ownerRequests;
  const isMutating = cancelMutation.isPending || acceptMutation.isPending || rejectMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A2E] dark:text-white">{t('rentalRequests.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('rentalRequests.subtitle')}</p>
        </div>

        <div className="flex gap-1 bg-white dark:bg-[#1A1A2E] rounded-xl p-1 shadow-sm border border-gray-100 dark:border-white/10 mb-6">
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition ${
              activeTab === 'my-requests'
                ? 'bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            {t('rentalRequests.myRequests')}
            {myRequests.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'my-requests' ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 text-gray-500'
              }`}>
                {myRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('owner-requests')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition ${
              activeTab === 'owner-requests'
                ? 'bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            {t('rentalRequests.ownerRequests')}
            {ownerRequests.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'owner-requests' ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 text-gray-500'
              }`}>
                {ownerRequests.length}
              </span>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35] mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('common.loading')}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-16 text-center">
            <AlertCircle className="w-14 h-14 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white mb-1">
              {activeTab === 'my-requests' ? t('rentalRequests.emptyMy') : t('rentalRequests.emptyOwner')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
              {activeTab === 'my-requests'
                ? t('rentalRequests.emptyMyHint')
                : t('rentalRequests.emptyOwnerHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                type={activeTab === 'my-requests' ? 'renter' : 'owner'}
                onCancel={(id) => cancelMutation.mutate(id)}
                onAccept={(id) => acceptMutation.mutate(id)}
                onReject={(id) => rejectMutation.mutate(id)}
                isMutating={isMutating}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
