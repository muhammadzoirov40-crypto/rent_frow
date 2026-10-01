import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { rentalRequests, messages } from '../../api';
import type { RentalRequest } from '../../api';
import { RequestCard } from '../../pages/RentalRequestsPage';

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

function bucketOf(r: RentalRequest): Exclude<StatusFilter, 'all'> {
  const s = (r.status || 'PENDING').toUpperCase();
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (s === 'COMPLETED' || (s === 'ACCEPTED' && r.end_date < todayISO)) return 'completed';
  if (s === 'CANCELLED' || s === 'REJECTED') return 'cancelled';
  if (s === 'ACCEPTED') return 'confirmed';
  return 'pending';
}

export default function BookingsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['owner-requests'],
    queryFn: () => rentalRequests.getOwnerRequests(1, 100).then((r) => r.items),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['owner-requests'] });

  const acceptMutation = useMutation({
    mutationFn: rentalRequests.accept,
    onSuccess: () => {
      invalidate();
      toast.success(t('rentalRequests.requestAccepted'));
    },
    onError: () => toast.error(t('rentalRequests.failedAccept')),
  });

  const rejectMutation = useMutation({
    mutationFn: rentalRequests.reject,
    onSuccess: () => {
      invalidate();
      setRejectTarget(null);
      toast.success(t('rentalRequests.requestRejected'));
    },
    onError: () => toast.error(t('rentalRequests.failedReject')),
  });

  const messageRenter = async (req: RentalRequest) => {
    try {
      const conv = await messages.createConversation({
        user_id: req.renter_id,
        listing_id: req.listing_id,
      });
      navigate(`/messages?conversation=${conv.id}`);
    } catch {
      toast.error(t('listing.failedToCreate'));
    }
  };

  const counts: Record<Exclude<StatusFilter, 'all'>, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  requests.forEach((r) => { counts[bucketOf(r)] += 1; });
  const rows = requests.filter((r) => filter === 'all' || bucketOf(r) === filter);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('dashboard.bookings.filterAll') },
    { key: 'pending', label: t('booking.pending') },
    { key: 'confirmed', label: t('booking.confirmed') },
    { key: 'completed', label: t('booking.completed') },
    { key: 'cancelled', label: t('booking.cancelled') },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="bookings-section">
      <div className="flex flex-wrap gap-2" data-testid="bookings-filters">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
              filter === f.key
                ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-sm shadow-[#FF6B35]/25'
                : 'bg-white dark:bg-[#1a1d24] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-[#FF6B35]/40'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-75">{f.key === 'all' ? requests.length : counts[f.key]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-12 text-center">
          <CalendarCheck className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="font-bold mb-1">{t('dashboard.bookings.empty')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.bookings.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              type="owner"
              onAccept={(id) => acceptMutation.mutate(id)}
              onReject={(id) => setRejectTarget(id)}
              onMessage={messageRenter}
              isMutating={acceptMutation.isPending || rejectMutation.isPending}
              t={t}
            />
          ))}
        </div>
      )}

      {rejectTarget !== null && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!rejectMutation.isPending) setRejectTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            data-testid="reject-confirm-modal"
            className="bg-white dark:bg-[#1a1d24] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white mb-1">{t('dashboard.bookings.rejectTitle')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('dashboard.bookings.rejectText')}</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={rejectMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={() => rejectMutation.mutate(rejectTarget)}
                disabled={rejectMutation.isPending}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition"
              >
                {t('rentalRequests.reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
