import { useEffect, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Loader2, Receipt, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { payments, topPromotions, wallet } from '../../api';
import useAuthStore from '../../store/authStore';
import {
  CHECK_PROMPT_EVENT,
  clearCheckPrompt,
  readCheckPrompt,
  type CheckPromptTarget,
} from '../../utils/checkPrompt';

/** The same picture types and the same 10 MB ceiling the backend accepts —
 *  checked before a byte is read so a refusal costs no upload at all. */
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

/** How long the send button holds out once the prompt opens.
 *
 *  A receipt proves money that has already moved, and the window opens the
 *  moment the checkout does — so the wait is what stands between "the link
 *  was opened" and "here is a picture of a payment": long enough that a
 *  script cannot fire one off instantly, short enough that a customer who
 *  has just paid at DC Wallet never feels it. */
const WAIT_SECONDS = 30;

/** Everything a sent receipt can be waiting behind, so the row it belongs to
 *  redraws the moment the upload lands. */
const AFFECTED_QUERIES = [
  'payment-for-request',
  'payments',
  'wallet',
  'wallet-topups',
  'top-mine',
  'topListings',
  'owner-listings',
];

/**
 * "Send the receipt" — the question every payment asks once the money has
 * moved, in one place instead of three.
 *
 * The flow that took the payment only says *which* row is owed a receipt
 * (`queueCheckPrompt`, see `utils/checkPrompt.ts`); this component asks for
 * the picture and posts it to that row's own endpoint: a rental payment, a
 * balance top-up or a TOP promotion. The three endpoints share one rule set
 * server-side, so they share this one window client-side.
 *
 * It is a prompt, never a wall: the checkout redirect may land the customer
 * back before they have the picture in hand, so "not now" closes it and the
 * per-row send button takes the same file later.
 */
export default function CheckPrompt() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [target, setTarget] = useState<CheckPromptTarget | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS);

  // Read on mount (the return from the checkout is a fresh page load) and
  // on the queue event (the top-up flow never leaves this page). Nobody is
  // asked while signed out: every endpoint behind this prompt is per-row and
  // would answer 401, and the row is still queued for the signed-in return.
  useEffect(() => {
    if (!isAuthenticated) {
      setTarget(null);
      return;
    }
    const consume = () => setTarget(readCheckPrompt());
    consume();
    window.addEventListener(CHECK_PROMPT_EVENT, consume);
    return () => window.removeEventListener(CHECK_PROMPT_EVENT, consume);
  }, [isAuthenticated]);

  // Every opening of the prompt waits the same 30 seconds out (see
  // WAIT_SECONDS): restarted when a new row asks, ticking while the
  // customer picks the picture — by the time they have found the screenshot
  // in their gallery the button has usually already woken up.
  useEffect(() => {
    if (!target) return;
    setSecondsLeft(WAIT_SECONDS);
    const timer = window.setInterval(
      () => setSecondsLeft((left) => Math.max(0, left - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [target]);

  const sendMutation = useMutation({
    mutationFn: (image: File): Promise<unknown> => {
      if (target?.kind === 'promotion') return topPromotions.sendCheck(target.promoId, image);
      if (target?.kind === 'topup') return wallet.sendCheck(target.reference, image);
      if (target?.kind === 'payment') return payments.sendCheck(target.paymentId, image);
      return Promise.reject(new Error('no receipt is owed'));
    },
    onSuccess: () => {
      clearCheckPrompt();
      setTarget(null);
      setFile(null);
      toast.success(t('check.sent'));
      AFFECTED_QUERIES.forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey: [queryKey] }),
      );
    },
    onError: () => toast.error(t('check.failed')),
  });

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    // Cleared so picking the same picture twice after a failure re-fires.
    event.target.value = '';
    if (!picked) return;
    if (!ACCEPTED.includes(picked.type)) {
      toast.error(t('check.invalidType'));
      return;
    }
    if (picked.size > MAX_BYTES) {
      toast.error(t('check.tooBig'));
      return;
    }
    setFile(picked);
  };

  const close = () => {
    clearCheckPrompt();
    setTarget(null);
    setFile(null);
  };

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => {
        if (!sendMutation.isPending) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        data-testid="check-prompt"
        className="glass-popover rounded-2xl p-6 w-full max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white shrink-0">
            <Receipt className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
              {t('check.title')}
            </h3>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400 mt-1">
              {t('check.hint')}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={close}
            disabled={sendMutation.isPending}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="mt-4 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 px-4 py-6 text-center cursor-pointer hover:border-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.06)] transition">
          <ImagePlus
            className={`w-7 h-7 ${file ? 'text-[var(--accent)]' : 'text-gray-400 dark:text-gray-500'}`}
            aria-hidden="true"
          />
          <span className="text-sm font-semibold text-[#1A1A2E] dark:text-white break-all">
            {file ? file.name : t('check.choose')}
          </span>
          {file ? (
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {(file.size / (1024 * 1024)).toFixed(1)} MB
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">{t('check.chooseHint')}</span>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            data-testid="check-file-input"
            onChange={onPick}
          />
        </label>

        {secondsLeft > 0 && (
          <p
            className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums"
            data-testid="check-wait"
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {t('check.wait', { seconds: secondsLeft })}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={close}
            disabled={sendMutation.isPending}
            data-testid="check-skip"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition disabled:opacity-50"
          >
            {t('check.skip')}
          </button>
          <button
            type="button"
            onClick={() => file && sendMutation.mutate(file)}
            disabled={!file || sendMutation.isPending || secondsLeft > 0}
            data-testid="check-send"
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 disabled:opacity-60 transition inline-flex items-center gap-2"
          >
            {sendMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('check.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
