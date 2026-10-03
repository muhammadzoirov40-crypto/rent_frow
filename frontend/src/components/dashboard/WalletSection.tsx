import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Info, Loader2, Lock, Plus, RotateCcw, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { wallet, type TopupIntent, type WalletTransactionRecord } from '../../api';
import { formatAmount } from '../../utils/format';
import { DEFAULT_TOPUP, openTopUp } from '../../utils/wallet';

const PAGE_SIZE = 20;

const TYPE_ICON: Record<WalletTransactionRecord['type'], ReactNode> = {
  TOPUP: <Plus className="w-4 h-4" />,
  HELD: <Lock className="w-4 h-4" />,
  RELEASED: <RotateCcw className="w-4 h-4" />,
  REFUNDED: <RotateCcw className="w-4 h-4" />,
  COMPLETED: <Check className="w-4 h-4" />,
};

/**
 * Balance = Available + Reserved, with the full ledger underneath.
 * The numbers come straight from `GET /api/v1/wallet` — this section only
 * shows them and offers the top-up button.
 */
export default function WalletSection() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState<string>(String(DEFAULT_TOPUP));

  const { data: summary, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => wallet.get(),
  });

  const { data: ledger, isPending: ledgerPending } = useQuery({
    queryKey: ['wallet-transactions', page],
    queryFn: () => wallet.transactions(page, PAGE_SIZE),
  });

  // Money on its way: the link has been opened, the callback has not arrived.
  const { data: topups, isPending: topupsPending } = useQuery({
    queryKey: ['wallet-topups'],
    queryFn: () => wallet.topups(1, 20),
  });

  const topUp = useMutation({
    mutationFn: (value: number) => openTopUp(value),
    onSuccess: () => {
      setShowTopUp(false);
      queryClient.invalidateQueries({ queryKey: ['wallet-topups'] });
      toast.success(t('dashboard.wallet.paymentOpened'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['wallet-topups'] });
    queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const som = (n: number) => `${formatAmount(n, i18n.language)} ${t('common.somoni')}`;
  const available = summary?.balance ?? 0;
  const reserved = summary?.held ?? 0;
  const items = ledger?.items ?? [];
  const totalRows = ledger?.total ?? 0;
  const canPrev = page > 1;
  const canNext = page * PAGE_SIZE < totalRows;
  const pendingRows = (topups?.items ?? []).filter((row) => row.status === 'PENDING');

  return (
    <div className="space-y-4" data-testid="wallet-section">
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{t('dashboard.wallet.title')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('dashboard.wallet.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTopUp(true)}
            className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            {t('dashboard.wallet.topUp')}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {t('dashboard.wallet.topUpHint')}
        </p>

        {/* Where the money is *not* from: no bank, no Alif, no card. This is an
            in-app ledger, and the reader should not have to guess that. */}
        <div
          className="mt-3 flex items-start gap-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 px-3 py-2.5"
          data-testid="wallet-internal-note"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
          <p className="text-xs leading-relaxed text-sky-700 dark:text-sky-300">
            {t('dashboard.wallet.internalNote')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.wallet.available')}</p>
          <p className="text-2xl font-extrabold tabular-nums mt-1 text-[#16a34a]">{som(available)}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.wallet.reserved')}</p>
          <p className="text-2xl font-extrabold tabular-nums mt-1 text-amber-500">{som(reserved)}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.wallet.ownTotal')}</p>
          <p className="text-2xl font-extrabold tabular-nums mt-1">{som(summary?.total ?? 0)}</p>
        </div>
      </div>

      {/* Money that is on its way: the link was opened, the callback has not
          arrived yet, so it is honestly shown as pending instead of either
          vanishing or being counted as balance. */}
      {pendingRows.length > 0 && (
        <div
          className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-5"
          data-testid="wallet-pending"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                {t('dashboard.wallet.pending')}
              </h3>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
                {t('dashboard.wallet.pendingHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={topupsPending}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition disabled:opacity-60"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${topupsPending ? 'animate-spin' : ''}`} />
              {t('dashboard.wallet.checkNow')}
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {pendingRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 text-sm bg-white/70 dark:bg-black/20 rounded-xl px-3 py-2"
              >
                <span className="text-amber-700 dark:text-amber-300 font-semibold tabular-nums">
                  +{formatAmount(row.amount, i18n.language)} {t('common.somoni')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {new Date(row.created_at).toLocaleString(i18n.language)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5">
        <h3 className="font-semibold mb-1">{t('dashboard.wallet.history')}</h3>
        {ledgerPending ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            {t('dashboard.wallet.historyEmpty')}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/5">
            {items.map((tx) => {
              const amount = Number(tx.amount) !== 0 ? Number(tx.amount) : -Math.abs(Number(tx.held_amount));
              const positive = amount > 0;
              const date = new Date(tx.created_at);
              return (
                <li key={tx.id} className="py-3 flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      positive
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}
                  >
                    {TYPE_ICON[tx.type] ?? null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1A1A2E] dark:text-white">
                      {t(`dashboard.wallet.type_${tx.type}`)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {[tx.listing_title, date.toLocaleDateString(i18n.language)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${positive ? 'text-[#16a34a]' : 'text-red-500'}`}>
                      {positive ? '+' : ''}{formatAmount(amount, i18n.language)} {t('common.somoni')}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                      = {formatAmount(Number(tx.balance_after), i18n.language)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalRows > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canPrev}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {page} / {Math.max(1, Math.ceil(totalRows / PAGE_SIZE))}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-40"
            >
              {t('common.next')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Top-up: pick an amount, then hand off to DC Wallet in a new tab.
          The balance changes only when the provider calls back — opening the
          link never credits anything by itself. */}
      {showTopUp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowTopUp(false)}
          data-testid="wallet-topup-modal"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-white/10 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold">{t('dashboard.wallet.topUpModalTitle')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('dashboard.wallet.topUpModalHint')}
                </p>
              </div>
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={() => setShowTopUp(false)}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label htmlFor="wallet-topup-amount" className="block text-sm font-semibold mt-4 mb-1.5">
              {t('dashboard.wallet.amount')}
            </label>
            <div className="relative">
              <input
                id="wallet-topup-amount"
                data-testid="wallet-topup-amount"
                type="number"
                inputMode="decimal"
                min={1}
                step={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2.5 pr-16 text-sm font-semibold tabular-nums outline-none focus:border-[var(--accent)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
                {t('common.somoni')}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {[50, 100, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => topUp.mutate(Math.max(1, Math.round(Number(amount) || 0)))}
              disabled={topUp.isPending}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-white text-sm font-bold py-3 hover:bg-[var(--accent-hover)] transition disabled:opacity-60 active:scale-[0.99]"
            >
              {topUp.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {topUp.isPending ? t('common.loading') : t('dashboard.wallet.payNow')}
            </button>

            <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {t('dashboard.wallet.provider')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
