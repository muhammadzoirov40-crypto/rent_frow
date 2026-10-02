# -*- coding: utf-8 -*-
"""Tazai kalimahoi murda (dead) az localehoi en/ru/tj — idempotent.

Safety nets, because pruning a key that is actually used breaks the UI:
  1. a key is kept when a dynamic prefix (t('listing.' + x)) covers it;
  2. a key is kept when its namespace is addressed through a variable
     (t(`${ns}.title`) -> terms/privacy);
  3. a key is kept when its full text literally appears anywhere in src,
     which catches call styles the checker's regexes do not know about;
  4. a key is kept when it is used (static) at all.

Only en/ru/tj are touched, and only leaf values are removed — namespaces
that end up empty are dropped too, so the three files stay parallel.
"""
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "frontend", "src")
LOCALES = os.path.join(SRC, "i18n", "locales")

DYN_PATTERNS = [
    re.compile(r"""\bt\(\s*(['"])([a-zA-Z0-9_][a-zA-Z0-9_.]*)\1\s*\+"""),
    re.compile(r"\bt\(\s*`([a-zA-Z0-9_][a-zA-Z0-9_.]*)\$\{"),
]
LIT_PATTERNS = [
    re.compile(r"\bt\(\s*'([a-zA-Z0-9_][a-zA-Z0-9_.]*)'"),
    re.compile(r'\bt\(\s*"([a-zA-Z0-9_][a-zA-Z0-9_.]*)"'),
    re.compile(r"(?:labelKey|hintKey|titleKey|nameKey|emptyKey|tabKey)\s*:\s*'([a-zA-Z0-9_.]+)'"),
    re.compile(r'(?:labelKey|hintKey|titleKey|nameKey|emptyKey|tabKey)\s*:\s*"([a-zA-Z0-9_.]+)"'),
    re.compile(r'(?:i18nKey|titleKey|labelKey)\s*=\s*"([a-zA-Z0-9_.]+)"'),
]
DYNAMIC_NS = {"terms", "privacy"}

used, dyn = set(), set()
blob_parts = []
for root, _dirs, names in os.walk(SRC):
    if os.sep + "i18n" + os.sep in root + os.sep:
        continue
    for fn in names:
        if not fn.endswith((".ts", ".tsx")):
            continue
        text = io.open(os.path.join(root, fn), encoding="utf-8").read()
        blob_parts.append(text)
        for pat in LIT_PATTERNS:
            used.update(m.group(1) for m in pat.finditer(text))
        for pat in DYN_PATTERNS:
            for m in pat.finditer(text):
                pre = m.group(2) if m.lastindex and m.lastindex >= 2 else m.group(1)
                dyn.add(pre)
                used.add(pre)
BLOB = "\n".join(blob_parts)


def covered(key):
    if key.split(".", 1)[0] in DYNAMIC_NS:
        return True
    return any(key.startswith(p) for p in dyn)


def is_dead(key):
    if key in used or covered(key):
        return False
    if key in BLOB:            # referenced literally somewhere — keep
        return False
    return True


docs = {}
for lang in ("en", "ru", "tj"):
    with io.open(os.path.join(LOCALES, lang + ".json"), encoding="utf-8") as f:
        docs[lang] = json.load(f)


def walk(node, prefix, out):
    for k, v in node.items():
        full = "%s.%s" % (prefix, k) if prefix else k
        if isinstance(v, dict):
            walk(v, full, out)
        else:
            out.add(full)
    return out


def prune(node, prefix):
    removed = []
    for k in list(node.keys()):
        full = "%s.%s" % (prefix, k) if prefix else k
        v = node[k]
        if isinstance(v, dict):
            removed += prune(v, full)
            if not v:
                del node[k]
        elif is_dead(full):
            del node[k]
            removed.append(full)
    return removed


# keys that exist in one locale but are used nowhere at all (e.g. tj's auth.nom)
all_dead = {}
for lang in ("en", "ru", "tj"):
    all_dead[lang] = sorted(k for k in walk(docs[lang], "", set()) if is_dead(k))
    removed = prune(docs[lang], "")
    print("[%s] tazakunida: %d" % (lang, len(removed)))

unified = sorted(set(all_dead["en"]) | set(all_dead["ru"]) | set(all_dead["tj"]))
for lang in ("en", "ru", "tj"):
    with io.open(os.path.join(LOCALES, lang + ".json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(docs[lang], f, ensure_ascii=False, indent=2)
        f.write("\n")

print("\njami kalimahoi tazakunida: %d" % len(unified))
from collections import Counter
print("bar asosi namespace:", Counter(k.split(".")[0] for k in unified).most_common())

# barobari
counts = {}
for lang in ("en", "ru", "tj"):
    counts[lang] = len(walk(docs[lang], "", set()))
print("parity:", counts, "->", "OK" if len(set(counts.values())) == 1 else "MISMATCH")
