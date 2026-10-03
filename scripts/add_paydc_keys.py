"""Add the DC Wallet top-up keys to en/ru/tj, keeping each file's own
formatting by splicing the lines in next to `internalNote` rather than
reserialising the whole document.

    python add_paydc_keys.py
"""

import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

LOCALE_DIR = r"C:\Users\User\Desktop\idea-proekt-fastipa\frontend\src\i18n\locales"

KEYS = {
    "en": {
        "topUpModalTitle": "Top up balance",
        "topUpModalHint": "Choose an amount - you will be taken to DC Wallet (Dushanbe City) to pay.",
        "amount": "Amount",
        "payNow": "Go to payment",
        "provider": "Paid through DC Wallet. The balance is added as soon as the payment is confirmed - usually within a few minutes.",
        "paymentOpened": "Payment opened - the balance will be added once DC Wallet confirms it.",
        "pending": "Waiting for payment",
        "pendingHint": "A top-up is on its way. Press check to see whether it has arrived.",
        "checkNow": "Check",
    },
    "ru": {
        "topUpModalTitle": "Пополнить баланс",
        "topUpModalHint": "Укажите сумму - откроется страница DC Wallet (Душанбе Сити) для оплаты.",
        "amount": "Сумма",
        "payNow": "Перейти к оплате",
        "provider": "Оплата через DC Wallet. Баланс пополнится сразу после подтверждения - обычно в течение нескольких минут.",
        "paymentOpened": "Оплата открыта - баланс пополнится после подтверждения DC Wallet.",
        "pending": "Ожидает оплаты",
        "pendingHint": "Пополнение в пути. Нажмите «Проверить», пришло ли оно.",
        "checkNow": "Проверить",
    },
    "tj": {
        "topUpModalTitle": "Пурра кардани баланс",
        "topUpModalHint": "Маблағро интихоб кунед - барои пардохт саҳифаи DC Wallet (Душанбе Сити) кушода мешавад.",
        "amount": "Маблағ",
        "payNow": "Ба пардохт гузарид",
        "provider": "Пардохт тавассути DC Wallet. Баланс пас аз тасдиқ пурра мешавад - одатан дар чанд дақиқа.",
        "paymentOpened": "Пардохт кушода шуд - баланс пас аз тасдиқи DC Wallet пурра мешавад.",
        "pending": "Дар интизори пардохт",
        "pendingHint": "Пурра кардан дар роҳ аст. Барои санҷидан, омадааст ё не, «Санҷидан»-ро занед.",
        "checkNow": "Санҷидан",
    },
}


def escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


for loc in ("en", "ru", "tj"):
    path = os.path.join(LOCALE_DIR, "%s.json" % loc)
    text = io.open(path, encoding="utf-8").read()

    missing = [k for k in KEYS[loc] if '"%s"' % k not in text]
    if not missing:
        print("%s: already present, skipped" % loc)
        continue

    anchor = re.search(r'^([ \t]*)"internalNote": .*?,\n', text, re.M)
    if not anchor:
        raise SystemExit("%s: could not find internalNote" % loc)

    indent = anchor.group(1)
    block = "".join(
        '%s"%s": "%s",\n' % (indent, key, escape(KEYS[loc][key])) for key in missing
    )
    text = text[: anchor.end()] + block + text[anchor.end():]

    json.loads(text)  # never write a locale file we could not read back
    io.open(path, "w", encoding="utf-8", newline="\n").write(text)
    print("%s: added %d keys" % (loc, len(missing)))

print("done")
