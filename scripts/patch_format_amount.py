import io
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..", "frontend", "src")

# .toLocaleString('ru-RU')  ->  formatAmount(<expr>)
# Only rewrites the argument, leaving the surrounding expression intact.
TARGETS = [
    "pages/AdminPage.tsx",
    "pages/DashboardPage.tsx",
    "pages/ListingPage.tsx",
    "pages/MessagesPage.tsx",
    "pages/ProfilePage.tsx",
    "pages/RentalRequestsPage.tsx",
    "pages/SettingsPage.tsx",
]

IMPORT_LINE = "import { formatAmount } from '../utils/format';\n"

# Match  <expr>.toLocaleString('ru-RU')   where <expr> is a simple member chain.
CALL = re.compile(r"([A-Za-z_$][\w$.]*(?:\([^()]*\))?)\.toLocaleString\('ru-RU'\)")


def convert(expr: str) -> str:
    # Math.round(x) -> formatAmount(Math.round(x)) keeps the rounding
    return f"formatAmount({expr})"


def main():
    for rel in TARGETS:
        path = os.path.join(ROOT, rel)
        with io.open(path, encoding="utf-8") as f:
            src = f.read()

        before = src
        src = CALL.sub(lambda m: convert(m.group(1)), src)

        if src == before:
            print("unchanged", rel)
            continue

        # Add the import right after the last top-of-file import if missing.
        if "utils/format" not in src:
            imports = list(re.finditer(r"^import .*?;\s*$", src, re.M))
            if imports:
                last = imports[-1]
                src = src[: last.end()] + "\n" + IMPORT_LINE.rstrip("\n") + src[last.end() :]
            else:
                src = IMPORT_LINE + src

        with io.open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(src)
        print("converted", rel)


if __name__ == "__main__":
    main()
