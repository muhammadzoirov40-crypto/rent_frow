import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Crown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { topPromotions, wallet } from '../../api';
import type { Listing, TopPlan } from '../../api';
import { formatAmount } from '../../utils/format';

/**
 * Plan chooser for "Make TOP".
 *
 * The price and duration shown here are whatever the admin configured, read
 * from the public plan list — the form posts only `listing_id` + `plan_id`.
 * The wallet balance (when the balance switch is on) is shown so an
 * unaffordable plan is visibly "will wait for the admin" instead of a
 * surprise charge; if the wallet endpoint is unavailable the row simply
 * does not render and the same pending note still applies.
 *
 * Two ways to pay, both priced by the server: the wallet (instant, or an
 * admin's approval when the balance falls short) and DC Wallet — Dushanbe
 * City, which opens a checkout for the plan's price and turns the pending
 * record into a live window when the reference comes back.
 */
export function TopModal({
  listing,
  onClose,
  onDone,
  notOwner = false,
}: {
  listing: Listing;
  onClose: () => void;
  onDone: () => void;
  /** The viewer is not this listing's owner: the chooser stays visible but
   *  has nothing to sell them — the backend would answer 403 anyway. */
  notOwner?: boolean;
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

  /** Every refusal the two purchase endpoints can answer, in the user's
   *  language instead of the backend's English detail string. */
  const mapError = (error: unknown): string => {
    const detail =
      (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '';
    if (detail === 'PROMOTION_EXISTS') return t('top.alreadyExists');
    if (detail === 'LISTING_NOT_ACTIVE') return t('top.listingNotActive');
    if (detail === 'Not your listing') return t('top.notOwner');
    if (detail === 'TOPUP_DISABLED') return t('top.dcDisabled');
    return t('top.requestFailed');
  };

  const mutation = useMutation({
    mutationFn: (chosenPlanId: number) => topPromotions.request(listing.id, chosenPlanId),
    onSuccess: (data) => {
      onDone();
      queryClient.invalidateQueries({ queryKey: ['topListings'] });
      onClose();
      if (data.active) toast.success(t('top.createdActive'));
      else toast(t('top.createdPending'));
    },
    onError: (error: unknown) => toast.error(mapError(error)),
  });

  // DC Wallet (Dushanbe City): the browser only follows the link the server
  // built — the window becomes live when the provider confirms the
  // reference, never because this click said so.
  const dcMutation = useMutation({
    mutationFn: (chosenPlanId: number) => topPromotions.payDc(listing.id, chosenPlanId),
    onSuccess: (data) => {
      onDone();
      queryClient.invalidateQueries({ queryKey: ['topListings'] });
      window.location.href = data.url;
    },
    onError: (error: unknown) => toast.error(mapError(error)),
  });

  const busy = mutation.isPending || dcMutation.isPending;
  const chooseDisabled = planId === null || busy || plans.length === 0 || notOwner;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => {
        if (!busy) onClose();
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

        {notOwner && (
          <p
            className="mt-3 text-xs leading-relaxed text-red-500 dark:text-red-400"
            data-testid="top-not-owner-note"
          >
            {t('top.notOwnerNote')}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
          >
            {t('common.back')}
          </button>
          {selected !== null && selected.price > 0 && !notOwner && (
            <button
              type="button"
              onClick={() => planId !== null && dcMutation.mutate(planId)}
              disabled={chooseDisabled}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 disabled:opacity-60 transition inline-flex items-center gap-2"
              data-testid="top-dc-button"
            >
              {dcMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('top.payDc')}
            </button>
          )}
          <button
            type="button"
            onClick={() => planId !== null && mutation.mutate(planId)}
            disabled={chooseDisabled}
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
