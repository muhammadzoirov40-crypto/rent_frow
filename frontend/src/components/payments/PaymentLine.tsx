import { Check, Clock, CreditCard } from 'lucide-react';
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
      <span className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 rounded-xl">
          <Clock className="w-4 h-4" />
          {t('payment.pending')} {name}
        </span>
        {payment.payment_reference && (
          <span
            className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-2 py-1.5 rounded-lg"
            title={t('payment.reference')}
            data-testid="payment-reference"
          >
            {payment.payment_reference}
          </span>
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
    <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-xl">
      <Clock className="w-3.5 h-3.5" />
      {label} — {t('payment.waitingForRenter')}
    </span>
  );
}
