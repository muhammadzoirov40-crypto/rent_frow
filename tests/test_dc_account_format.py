"""The form a DC wallet has to be in for the money to arrive.

DC Wallet routes a transfer by the nine-digit national number - the number a
Tajik phone becomes once the country code is dropped. Owners write their
wallet the way they say it, so an unconverted ``+992 90 000 00 01`` leaves the
platform as a string DC has no route for. What is on file, and what the
checkout link carries, both have to be the short form; everything else - a
card, a merchant account, a code of another length - has to survive untouched,
because guessing at those would be worse than passing them through.
"""

from urllib.parse import parse_qs, urlparse

from app.core.dc import normalize_dc_account
from app.services.topup import payment_url


def test_the_full_international_number_becomes_the_national_one():
    assert normalize_dc_account("+992002119831") == "002119831"


def test_the_separators_people_type_are_dropped_along_the_way():
    assert normalize_dc_account("+992 (90) 000-00-01") == "900000001"
    assert normalize_dc_account("+992 90 000 00 01") == "900000001"


def test_a_wallet_already_short_is_left_alone():
    """The form a real account is already saved in must not be rewritten."""
    assert normalize_dc_account("002119831") == "002119831"


def test_a_number_of_any_other_length_is_never_guessed_at():
    """A card, a merchant account, a code nobody asked us to interpret."""
    assert normalize_dc_account("9762000220865843") == "9762000220865843"
    assert normalize_dc_account("12345") == "12345"
    assert normalize_dc_account("9929000000012") == "9929000000012"


def test_absent_and_blank_stay_distinct_from_each_other():
    """'Not sent' keeps its meaning; 'cleared' still clears."""
    assert normalize_dc_account(None) is None
    assert normalize_dc_account("   ") is None


def test_the_checkout_link_carries_the_short_form():
    link = payment_url(2, 10.0, "REF0001", account="+992 90 000 00 01")

    sent = parse_qs(urlparse(link).query)["a"][0]
    assert sent == "900000001", (
        "the link is what the payment app reads; anything else there is a "
        "destination DC cannot route to"
    )


def test_a_wallet_saved_before_this_rule_still_reaches_dc_correctly():
    """Data already on file predates the conversion and cannot be ignored."""
    link = payment_url(2, 10.0, "REF0002", account="+992002119831")

    assert parse_qs(urlparse(link).query)["a"][0] == "002119831"
