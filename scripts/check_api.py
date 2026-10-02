"""Sanjishi 8: API sanjish — dah ta darkhost.

Baraye harkat farq: 200 (kor), 422 (parametri nodorust baydad girifta shavad),
404 (route nest). 500 = KHATO (backend dar DB mekhost).
"""
import io
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

CASES = [
    # (tartib, URL, intizomi shuda)
    (1, "/health", {200}),
    (2, "/api/v1/listings", {200}),
    (3, "/api/v1/listings?property_type=apartment", {200}),
    (4, "/api/v1/listings?property_type=zzz", {422}),
    (5, "/api/v1/listings?verification_status=zzz", {422}),
    (6, "/api/v1/listings?price_unit=zzz", {422}),
    (7, "/api/v1/listings?min_rating=9", {422}),
    (8, "/api/v1/listings?page=0", {422}),
    (9, "/api/v1/categories", {200}),
    (10, "/api/v1/cities", {200}),
]

# Bahoi ilovagi: payvastagihoi backend
EXTRA = [
    ("/api/v1/listings?category_id=1&rooms_min=2&furnished=true", {200}),
    ("/api/v1/listings?start_date=2026-10-05&end_date=2026-10-07", {200}),
    ("/api/v1/route-does-not-exist", {404}),
]

results = []
with TestClient(app) as client:
    for order, url, expected in CASES:
        try:
            resp = client.get(url)
            code = resp.status_code
        except Exception as exc:  # pragma: no cover
            code = "EXC:%s" % type(exc).__name__
        ok = code in expected
        results.append(ok)
        print("%-2s %-62s -> %-4s %s  (intizom: %s)"
              % (order, url, code, "OK" if ok else "FAIL", sorted(expected)))

    for url, expected in EXTRA:
        try:
            resp = client.get(url)
            code = resp.status_code
        except Exception as exc:  # pragma: no cover
            code = "EXC:%s" % type(exc).__name__
        ok = code in expected
        results.append(ok)
        print("-  %-62s -> %-4s %s  (intizom: %s)"
              % (url, code, "OK" if ok else "FAIL", sorted(expected)))

    # Modelho: kategoriya baydad category_group, shahr baydad lat/lng doshta boshad
    cats = client.get("/api/v1/categories").json()
    data = cats.get("data")
    if isinstance(data, dict):
        data = data.get("items") or data.get("categories") or []
    grp = [c.get("category_group") for c in (data or [])]
    have_group = bool(grp) and all(grp)
    print("\nCategories: %d ta, category_group=%s -> %s"
          % (len(data or []), sorted(set(grp)), "OK" if have_group else "FAIL"))
    results.append(have_group)

    names_ok = all(
        (c.get("name_tj") and c.get("name_en")) for c in (data or [])
    )
    print("Categories name_tj/name_en mumtoz -> %s" % ("OK" if names_ok else "FAIL"))
    results.append(names_ok)

    cts = client.get("/api/v1/cities").json()
    cdata = cts.get("data")
    if isinstance(cdata, dict):
        cdata = cdata.get("items") or cdata.get("cities") or []
    lat_ok = bool(cdata) and all(
        c.get("latitude") is not None and c.get("longitude") is not None
        for c in cdata
    )
    print("Cities: %d ta, lat/lng purra -> %s" % (len(cdata or []), "OK" if lat_ok else "FAIL"))
    results.append(lat_ok)

failed = results.count(False)
print("\nNATIJA (API): %d/%d OK  -> %s" % (len(results) - failed, len(results),
                                           "OK" if failed == 0 else "FAIL"))
