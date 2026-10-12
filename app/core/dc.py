"""Where a DC payment is told to land.

The provider answers on the card route (articul 133), and that route
recognises a wallet by its sixteen-digit card number — the shape the
platform's own merchant account takes. Owners, though, write numbers the
way they read them out: in groups of four, with dashes, sometimes with the
``+992`` of a phone still in front. Sending that through unchanged asks the
payment app to route money by a string it has never seen, so the number is
reduced to the form DC actually recognises — and reduced the same way at
every point it can enter the system.
"""

import re

# What people type instead of a clean number.
_SEPARATORS = re.compile(r"[\s\-().]")

# The country code carries nothing DC needs: the nine digits after it already
# identify the older, wallet-shaped account inside Tajikistan.
_COUNTRY_CODE = "992"

# Nine is the length of that national number.
_NATIONAL_LENGTH = 9

# Sixteen is a card, and the card is what the route set up for this merchant
# pays to. Not a prefix and not a grouping: the digits themselves.
_CARD_LENGTH = 16


def normalize_dc_account(raw: str | None) -> str | None:
    """Reduce an owner's wallet to the form DC routes a transfer by.

    ``None`` stays ``None`` so callers keep their "not sent" / "cleared"
    distinction intact. Sixteen digits is a card and is sent as the digits
    alone, however they were grouped; ``+992`` and nine digits is the older
    wallet form and is reduced to those nine. Anything else is returned
    unchanged: guessing at a merchant account or a short code would be worse
    than passing it through.
    """
    if raw is None:
        return None
    value = _SEPARATORS.sub("", raw)
    if not value:
        return None

    digits = value[1:] if value.startswith("+") else value
    if digits.isdigit() and len(digits) == _CARD_LENGTH:
        return digits
    if (
        len(digits) == len(_COUNTRY_CODE) + _NATIONAL_LENGTH
        and digits.startswith(_COUNTRY_CODE)
    ):
        return digits[len(_COUNTRY_CODE) :]
    return value
