import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  CheckCircle2,
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
import { listings } from '../../api';
import type { Listing } from '../../api';
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

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['owner-listings'],
    queryFn: () => listings.getMyListings(1, 100),
  });
  const all = listingsData?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['owner-listings'] });

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
                        {formatAmount(l.price)} {t('common.somoni')} / {t(`listing.${l.price_unit}`)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_STYLES[l.status] || STATUS_STYLES.EXPIRED}`}
                      >
                        {t(`dashboard.listings.status${l.status.charAt(0)}${l.status.slice(1).toLowerCase()}`)}
                      </span>
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
    </div>
  );
}
