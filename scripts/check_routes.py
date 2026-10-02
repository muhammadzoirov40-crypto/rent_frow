"""Sanjishi 9: frontend — hama import/route/resolution.

1) Hama safҳaҳoe, ki dar App.tsx istifoda meshavand, vujud dorand?
2) Hama module default export dorand?
3) Hama importҳoi nisbӣ resolve meshavand? (tsc inro ham mekunad, injo sanjishi yakum)
4) Kador safҳaҳo dar routho nest (dead) va kador dead ham dar routho nest?
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "src")
SRC = os.path.normpath(SRC)

problems = []
app_tsx = io.open(os.path.join(SRC, "App.tsx"), encoding="utf-8").read()

# --- 1) hama importҳoi nisбӣ дар tamomi ts/tsx resolve ---
exts = ("", ".ts", ".tsx", ".js", ".jsx")
dirs = ("", "index.ts", "index.tsx")

import_re = re.compile(
    r"""(?:import|export)[^'"]*from\s+['"](\.{1,2}/[^'"]+)['"]"""
    r"""|import\(\s*['"](\.{1,2}/[^'"]+)['"]\s*\)"""
)
n_imports = 0
n_files = 0
for root, _dirs, files in os.walk(SRC):
    if os.sep + "i18n" + os.sep in root + os.sep:
        continue
    for fn in files:
        if not fn.endswith((".ts", ".tsx")):
            continue
        n_files += 1
        path = os.path.join(root, fn)
        text = io.open(path, encoding="utf-8").read()
        for m in import_re.finditer(text):
            spec = m.group(1) or m.group(2)
            if not spec:
                continue
            n_imports += 1
            base = os.path.normpath(os.path.join(root, spec))
            if not any(os.path.exists(base + e) for e in exts):
                if not any(os.path.exists(os.path.join(base, d)) for d in ("index.ts", "index.tsx", "index.js")):
                    problems.append("RESOLVE: %s -> %s" % (fn, spec))

print("1) faylҳои сканшуда: %d | importҳoi nisбӣ: %d" % (n_files, n_imports))

# --- 2) safҳаҳои дар App.tsx истифодашуда вуҷуд доранд? ---
comp_re = re.compile(r"<([A-Z][A-Za-z0-9_]*)\s*/>")
used = set(comp_re.findall(app_tsx))
lazy_re = re.compile(r"import\(['\"]\./pages/([A-Za-z0-9_]+)['\"]\)")
used |= set(lazy_re.findall(app_tsx))
static_re = re.compile(r"import\s+([A-Z][A-Za-z0-9_]*)\s+from\s+['\"]\./pages/([A-Za-z0-9_]+)['\"]")
name_to_file = {}
for name, mod in static_re.findall(app_tsx):
    name_to_file[name] = mod
for name in sorted(used):
    if name not in name_to_file:
        continue
    f = os.path.join(SRC, "pages", name_to_file[name] + ".tsx")
    if not os.path.exists(f):
        problems.append("ROUTE: safҳаи норасида %s" % f)
print("2) komponentҳои дар App.tsx: %d ta" % len(used))

# --- 3) hama safҳаҳо default export доранд? ---
page_dir = os.path.join(SRC, "pages")
n_pages = 0
for fn in sorted(os.listdir(page_dir)):
    if not fn.endswith(".tsx"):
        continue
    n_pages += 1
    text = io.open(os.path.join(page_dir, fn), encoding="utf-8").read()
    if not re.search(r"export\s+default\s", text):
        problems.append("EXPORT: %s baydad default export doshta boshad" % fn)
print("3) safҳаҳо: %d ta, default export = %d ta"
      % (n_pages, n_pages - sum(1 for p in problems if p.startswith("EXPORT"))))

# --- 4) dead pages = dar listi safҳаҳо, lekin dar App.tsx nest ---
routed = set(lazy_re.findall(app_tsx)) | set(name_to_file.values())
dead = sorted(fn[:-4] for fn in os.listdir(page_dir)
              if fn.endswith(".tsx") and fn[:-4] not in routed)
print("4) safҳаҳои Routed: %d | DEAD (dar routho nest): %d" % (len(routed), len(dead)))
print("   ->", ", ".join(dead) if dead else "(холӣ)")

# --- 5) komponentҳои мурдаи layout ---
for stale in ("Navbar.tsx", "Sidebar.tsx"):
    p = os.path.join(SRC, "components", "layout", stale)
    if os.path.exists(p):
        text = io.open(p, encoding="utf-8").read()
        users = 0
        for root, _d, files in os.walk(SRC):
            for fn in files:
                if not fn.endswith((".ts", ".tsx")):
                    continue
                if fn == stale[:-4] + ".tsx" or fn == stale[:-4] + ".ts":
                    continue
                body = io.open(os.path.join(root, fn), encoding="utf-8").read()
                if re.search(r"from\s+['\"][^'\"]*%s['\"]" % re.escape(stale[:-4]), body):
                    users += 1
        print("5) %s -> %d istifodakunanda %s"
              % (stale, users, "(MURDA, metavonad nest kard)" if users == 0 else "(ZINDA)"))

print("")
if problems:
    print("MASEЛАҳо: %d" % len(problems))
    for p in problems:
        print("   !", p)
    print("NATIJA: FAIL")
else:
    print("NATIJA: OK")
