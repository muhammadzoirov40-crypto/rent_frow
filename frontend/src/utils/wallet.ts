/**
 * Balance helpers for the booking panel and the dashboard wallet.
 *
 * Every number comes from the backend (`GET /api/v1/wallet`): available vs
 * reserved, the hold a rental request puts on the balance and the whole
 * transaction ledger are decided server side — the browser only formats them.
 *
 * Adding money is the one thing the browser cannot do by itself: it asks the
 * backend for a DC City payment link (`POST /wallet/topup/prepare`), the link
 * carries who is paying (`f2`) and for what (`f3`), and only the provider's
 * callback credits the ledger.
 *
 *   wallet.get()       GET  /wallet
 *   wallet.transactions() GET /wallet/transactions
 *   wallet.prepare(n)  POST /wallet/topup/prepare → { url, reference }
 *   wallet.topups()    GET  /wallet/topups
 */

import { wallet as walletApi } from '../api';

/** What the top-up dialog opens with, in сомони. */
export const DEFAULT_TOPUP = 500;

export { walletApi as wallet };

/** True when `balance` can cover `amount` — tolerant of float dust. */
export function canAfford(balance: number | undefined, amount: number): boolean {
  return (balance ?? 0) + 1e-9 >= amount;
}

/** The smallest sensible top-up that covers a shortfall of `amount`. */
export function topUpFor(amount: number): number {
  const needed = Math.max(0, amount);
  return Math.max(DEFAULT_TOPUP, Math.ceil(needed / 50) * 50);
}

/**
 * Ask the backend for a payment link and open it in a new tab.
 * Resolves to the reference the callback will settle against.
 */
export async function openTopUp(amount: number): Promise<string> {
  const intent = await walletApi.prepare(amount);
  window.open(intent.url, '_blank', 'noopener,noreferrer');
  return intent.reference;
}
