"""Sanjishi 5: harchandon t('key') istifodashuda dar frontend baydad?
Harchandon kalimae, ki dar kod istifoda megardad, bayd dar EN da mujood boshad.

Two kinds of usage are understood:

* static   — t('foo.bar')                      -> exact key, must exist
* dynamic  — t('foo.' + x) / t(`foo.${x}`)     -> only the static prefix is
             known, so it is never demanded as an exact key (that produced the
             phantom MISS 'listing.'), but everything the prefix covers is
             treated as used so it is not pruned as dead.
"""
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
SRC = os.path.join(os.path.dirname(__file__), "..", "frontend", "src")

# Keys assembled at runtime: we only learn their static prefix.
DYN_PATTERNS = [
    # t('listing.' + listing.price_unit)
    re.compile(r"""\bt\(\s*(['"])([a-zA-Z0-9_][a-zA-Z0-9_.]*)\1\s*\+"""),
    # t(`listing.${l.price_unit}`) / t(`terms.s${n}h`)
    re.compile(r"\bt\(\s*`([a-zA-Z0-9_][a-zA-Z0-9_.]*)\$\{"),
]

# Namespaces addressed through a variable, i.e. t(`${ns}.title`) in LegalPage
# where `ns: LegalKind = 'terms' | 'privacy'`. There is no static prefix at all,
# so DYN_PATTERNS cannot see them — without this list every terms.*/privacy.*
# key would be reported (and then pruned) as dead.
DYNAMIC_NS = {"terms", "privacy"}

# Complete, literal keys.
LIT_PATTERNS = [
    re.compile(r"\bt\(\s*'([a-zA-Z0-9_][a-zA-Z0-9_.]*)'"),
    re.compile(r'\bt\(\s*"([a-zA-Z0-9_][a-zA-Z0-9_.]*)"'),
    re.compile(
        r"(?:labelKey|hintKey|titleKey|nameKey|emptyKey|tabKey)\s*:\s*'([a-zA-Z0-9_.]+)'"),
    re.compile(
        r'(?:labelKey|hintKey|titleKey|nameKey|emptyKey|tabKey)\s*:\s*"([a-zA-Z0-9_.]+)"'),
    # i18nKey="foo.bar" style bindings
    re.compile(r'(?:i18nKey|titleKey|labelKey)\s*=\s*"([a-zA-Z0-9_.]+)"'),
]

used = set()
dyn = set()
files = 0
for root, _dirs, names in os.walk(SRC):
    if os.sep + "i18n" + os.sep in root + os.sep:
        continue
    for fn in names:
        if not fn.endswith((".ts", ".tsx")):
            continue
        path = os.path.join(root, fn)
        files += 1
        text = io.open(path, encoding="utf-8").read()
        for pat in LIT_PATTERNS:
            for m in pat.finditer(text):
                used.add(m.group(1))
        for pat in DYN_PATTERNS:
            for m in pat.finditer(text):
                prefix = m.group(2) if m.lastindex and m.lastindex >= 2 else m.group(1)
                dyn.add(prefix)
                used.add(prefix)

locales = {}
for lang in ("en", "ru", "tj"):
    p = os.path.join(SRC, "i18n", "locales", "%s.json" % lang)
    locales[lang] = json.load(io.open(p, encoding="utf-8"))


def flat(node, prefix=""):
    out = set()
    for key, val in node.items():
        full = "%s.%s" % (prefix, key) if prefix else key
        if isinstance(val, dict):
            out |= flat(val, full)
        else:
            out.add(full)
    return out


keys = {lang: flat(locales[lang]) for lang in locales}


def covered(key):
    """True when a dynamic prefix (or namespace) already accounts for this key."""
    if key.split(".", 1)[0] in DYNAMIC_NS:
        return True
    return any(key.startswith(p) for p in dyn)


print("faylҳои сканшуда: %d" % files)
print("kalimaҳои истифодашуда дar kod: %d" % len(used))
print("dynamic prefixҳо: %s" % ", ".join(sorted(dyn)) or "-")

failed = False
for lang in ("en", "ru", "tj"):
    missing = sorted(k for k in used if k not in keys[lang] and not covered(k))
    print("[%s] kalimaҳои норасида: %d" % (lang, len(missing)))
    if missing:
        failed = True
    for k in missing[:40]:
        print("    MISS:", k)

# kalimaҳoe, ki dar locale hast, lekin dar kod hast (murda) — ogoz baroi taza.
dead_by_lang = {lang: sorted(k for k in keys[lang] if k not in used and not covered(k))
                for lang in keys}
dead = dead_by_lang["en"]
print("\nkalimaҳои истифоданашуда (murda): %d" % len(dead))
for lang in ("ru", "tj"):
    if len(dead_by_lang[lang]) != len(dead):
        print("  [%s] murda: %d" % (lang, len(dead_by_lang[lang])))

# парҳои EN↔RU↔TJ (калимаҳое, ки танҳо дар як забон ҳастанд)
only = {lang: sorted(keys[lang] - keys["en"]) for lang in ("ru", "tj")}
for lang in ("ru", "tj"):
    if only[lang]:
        print("  [%s] калимаҳои иловагӣ: %d -> %s"
              % (lang, len(only[lang]), ", ".join(only[lang][:10])))
        failed = True

print("\nNATIJA: %s" % ("FAIL" if failed else "OK"))
