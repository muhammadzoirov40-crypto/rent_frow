"""Browser audit — hama routeҳоро dar Chrome headless sanjidan.

Baroi har route:
  1) DOM-и render-shuda (--dump-dom)
  2) screenshot (--screenshot)
  3) tahlil: matn, linkҳo, buttonҳo, imgҳo, khatoҳo

Khatoҳo:
  RAW_KEY   = kalimai i18n dar screen (masalan "common.days")
  UNDEFINED = undefined / NaN / [object Object]
  EMPTY     = saҳfa matn nadorad
  REDIRECT  = ba /login ravgard (baroi routeҳoi hifzshuda)
  BROKENIMG = img kushoda nameshavad
  BROKENLNK = link ba routei vujudnadora
"""
import io
import json
import os
import re
import subprocess
import sys
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = "http://localhost:3000"
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "audit")
PROFILE = os.path.join(OUT, ".profile")

ROUTES = [
    ("01-home", "/"),
    ("02-search", "/search"),
    ("03-listing", "/listing/3"),
    ("04-login", "/login"),
    ("05-register", "/register"),
    ("06-404", "/this-route-does-not-exist"),
    ("07-revenlo", "/revenlo"),
    ("08-dashboard", "/dashboard"),
    ("09-create-listing", "/create-listing"),
    ("10-favorites", "/favorites"),
    ("11-messages", "/messages"),
    ("12-profile", "/profile"),
    ("13-rental-requests", "/rental-requests"),
    ("14-notifications", "/notifications"),
    ("15-settings", "/settings"),
    ("16-admin", "/admin"),
    ("17-terms", "/terms"),
    ("18-privacy", "/privacy"),
]

KNOWN_ROUTE_RE = re.compile(
    r"^(/|/search|/listing/\d+|/login|/register|/revenlo.*|/dashboard"
    r"|/create-listing|/favorites|/messages|/profile|/rental-requests"
    r"|/notifications|/settings|/admin|/terms|/privacy|/forgot.*)$"
)
RAW_KEY_RE = re.compile(r"^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_]+){1,}$")
RAW_KEY_PREFIXES = (
    "common", "search", "home", "header", "nav", "listing", "profile", "settings",
    "admin", "notifications", "favorites", "messages", "auth", "footer", "subnav",
    "createListing", "rentalRequests", "dashboard", "bookings", "rentals",
    "equipment", "time", "categories", "listingCard", "validation",
)


class PageParser(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "head", "template"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self._skip = 0
        self._buf = []
        self.text_chunks = []
        self.links = []       # (href, text)
        self._href = None
        self._a_buf = []
        self.images = []      # src
        self._cur_img = None
        self.has_root_children = False
        self._in_root = False
        self._root_depth = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in self.SKIP:
            self._skip += 1
            return
        if tag == "a":
            self._href = a.get("href")
            self._a_buf = []
        elif tag == "img":
            src = a.get("src")
            if src:
                self.images.append(src)
        if a.get("id") == "root" or a.get("class", "").startswith("min-h-screen"):
            self._in_root = True
            self._root_depth = 0

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self._skip = max(0, self._skip - 1)
            return
        if tag == "a" and self._href is not None:
            txt = " ".join("".join(self._a_buf).split())
            self.links.append((self._href, txt[:120]))
            self._href = None
            self._a_buf = []

    def handle_data(self, data):
        if self._skip:
            return
        if data and data.strip():
            self.text_chunks.append(data.strip())
            if self._href is not None:
                self._a_buf.append(data)


def run_chrome(url, mode, extra_out=None):
    """mode: 'dom' | 'shot'."""
    os.makedirs(PROFILE, exist_ok=True)
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--disable-extensions",
        "--no-first-run",
        "--user-data-dir=" + PROFILE,
        "--window-size=1440,900",
        "--virtual-time-budget=12000",
        "--enable-logging=stderr",
        "--log-level=0",
    ]
    if mode == "dom":
        cmd += ["--dump-dom", url]
    else:
        cmd += ["--screenshot=" + extra_out, url]
    try:
        p = subprocess.run(cmd, capture_output=True, timeout=90)
    except subprocess.TimeoutExpired:
        return "", "(timeout)"
    out = p.stdout.decode("utf-8", "replace")
    err = p.stderr.decode("utf-8", "replace")
    return out, err


def http_status(url, timeout=10):
    try:
        req = Request(url, headers={"User-Agent": "audit"})
        with urlopen(req, timeout=timeout) as r:
            return r.status
    except HTTPError as e:
        return e.code
    except (URLError, Exception):
        return 0


def analyse(dom):
    p = PageParser()
    try:
        p.feed(dom)
    except Exception as e:
        return {"parse_error": str(e)}
    text = " ".join(p.text_chunks)
    issues = []

    keys = sorted({
        c for c in p.text_chunks
        if RAW_KEY_RE.match(c) and c.split(".")[0] in RAW_KEY_PREFIXES
    })
    if keys:
        issues.append(("RAW_KEY", ", ".join(keys[:8])))

    for bad in ("undefined", "NaN", "[object Object]"):
        if re.search(r"\b%s\b" % re.escape(bad), text):
            issues.append(("BAD_TOKEN", bad))

    if len(text) < 60:
        issues.append(("EMPTY", "matn=%d simvol" % len(text)))

    raw_keys = [h for h, _ in p.links if h and h.startswith("/") and not KNOWN_ROUTE_RE.match(h.split("?")[0])]
    if raw_keys:
        issues.append(("BROKENLNK", ", ".join(sorted(set(raw_keys))[:6])))

    return {
        "chars": len(text),
        "text": text,
        "links": p.links,
        "images": p.images,
        "issues": issues,
        "sample": " | ".join(p.text_chunks[:14])[:400],
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".png") or f.endswith(".json"):
            os.remove(os.path.join(OUT, f))

    report = []
    all_imgs = set()
    login_text = None

    for name, route in ROUTES:
        url = BASE + route
        dom, err = run_chrome(url, "dom")
        shot = os.path.join(OUT, "shot-%s.png" % name)
        run_chrome(url, "shot", shot)

        info = analyse(dom)
        info["route"] = route
        info["name"] = name
        info["shot"] = os.path.basename(shot) if os.path.exists(shot) else None
        info["console"] = [
            l for l in err.splitlines()
            if "CONSOLE" in l or "Uncaught" in l or "ERROR:" in l
        ][:6]

        if route == "/login":
            login_text = info.get("text", "")
        elif route in ("/create-listing", "/favorites", "/messages", "/profile",
                       "/rental-requests", "/notifications", "/settings", "/admin",
                       "/dashboard"):
            if login_text and info.get("text") and info["text"][:400] == login_text[:400]:
                info["issues"].append(("REDIRECT", "ba /login ravgard (intizom=True)"))

        for src in info.get("images", []):
            if src.startswith("http") or src.startswith("/"):
                all_imgs.add(src)

        report.append(info)
        print("%-18s -> chars=%-5s links=%-3s imgs=%-3s shot=%-3s issues=%s"
              % (route, info.get("chars", 0), len(info.get("links", [])),
                 len(info.get("images", [])), "OK" if info["shot"] else "-",
                 [i[0] for i in info["issues"]] or "none"))

    # IMG санҷиш
    broken_imgs = []
    for src in sorted(all_imgs):
        u = src if src.startswith("http") else BASE + src
        st = http_status(u)
        if st != 200:
            broken_imgs.append((src, st))

    summary = {
        "routes": [
            {k: v for k, v in r.items() if k != "text"} for r in report
        ],
        "broken_images": broken_imgs,
        "total_issues": sum(len(r["issues"]) for r in report),
    }
    with io.open(os.path.join(OUT, "report.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print("\n===== JAM =====")
    print("Routeҳо: %d | Maselaҳo: %d | Imgҳoi buzd: %d"
          % (len(report), summary["total_issues"], len(broken_imgs)))
    for r in report:
        for kind, val in r["issues"]:
            print("  [%s] %-18s %s: %s" % (kind, r["route"], r["name"], val))
    for src, st in broken_imgs:
        print("  [BROKENIMG] %s -> %s" % (src, st))
    print("\nScreenshots -> audit/")


if __name__ == "__main__":
    main()
