import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Crown, Loader2, X } from 'lucide-react';
import { listings } from '../../api';
import type { Listing } from '../../api';
import { formatAmount } from '../../utils/format';
import { TopModal } from './TopModal';

interface BuyVipModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "Buy VIP" straight from the sidebar menu: pick one of your own active
 * listings and the existing plan chooser (TopModal) opens for it - same
 * backend, same two ways to pay, no second purchase path to maintain.
 * The row list shares the `owner-listings` cache with the dashboard, so
 * switching between the two never refetches from scratch.
 */
export default function BuyVipModal({ open, onClose }: BuyVipModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<Listing | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['owner-listings'],
    queryFn: () => listings.getMyListings(1, 100),
    enabled: open,
  });

  // Only ACTIVE listings can be promoted - the backend refuses the rest
  // anyway, so the shorter list is the honest one.
  const active = (data?.items ?? []).filter((l) => l.status === 'ACTIVE');

  useEffect(() => {
    if (!open) {
      setChosen(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (chosen) setChosen(null);
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, chosen, onClose]);

  if (!open) return null;

  // Step 2: the shared chooser itself; its back button returns to the list.
  if (chosen) {
    return (
      <TopModal
        listing={chosen}
        onClose={() => setChosen(null)}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['topListings'] });
          queryClient.invalidateQueries({ queryKey: ['top-mine'] });
        }}
      />
    );
  }

  // Step 1: which listing gets the VIP window.
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('vip.title')}
        data-testid="buy-vip-modal"
        className="relative w-full max-w-md bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {t('vip.title')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t('vip.pickHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]" />
            </div>
          ) : active.length === 0 ? (
            <div className="text-center py-6 px-2">
              <Crown className="w-10 h-10 mx-auto text-amber-400 mb-3" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('vip.empty')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('vip.emptyHint')}
              </p>
              <Link
                to="/create-listing"
                onClick={onClose}
                className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition"
              >
                {t('vip.create')}
              </Link>
            </div>
          ) : (
            active.map((l) => {
              const img =
                l.images?.find((i) => i.is_primary)?.image_url ||
                l.images?.[0]?.image_url ||
                null;
              return (
              <button
                key={l.id}
                type="button"
                onClick={() => setChosen(l)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-500/50 hover:bg-amber-500/10 text-left transition"
                data-testid="buy-vip-listing-row"
              >
                {img ? (
                  <img
                    src={img}
                    alt=""
                    className="w-11 h-11 rounded-lg object-cover shrink-0 bg-gray-100 dark:bg-white/5"
                    data-testid="buy-vip-row-image"
                  />
                ) : (
                  <span className="w-11 h-11 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {l.title}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {formatAmount(l.price)} {t('common.somoni')} /{' '}
                    {t(`listing.${l.price_unit}`)}
                  </span>
                </span>
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
              </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
