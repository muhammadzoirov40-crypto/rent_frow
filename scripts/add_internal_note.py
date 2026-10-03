"""Add `dashboard.wallet.internalNote` to en/ru/tj, keeping the files' own
formatting (indentation and key order) by splicing the new line in next to
`topUpHint` instead of reserialising the whole document.

    python add_internal_note.py
"""

import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
LOCALE_DIR = os.path.join(
    r"C:\Users\User\Desktop\idea-proekt-fastipa\frontend\src\i18n\locales"
)

NOTES = {
    "en": "This balance lives inside RentHub only — it is not drawn from Alif, DS or any other bank. "
          '"Top up" is an internal credit: no money leaves your card and no payment provider is involved.',
    "ru": "Этот баланс хранится только внутри RentHub — он не берётся из Alif, DS или другого банка. "
          "«Пополнение» — внутреннее начисление: деньги с карты не списываются и платёжный провайдер не участвует.",
    "tj": "Ин баланс танҳо дар дохили RentHub нигоҳдорӣ мешавад — аз Alif, DS ё дигар бонк гирифта намешавад. "
          "«Пурра кардан» қарзи дохилӣ аст: аз корти шумо пули бурида намешавад ва даргоҳи пардохт иштирок намекунад.",
}

for loc in ("en", "ru", "tj"):
    path = os.path.join(LOCALE_DIR, "%s.json" % loc)
    text = io.open(path, encoding="utf-8").read()

    if '"internalNote"' in text:
        print("%s: already present, skipped" % loc)
        continue

    m = re.search(r'^([ \t]*)"topUpHint": .*?,\n', text, re.M)
    if not m:
        raise SystemExit("%s: could not find topUpHint" % loc)

    indent = m.group(1)
    note = NOTES[loc].replace("\\", "\\\\").replace('"', '\\"')
    line = '%s"internalNote": "%s",\n' % (indent, note)
    text = text[: m.end()] + line + text[m.end():]

    io.open(path, "w", encoding="utf-8", newline="\n").write(text)
    print("%s: added (%d chars)" % (loc, len(note)))

print("done")
