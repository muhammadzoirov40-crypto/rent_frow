/**
 * Feature switches.
 *
 * `WALLET_ENABLED` mirrors `WALLET_ENABLED` in the backend `.env`. The balance
 * ships switched off: the listing shows no balance, nothing can be topped up
 * and no rental request is blocked for money.
 *
 * Everything behind the switch — the wallet, the ledger, the DC Wallet link
 * and its callback — stays in the code. Set this one and the backend one to
 * `true` together to bring the money layer back.
 */
export const WALLET_ENABLED = false
