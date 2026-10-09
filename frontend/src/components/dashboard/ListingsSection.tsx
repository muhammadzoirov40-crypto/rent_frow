import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  CheckCircle2,
  Crown,
  Eye,
  ImageOff,
  Loader2,
  Package,
  Pencil,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listings, topPromotions, wallet } from '../../api';
import type { Listing, TopPlan, TopPromotion } from '../../api';
import { formatAmount } from '../../utils/format';

type StatusFilter = 'all' | 'ACTIVE' | 'PAUSED';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  PAUSED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  RENTED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  EXPIRED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  REMOVED: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function ListingsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [pauseTarget, setPauseTarget] = useState<Listing | null>(null);
  const [topTarget, setTopTarget] = useState<Listing | null>(null);

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['owner-listings'],
    queryFn: () => listings.getMyListings(1, 100),
  });
  const all = listingsData?.items ?? [];

  // The owner's open TOP requests, so each row can say "live until X" or
  // "waiting for the admin" without the browser guessing anything.
  const { data: myPromos = [] } = useQuery({
    queryKey: ['top-mine'],
    queryFn: topPromotions.mine,
    staleTime: 30 * 1000,
  });
  const openPromoFor = (listingId: number): TopPromotion | undefined =>
    myPromos.find(
      (p) =>
        p.listing_id === listingId &&
        (p.status === 'ACTIVE' || p.status === 'PENDING'),
    );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['owner-listings'] });
  const invalidateTop = () => {
    invalidate();
    queryClient.invalidateQueries({ queryKey: ['top-mine'] });
    queryClient.invalidateQueries({ queryKey: ['topListings'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => listings.update(id, { status }),
    onSuccess: () => {
      invalidate();
      setPauseTarget(null);
      toast.success(t('dashboard.listings.statusUpdated'));
    },
    onError: () => toast.error(t('dashboard.listings.statusFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => listings.delete(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success(t('dashboard.listings.deleted'));
    },
    onError: () => toast.error(t('dashboard.listings.deleteFailed')),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: number) => listings.submitForVerification(id),
    onSuccess: () => {
      invalidate();
      toast.success(t('dashboard.listings.submitted'));
    },
    onError: () => toast.error(t('dashboard.listings.submitFailed')),
  });

  const rows = all.filter((l) => filter === 'all' || l.status === filter);
  const countBy = (s: StatusFilter) => (s === 'all' ? all.length : all.filter((l) => l.status === s).length);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('dashboard.listings.filterAll') },
    { key: 'ACTIVE', label: t('dashboard.listings.statusActive') },
    { key: 'PAUSED', label: t('dashboard.listings.statusPaused') },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="listings-section">
      <div className="flex flex-wrap gap-2" data-testid="listings-filters">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
              filter === f.key
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm shadow-[rgb(var(--accent-rgb)/0.25)]'
                : 'bg-white dark:bg-[#1a1d24] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-[rgb(var(--accent-rgb)/0.4)]'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-75">{countBy(f.key)}</span>
          </button>
        ))}
        <Link
          to="/create-listing"
          className="ml-auto px-4 py-2 rounded-xl text-sm font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition shadow-sm shadow-[rgb(var(--accent-rgb)/0.25)]"
        >
          + {t('dashboard.listings.create')}
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="font-bold mb-1">{t('dashboard.listings.empty')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.listings.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((l) => {
            const img = l.images?.find((i) => i.is_primary)?.image_url || l.images?.[0]?.image_url || null;
            return (
              <div
                key={l.id}
                className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition"
                data-testid="listing-row"
              >
                <Link
                  to={`/listing/${l.id}`}
                  className="w-full sm:w-24 h-32 sm:h-24 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden flex items-center justify-center shrink-0"
                >
                  {img ? (
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageOff className="w-6 h-6 text-gray-300" />
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/listing/${l.id}`}
                        className="font-bold text-[#1A1A2E] dark:text-white hover:text-[var(--accent)] transition block truncate"
                      >
                        {l.title}
                      </Link>
                      <p className="text-sm font-semibold text-[var(--accent)] mt-0.5 tabular-nums">
                        {formatAmount(l.price)} {t('common.currency')} / {t(`listing.${l.price_unit}`)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_STYLES[l.status] || STATUS_STYLES.EXPIRED}`}
                      >
                        {t(`dashboard.listings.status${l.status.charAt(0)}${l.status.slice(1).toLowerCase()}`)}
                      </span>
                      {openPromoFor(l.id)?.status === 'ACTIVE' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 shadow-sm">
                          <Crown className="w-3.5 h-3.5" aria-hidden="true" />
                          {t('top.activeUntilShort', {
                            date: formatTopTime(openPromoFor(l.id)!.expires_at),
                          })}
                        </span>
                      )}
                      {openPromoFor(l.id)?.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {t('top.pendingChip')}
                        </span>
                      )}
                      {l.is_verified && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          {t('dashboard.listings.verified')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {l.views_count}
                    </span>
                    <span>{t('dashboard.listings.created')}: {(l.created_at || '').slice(0, 10)}</span>
                    {typeof l.available === 'boolean' && !l.available && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {t('dashboard.listings.unavailable')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                    <Link
                      to={`/listing/${l.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 px-3.5 py-1.5 rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" />
                      {t('dashboard.listings.preview')}
                    </Link>
                    <Link
                      to={`/create-listing?edit=${l.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.1)] hover:bg-[rgb(var(--accent-rgb)/0.2)] px-3.5 py-1.5 rounded-lg transition"
                    >
                      <Pencil className="w-4 h-4" />
                      {t('dashboard.listings.edit')}
                    </Link>
                    {l.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => setPauseTarget(l)}
                        disabled={statusMutation.isPending}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 px-3.5 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        <Pause className="w-4 h-4" />
                        {t('dashboard.listings.deactivate')}
                      </button>
                    ) : l.status === 'PAUSED' ? (
                      <button
                        type="button"
                        onClick={() => statusMutation.mutate({ id: l.id, status: 'ACTIVE' })}
                        disabled={statusMutation.isPending}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        <Play className="w-4 h-4" />
                        {t('dashboard.listings.activate')}
                      </button>
                    ) : null}
                    {l.status === 'ACTIVE' && !openPromoFor(l.id) && (
                      <button
                        type="button"
                        onClick={() => setTopTarget(l)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 px-3.5 py-1.5 rounded-lg transition"
                        data-testid="make-top-button"
                      >
                        <Crown className="w-4 h-4" />
                        {t('dashboard.listings.makeTop')}
                      </button>
                    )}
                    {!l.is_verified && l.status !== 'REMOVED' && (
                      <button
                        type="button"
                        onClick={() => verifyMutation.mutate(l.id)}
                        disabled={verifyMutation.isPending}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 px-3.5 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t('dashboard.listings.submitVerification')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(l)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-3.5 py-1.5 rounded-lg transition disabled:opacity-50 sm:ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('dashboard.listings.delete')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(deleteTarget || pauseTarget) && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (!deleteMutation.isPending && !statusMutation.isPending) {
              setDeleteTarget(null);
              setPauseTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            data-testid="listing-confirm-modal"
            className="bg-white dark:bg-[#1a1d24] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white mb-1">
              {deleteTarget ? t('dashboard.listings.deleteTitle') : t('dashboard.listings.pauseTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {deleteTarget ? t('dashboard.listings.deleteText') : t('dashboard.listings.pauseText')}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setPauseTarget(null);
                }}
                disabled={deleteMutation.isPending || statusMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                  else if (pauseTarget) statusMutation.mutate({ id: pauseTarget.id, status: 'PAUSED' });
                }}
                disabled={deleteMutation.isPending || statusMutation.isPending}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition"
              >
                {deleteTarget ? t('dashboard.listings.yesDelete') : t('dashboard.listings.yesPause')}
              </button>
            </div>
          </div>
        </div>
      )}
      {topTarget && (
        <TopModal
          listing={topTarget}
          onClose={() => setTopTarget(null)}
          onDone={invalidateTop}
        />
      )}
    </div>
  );
}

/** Local wall-clock rendering of an ISO expiry — "05.10, 14:30". */
function formatTopTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Plan chooser for "Make TOP".
 *
 * The price and duration shown here are whatever the admin configured, read
 * from the public plan list — the form posts only `listing_id` + `plan_id`.
 * The wallet balance (when the balance switch is on) is shown so an
 * unaffordable plan is visibly "will wait for the admin" instead of a
 * surprise charge; if the wallet endpoint is unavailable the row simply
 * does not render and the same pending note still applies.
 */
function TopModal({
  listing,
  onClose,
  onDone,
}: {
  listing: Listing;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [planId, setPlanId] = useState<number | null>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['top-plans'],
    queryFn: topPromotions.plans,
    staleTime: 60 * 1000,
    retry: false,
  });

  const { data: summary } = useQuery({
    queryKey: ['wallet-summary'],
    queryFn: wallet.get,
    staleTime: 30 * 1000,
    retry: false,
  });
  const balance = typeof summary?.balance === 'number' ? summary.balance : null;

  const selected = plans.find((p) => p.id === planId) ?? null;
  const insufficient =
    selected !== null && selected.price > 0 && balance !== null && balance < selected.price;

  const mutation = useMutation({
    mutationFn: (chosenPlanId: number) => topPromotions.request(listing.id, chosenPlanId),
    onSuccess: (data) => {
      onDone();
      queryClient.invalidateQueries({ queryKey: ['topListings'] });
      onClose();
      if (data.active) toast.success(t('top.createdActive'));
      else toast(t('top.createdPending'));
    },
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '';
      if (detail === 'PROMOTION_EXISTS') toast.error(t('top.alreadyExists'));
      else if (detail === 'LISTING_NOT_ACTIVE') toast.error(t('top.listingNotActive'));
      else toast.error(t('top.requestFailed'));
    },
  });

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        data-testid="top-plans-modal"
        className="bg-white dark:bg-[#1a1d24] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-1">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 shrink-0">
            <Crown className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
              {t('top.modalTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{listing.title}</p>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 mb-3">
          {t('top.modalHint')}
        </p>

        {plansLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]" />
          </div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            {t('top.plansEmpty')}
          </p>
        ) : (
          <div className="space-y-2" data-testid="top-plan-list">
            {plans.map((plan: TopPlan) => {
              const active = plan.id === planId;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setPlanId(plan.id)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm transition ${
                    active
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 shadow-sm'
                      : 'border-gray-200 dark:border-white/10 hover:border-amber-300'
                  }`}
                >
                  <span className="font-semibold text-[#1A1A2E] dark:text-white text-left">
                    {plan.name}
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t(`top.dur_${plan.duration_key}`)}
                    </span>
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                    {plan.price > 0
                      ? `${formatAmount(plan.price)} ${t('common.currency')}`
                      : t('top.free')}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="mt-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-3.5 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">{t('top.priceLabel')}</span>
              <span className="font-bold text-[#1A1A2E] dark:text-white tabular-nums">
                {selected.price > 0
                  ? `${formatAmount(selected.price)} ${t('common.currency')}`
                  : t('top.free')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">{t('top.durationLabel')}</span>
              <span className="font-semibold text-[#1A1A2E] dark:text-white">
                {t(`top.dur_${selected.duration_key}`)}
              </span>
            </div>
            {balance !== null && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('top.balanceLabel')}</span>
                <span className="font-semibold tabular-nums text-[#1A1A2E] dark:text-white">
                  {formatAmount(balance)} {t('common.currency')}
                </span>
              </div>
            )}
            <p
              className={`text-xs leading-relaxed pt-1 border-t border-gray-100 dark:border-white/10 ${
                insufficient
                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              data-testid={insufficient ? 'top-insufficient-note' : undefined}
            >
              {insufficient ? t('top.insufficientNote') : t('top.pendingNote')}
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-end mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
          >
            {t('common.back')}
          </button>
          <button
            type="button"
            onClick={() => planId !== null && mutation.mutate(planId)}
            disabled={planId === null || mutation.isPending || plans.length === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-60 transition inline-flex items-center gap-2"
            data-testid="top-confirm-button"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('top.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
