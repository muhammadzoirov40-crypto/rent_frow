/**
 * The receipt asked for the moment money moves.
 *
 * Paying at DC Wallet (Dushanbe City) ends with a receipt in the customer's
 * hand, and the operator closes the payment against that picture. Every
 * payment flow leaves the page to collect the money — TOP and the rental
 * lines follow `window.location.href` to the checkout, the balance top-up
 * opens it in a new tab — so the question cannot live inside the button that
 * opened the link: the page it was on is about to go away.
 *
 * The prompt therefore lives in `sessionStorage`, which the browser keeps
 * across exactly that round trip in the same tab:
 *
 *   queueCheckPrompt(...)   the flow says "a receipt is owed for this row"
 *   readCheckPrompt()       the prompt asks, and keeps asking until answered
 *   clearCheckPrompt()      it was sent, or the customer said not now
 *
 * `sessionStorage` and not `localStorage`: one tab's payment is one tab's
 * business, and closing that tab is enough to forget it. Only the target
 * travels — which row wants the receipt, never the picture itself, which
 * goes straight to storage as multipart bytes.
 */

export const CHECK_PROMPT_EVENT = 'renthub:check-prompt';

const STORAGE_KEY = 'renthub:check-prompt';

/** Which waiting row the receipt belongs to: a rental payment, a balance
 *  top-up, or a TOP promotion — the three places money is waited for. */
export type CheckPromptTarget =
  | { kind: 'payment'; paymentId: number }
  | { kind: 'topup'; reference: string }
  | { kind: 'promotion'; promoId: number };

/** Remember that a receipt is owed, and tell the prompt to ask now.
 *
 *  The event matters for the one flow that does not navigate away (the
 *  top-up opens a new tab, so this page stays mounted): the prompt has
 *  already run its one read on mount and would never hear about this.
 */
export function queueCheckPrompt(target: CheckPromptTarget): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(target));
    window.dispatchEvent(new CustomEvent(CHECK_PROMPT_EVENT));
  } catch {
    // Storage disabled (private mode, quota): the per-row "send check"
    // buttons still take a receipt, so a lost prompt is a lost shortcut.
  }
}

/** The target still owed, or null — read, never consumed here: the prompt
 *  keeps asking across the redirect to the checkout and back, and the row is
 *  only forgotten once the receipt is sent or declined. */
export function readCheckPrompt(): CheckPromptTarget | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckPromptTarget;
    // A tampered or hand-edited value must not reach a file upload: anything
    // that is not one of the three shapes is treated as no prompt at all.
    if (!parsed || typeof parsed !== 'object' || !('kind' in parsed)) return null;
    if (parsed.kind === 'payment' && typeof parsed.paymentId !== 'number') return null;
    if (parsed.kind === 'topup' && typeof parsed.reference !== 'string') return null;
    if (parsed.kind === 'promotion' && typeof parsed.promoId !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** The receipt was sent, or the customer chose not to send it. */
export function clearCheckPrompt(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to forget.
  }
}
