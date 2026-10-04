"""Add the manual-confirmation keys (admin closes a top-up by hand) to
en/ru/tj, splicing them in next to `checkNow` so each file keeps its own
formatting instead of being reserialised.

    python add_confirm_keys.py
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
        "confirmed": "Funds credited to the balance",
        "alreadyPaid": "This top-up has already been credited",
        "adminHint": "You are an admin: once the payment shows up in the DC Wallet statement, confirm it here - DC City's callback will do this on its own as soon as it is connected.",
    },
    "ru": {
        "confirmed": "Средства зачислены на баланс",
        "alreadyPaid": "Это пополнение уже зачислено",
        "adminHint": "Вы администратор: когда платёж появится в выписке DC Wallet, подтвердите его здесь - колбэк DC City сделает это сам, как только будет подключён.",
    },
    "tj": {
        "confirmed": "Маблағ ба баланс гузошта шуд",
        "alreadyPaid": "Ин пурра кардан аллакай гузошта шуд",
        "adminHint": "Шумо админ ҳастед: вақте пардохт дар изоҳоти DC Wallet пайдо шуд, онро дар ин ҷо тасдиқ кунед - callback-и DC City худаш ин корро мекунад, ҳангоми пайваст шудан.",
    },
}


def escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


for loc in ("en", "ru", "tj"):
    path = os.path.join(LOCALE_DIR, "%s.json" % loc)
    text = io.open(path, encoding="utf-8").read()

    # scope the check to this section: the bare word "confirmed" may well
    # exist somewhere else in the file without meaning this key
    parsed = json.loads(text)
    existing = parsed.get("dashboard", {}).get("wallet", {})
    missing = [k for k in KEYS[loc] if k not in existing]
    if not missing:
        print("%s: already present, skipped" % loc)
        continue

    anchor = re.search(r'^([ \t]*)"checkNow": .*?,\n', text, re.M)
    if not anchor:
        raise SystemExit("%s: could not find checkNow" % loc)

    indent = anchor.group(1)
    block = "".join(
        '%s"%s": "%s",\n' % (indent, key, escape(KEYS[loc][key])) for key in missing
    )
    text = text[: anchor.end()] + block + text[anchor.end():]

    json.loads(text)  # never write a locale file we could not read back
    io.open(path, "w", encoding="utf-8", newline="\n").write(text)
    print("%s: added %d keys" % (loc, len(missing)))

print("done")
