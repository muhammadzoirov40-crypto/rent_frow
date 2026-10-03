/**
 * Balance helpers for the booking panel and the dashboard wallet.
 *
 * Every number comes from the backend (`GET /api/v1/wallet`): available vs
 * reserved, the hold a rental request puts on the balance and the whole
 * transaction ledger are decided server side — the browser only formats them.
 * Nothing is kept in localStorage anymore; the demo balance this file used to
 * own now lives in the wallet API it was modelled on.
 *
 *   wallet.get()          GET  /wallet
 *   wallet.transactions() GET  /wallet/transactions
 *   wallet.topUp(n)       POST /wallet/topup   (manual credit, no gateway)
 */

import { wallet as walletApi } from '../api';

/** What the [Пополнить баланс] button adds, in сомони. */
export const DEMO_TOPUP = 500;

export { walletApi as wallet };

/** True when `balance` can cover `amount` — tolerant of float dust. */
export function canAfford(balance: number | undefined, amount: number): boolean {
  return (balance ?? 0) + 1e-9 >= amount;
}

/** Put the demo step into the backend wallet; resolves to the fresh summary. */
export function topUpDemo() {
  return walletApi.topUp(DEMO_TOPUP);
}
