import { Check, Clock, CreditCard, Receipt } from 'lucide-react';
import type { PaymentRecord } from '../../api';
import { formatAmount } from '../../utils/format';

/**
 * One payable line against a rental request: the rent, or the refundable
 * deposit.
 *
 * The renter presses [Пардохт] to open a payment, but the amount that lands
 * is the one the backend worked out from the request — the browser never
 * names a price. It then waits in "the owner confirms" until the person
 * holding the money marks it as received.
 *
 * Both places that show money agree on this component: the rental requests
 * page and the bar at the top of a chat.
 */
export default function PaymentLine({
  label,
  amount,
  payment,
  role,
  busy,
  onPay,
  onConfirm,
  onSendCheck,
  t,
}: {
  label: string;
  amount: number;
  payment: PaymentRecord | null;
  role: 'renter' | 'owner';
  busy: boolean;
  onPay: () => void;
  onConfirm: (paymentId: number) => void;
  /** Hand the receipt (screenshot) for this very payment to the caller —
   *  the same upload the post-payment prompt takes, offered here as well so
   *  a customer who dismissed the prompt can still send it from this bar. */
  onSendCheck?: (file: File) => void;
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
      <span className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 rounded-xl">
          <Clock className="w-4 h-4" />
          {t('payment.pending')} {name}
        </span>
        {payment.payment_reference && (
          <span
            className="glass-section hidden sm:flex items-center gap-1 text-[11px] font-mono text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/10 px-2 py-1.5 rounded-lg"
            title={t('payment.reference')}
            data-testid="payment-reference"
          >
            {payment.payment_reference}
          </span>
        )}
        {/* The payer proves the transfer with a picture: the receipt taken
            after DC Wallet, re-sendable until the owner confirms the money. */}
        {role === 'renter' && onSendCheck && (
          <label
            className={`flex items-center gap-1.5 text-sm font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 px-4 py-2 rounded-xl transition cursor-pointer ${
              busy ? 'opacity-50 pointer-events-none' : ''
            }`}
            data-testid="chat-payment-send-check"
          >
            <Receipt className="w-4 h-4" />
            {t('check.send')}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) onSendCheck(file);
              }}
            />
          </label>
        )}
        {payment.check_image_url && (
          <a
            href={payment.check_image_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] transition"
            data-testid="chat-payment-view-check"
          >
            <Receipt className="w-4 h-4" />
            {t('top.check.view')}
          </a>
        )}
        {role === 'owner' && (
          <button
            type="button"
            onClick={() => onConfirm(payment.id)}
            disabled={busy}
            data-testid="chat-payment-confirm"
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
        data-testid="chat-payment-pay"
        className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-4 py-2 rounded-xl transition shadow-sm shadow-[rgb(var(--accent-rgb)/0.2)] disabled:opacity-50"
      >
        <CreditCard className="w-4 h-4" />
        {t('payment.pay')} · {label} · {formatAmount(amount)} {t('common.somoni')}
      </button>
    );
  }

  return (
    <span className="glass-section flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 px-4 py-2 rounded-xl">
      <Clock className="w-3.5 h-3.5" />
      {label} — {t('payment.waitingForRenter')}
    </span>
  );
}
