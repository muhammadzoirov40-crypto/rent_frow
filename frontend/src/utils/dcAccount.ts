/**
 * The DC account, in the shape the checkout can actually pay to.
 *
 * The provider runs on the card route (articul 133), and that route knows
 * one thing: a sixteen-digit card number — the platform's own merchant
 * account is one (9762000220865843). Nine digits is a wallet this checkout
 * never reaches, which is why the field is no longer dressed as a phone
 * number: an owner who fills in `+992 (000) 000 000` writes a number the
 * payment then cannot use, and only finds out when the rent does not come.
 *
 * What leaves the browser is `dcDestination` — digits and nothing else —
 * and the server normalises once more on its side before the wallet is
 * stored or a link is built.
 */
export const DC_DIGITS = 16;

/** Digits only, in the four groups people read a card out in, sixteen max. */
export const asDc = (raw: string): string =>
  (raw.match(/\d/g) || [])
    .slice(0, DC_DIGITS)
    .join('')
    .replace(/(.{4})(?=.)/g, '$1 ');

/** What the request carries: the number itself, no grouping. */
export const dcDestination = (raw: string): string =>
  (raw.match(/\d/g) || []).join('');

/**
 * Whether what is in the field could be paid to.
 *
 * Empty is not an error — the wallet may already sit on the profile, and a
 * listing form must not wipe it by asking again — but anything else has to
 * be a whole card, not a phone number half of one.
 */
export const dcIsWrongLength = (raw: string): boolean => {
  const value = raw.trim();
  return value !== '' && dcDestination(value).length !== DC_DIGITS;
};
