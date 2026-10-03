import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Clock, Check, X, Loader2, ListChecks,
  ChevronRight, MessageSquare, Package, User, AlertCircle, Eye, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rentalRequests, listings, messages, payments } from '../api';
import type { RentalRequest, PaymentRecord } from '../api';
import BackButton from '../components/ui/BackButton';
import { formatDate } from '../utils/dates';

import { formatAmount } from '../utils/format';
type Tab = 'my-requests' | 'owner-requests';
type Filter = 'upcoming' | 'pending' | 'completed' | 'cancelled';

function bucketOf(r: RentalRequest): Filter {
  const s = (r.status || 'PENDING').toUpperCase();
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (s === 'COMPLETED' || (s === 'ACCEPTED' && r.end_date < todayISO)) return 'completed';
  if (s === 'CANCELLED' || s === 'REJECTED') return 'cancelled';
  if (s === 'ACCEPTED') return 'upcoming';
  return 'pending';
}

export function RequestCard({
  req,
  type,
  onCancel,
  onAccept,
  onReject,
  onMessage,
  isMutating,
  t,
}: {
  req: RentalRequest;
  type: 'renter' | 'owner';
  onCancel?: (id: number) => void;
  onAccept?: (id: number) => void;
  onReject?: (id: number) => void;
  onMessage?: (req: RentalRequest) => void;
  isMutating?: boolean;
  t: (key: string) => string;
}) {
  const { data: listingInfo } = useQuery({
    queryKey: ['listing-mini', req.listing_id],
    queryFn: () => listings.getOne(req.listing_id),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const image = listingInfo?.images?.[0]?.image_url ?? null;
  const dayPrice = listingInfo ? `${formatAmount(listingInfo.price)} ${t('common.somoni')} / ${t('listing.' + listingInfo.price_unit)}` : null;

  const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    PENDING: { label: t('booking.pending'), bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-400' },
    ACCEPTED: { label: t('booking.confirmed'), bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-400' },
    REJECTED: { label: t('booking.rejected'), bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-400' },
    CANCELLED: { label: t('booking.cancelled'), bg: 'bg-gray-100 dark:bg-white/5', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
    COMPLETED: { label: t('booking.completed'), bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-400' },
  };

  const statusKey = (req.status || 'PENDING').toUpperCase();
  const status = statusConfig[statusKey] || statusConfig.PENDING;
  const canManage = statusKey === 'PENDING' || statusKey === 'ACCEPTED';

  // Payment lives on the accepted request itself: the renter pays once the
  // owner has said yes, the owner then marks the money as received.
  const queryClient = useQueryClient();
  const payable = statusKey === 'ACCEPTED';

  const { data: requestPayments = [], isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-for-request', req.id],
    queryFn: () => payments.forRequest(req.id),
    enabled: payable,
    staleTime: 30_000,
    retry: 1,
  });
  const linePayment = (kind: 'BOOKING' | 'DEPOSIT') =>
    requestPayments.find((p) => (p.payment_type ?? 'BOOKING') === kind) ?? null;

  const paymentError = (error: any) => {
    const detail = error?.response?.data?.detail;
    return typeof detail === 'string' && detail ? detail : t('payment.failed');
  };

  const depositAmount = Number(req.deposit_amount ?? 0);
  // Rent and the refundable deposit are two separate lines: the listing page
  // shows both, so both are collectable — and each keeps its own status, so
  // paying the rent does not lock the deposit out.
  const paymentLines: { kind: 'BOOKING' | 'DEPOSIT'; label: string; amount: number }[] = [
    { kind: 'BOOKING', label: t('payment.rent'), amount: Number(req.total_price ?? 0) },
    ...(depositAmount > 0
      ? [{ kind: 'DEPOSIT' as const, label: t('payment.deposit'), amount: depositAmount }]
      : []),
  ];

  const payMutation = useMutation({
    mutationFn: (kind: 'BOOKING' | 'DEPOSIT') => payments.payForRequest(req.id, kind),
    onSuccess: () => {
      toast.success(t('payment.created'));
      queryClient.invalidateQueries({ queryKey: ['payment-for-request', req.id] });
    },
    onError: (error: any) => toast.error(paymentError(error)),
  });

  const confirmMutation = useMutation({
    mutationFn: (paymentId: number) => payments.confirm(paymentId),
    onSuccess: () => {
      toast.success(t('payment.confirmed'));
      queryClient.invalidateQueries({ queryKey: ['payment-for-request', req.id] });
    },
    onError: (error: any) => toast.error(paymentError(error)),
  });

  const busy = isMutating || payMutation.isPending || confirmMutation.isPending;

  return (
    <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-4 sm:p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start gap-4">
        <Link
          to={`/listing/${req.listing_id}`}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center"
          aria-label={t('booking.view')}
        >
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package className="w-6 h-6 text-gray-300 dark:text-gray-600" />
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/listing/${req.listing_id}`}
                className="font-bold text-[#1A1A2E] dark:text-white hover:text-[var(--accent)] transition block truncate text-base"
              >
                {req.listing_title || `#${req.listing_id}`}
              </Link>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 shrink-0" />
                {type === 'owner' ? req.renter_name : req.owner_name}
              </p>
            </div>
            <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0 ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(req.start_date)} — {formatDate(req.end_date)}
            </span>
            {req.total_price > 0 && (
              <span className="font-bold text-[var(--accent)]">
                {formatAmount(req.total_price)} {t('common.somoni')}
                <span className="font-normal text-gray-400 dark:text-gray-500">
                  {' '}· {req.total_days} {t('listing.days')}
                </span>
              </span>
            )}
            {dayPrice && (
              <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {dayPrice}
              </span>
            )}
          </div>

          {req.message && (
            <div className="mt-3 flex items-start gap-2 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
              <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{req.message}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
            {payable && (
              <span className="flex flex-wrap items-center gap-2" data-testid="payment-strip">
                {paymentLoading ? (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-xl">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('payment.checking')}
                  </span>
                ) : (
                  paymentLines.map((line) => (
                    <PaymentLine
                      key={line.kind}
                      label={line.label}
                      amount={line.amount}
                      payment={linePayment(line.kind)}
                      role={type}
                      busy={busy}
                      onPay={() => payMutation.mutate(line.kind)}
                      onConfirm={(paymentId) => confirmMutation.mutate(paymentId)}
                      t={t}
                    />
                  ))
                )}
              </span>
            )}

            <Link
              to={`/listing/${req.listing_id}`}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 px-4 py-2 rounded-xl transition"
            >
              <Eye className="w-4 h-4" />
              {t('booking.view')}
            </Link>

            {type === 'renter' && onMessage && (
              <button
                onClick={() => onMessage(req)}
                disabled={isMutating}
                className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.1)] hover:bg-[rgb(var(--accent-rgb)/0.2)] px-4 py-2 rounded-xl transition disabled:opacity-50"
              >
                <MessageSquare className="w-4 h-4" />
                {t('booking.messageOwner')}
              </button>
            )}
            {type === 'owner' && onMessage && (
              <button
                onClick={() => onMessage(req)}
                disabled={isMutating}
                className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.1)] hover:bg-[rgb(var(--accent-rgb)/0.2)] px-4 py-2 rounded-xl transition disabled:opacity-50"
              >
                <MessageSquare className="w-4 h-4" />
                {t('booking.messageRenter')}
              </button>
            )}

            {type === 'renter' && onCancel && canManage && (
              <button
                onClick={() => onCancel(req.id)}
                disabled={isMutating}
                className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-4 py-2 rounded-xl transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {t('rentalRequests.cancelRequest')}
              </button>
            )}

            {type === 'owner' && statusKey === 'PENDING' && onAccept && onReject && (
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
        </div>
      </div>
    </div>
  );
}

export default function RentalRequestsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('my-requests');
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const { data: myRequests = [], isLoading: myLoading } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => rentalRequests.getMyRequests().then((r) => r.items),
  });

  const { data: ownerRequests = [], isLoading: ownerLoading } = useQuery({
    queryKey: ['owner-requests'],
    queryFn: () => rentalRequests.getOwnerRequests().then((r) => r.items),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    queryClient.invalidateQueries({ queryKey: ['owner-requests'] });
  };

  const cancelMutation = useMutation({
    mutationFn: rentalRequests.cancel,
    onSuccess: () => {
      invalidate();
      setCancelTarget(null);
      toast.success(t('rentalRequests.requestCancelled'));
    },
    onError: () => toast.error(t('rentalRequests.failedCancel')),
  });

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

  const messageParty = async (req: RentalRequest, partyId: number) => {
    try {
      const conv = await messages.createConversation({
        user_id: partyId,
        listing_id: req.listing_id,
      });
      navigate(`/messages?conversation=${conv.id}`);
    } catch {
      toast.error(t('listing.failedToCreate'));
    }
  };

  const counts: Record<Filter, number> = {
    upcoming: 0, pending: 0, completed: 0, cancelled: 0,
  };
  myRequests.forEach((r) => { counts[bucketOf(r)] += 1; });
  const filteredMine = myRequests.filter((r) => bucketOf(r) === filter);

  const isLoading = activeTab === 'my-requests' ? myLoading : ownerLoading;
  const requests = activeTab === 'my-requests' ? filteredMine : ownerRequests;
  const isMutating = cancelMutation.isPending || acceptMutation.isPending || rejectMutation.isPending;

  const filters: { key: Filter; label: string }[] = [
    { key: 'upcoming', label: t('booking.upcoming') },
    { key: 'pending', label: t('booking.pending') },
    { key: 'completed', label: t('booking.completed') },
    { key: 'cancelled', label: t('booking.cancelled') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <BackButton className="mb-4" />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A2E] dark:text-white">{t('rentalRequests.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('rentalRequests.subtitle')}</p>
        </div>

        <div className="flex flex-wrap gap-1 bg-white dark:bg-[#1A1A2E] rounded-xl p-1 shadow-sm border border-gray-100 dark:border-white/10 mb-4">
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition ${
              activeTab === 'my-requests'
                ? 'bg-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.2)]'
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
                ? 'bg-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.2)]'
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

        {activeTab === 'my-requests' && (
          <div className="flex flex-wrap gap-2 mb-6" data-testid="booking-filters">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                  filter === f.key
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm shadow-[rgb(var(--accent-rgb)/0.25)]'
                    : 'bg-white dark:bg-[#1A1A2E] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-[rgb(var(--accent-rgb)/0.4)]'
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-xs opacity-75">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('common.loading')}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-100 dark:border-white/10 p-16 text-center">
            <AlertCircle className="w-14 h-14 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white mb-1">
              {activeTab === 'my-requests' ? t('booking.empty') : t('rentalRequests.emptyOwner')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
              {activeTab === 'my-requests'
                ? t('booking.emptyHint')
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
                onCancel={(id) => setCancelTarget(id)}
                onAccept={(id) => acceptMutation.mutate(id)}
                onReject={(id) => setRejectTarget(id)}
                onMessage={(r) =>
                  messageParty(r, activeTab === 'my-requests' ? r.owner_id : r.renter_id)
                }
                isMutating={isMutating}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {(cancelTarget !== null || rejectTarget !== null) && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!cancelMutation.isPending && !rejectMutation.isPending) {
              setCancelTarget(null);
              setRejectTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            data-testid="confirm-modal"
            className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white mb-1">
              {cancelTarget !== null ? t('booking.cancelConfirmTitle') : t('rentalRequests.reject')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {cancelTarget !== null ? t('booking.cancelConfirmText') : t('rentalRequests.subtitle')}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setCancelTarget(null);
                  setRejectTarget(null);
                }}
                disabled={cancelMutation.isPending || rejectMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cancelTarget !== null) cancelMutation.mutate(cancelTarget);
                  else if (rejectTarget !== null) rejectMutation.mutate(rejectTarget);
                }}
                disabled={cancelMutation.isPending || rejectMutation.isPending}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition flex items-center gap-2"
              >
                {cancelTarget !== null ? t('booking.yes') : t('rentalRequests.reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** One collectable line of an accepted request — the rent, and, when the
 *  listing asks for one, the refundable deposit. Each line keeps its own
 *  status, so paying the rent does not lock the deposit out, and the owner
 *  confirms the money line by line. */
function PaymentLine({
  label,
  amount,
  payment,
  role,
  busy,
  onPay,
  onConfirm,
  t,
}: {
  label: string;
  amount: number;
  payment: PaymentRecord | null;
  role: 'renter' | 'owner';
  busy: boolean;
  onPay: () => void;
  onConfirm: (paymentId: number) => void;
  t: (key: string) => string;
}) {
  const name = <span className="opacity-80">· {label}</span>;

  if (payment?.status === 'PAID') {
    return (
      <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl">
        <Check className="w-4 h-4" />
        {t('payment.paid')} {name}
      </span>
    );
  }

  if (payment?.status === 'PENDING') {
    return (
      <span className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 rounded-xl">
          <Clock className="w-4 h-4" />
          {t('payment.pending')} {name}
        </span>
        {role === 'owner' && (
          <button
            type="button"
            onClick={() => onConfirm(payment.id)}
            disabled={busy}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl transition shadow-sm shadow-emerald-500/20 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {t('payment.confirm')}
          </button>
        )}
      </span>
    );
  }

  if (role === 'renter') {
    return (
      <button
        type="button"
        onClick={onPay}
        disabled={busy}
        className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-4 py-2 rounded-xl transition shadow-sm shadow-[rgb(var(--accent-rgb)/0.2)] disabled:opacity-50"
      >
        <CreditCard className="w-4 h-4" />
        {t('payment.pay')} · {label} · {formatAmount(amount)} {t('common.somoni')}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-xl">
      <Clock className="w-3.5 h-3.5" />
      {label} — {t('payment.waitingForRenter')}
    </span>
  );
}
