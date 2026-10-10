"""Where a DC payment is told to land.

DC Wallet recognises a wallet by its nine-digit national number — the form a
Tajik phone number takes once the country code is dropped. Owners, though,
write their number the way they say it: with ``+992``, with spaces, with
dashes. Sending that through unchanged asks the payment app to route money by
a string it has never seen, so the number is reduced to the form DC actually
recognises — and reduced the same way at every point it can enter the system.
"""

import re

# What people type instead of a clean number.
_SEPARATORS = re.compile(r"[\s\-().]")

# The country code carries nothing DC needs: the nine digits after it already
# identify the wallet inside Tajikistan.
_COUNTRY_CODE = "992"

# Nine is the length of a national number. Anything else — a sixteen-digit
# card, a merchant account, a short code — is left exactly as it came.
_NATIONAL_LENGTH = 9


def normalize_dc_account(raw: str | None) -> str | None:
    """Reduce an owner's wallet to the form DC routes a transfer by.

    ``None`` stays ``None`` so callers keep their "not sent" / "cleared"
    distinction intact. A value that is not ``+992`` followed by nine digits
    is returned unchanged: guessing at a card number or a merchant account
    would be worse than passing it through.
    """
    if raw is None:
        return None
    value = _SEPARATORS.sub("", raw)
    if not value:
        return None

    digits = value[1:] if value.startswith("+") else value
    if (
        len(digits) == len(_COUNTRY_CODE) + _NATIONAL_LENGTH
        and digits.startswith(_COUNTRY_CODE)
    ):
        return digits[len(_COUNTRY_CODE) :]
    return value
