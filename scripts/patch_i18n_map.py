import json
import io
import collections
import os

LOCALES = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "i18n", "locales")

SEARCH_KEYS = {
    "en": {
        "mapView": "Map",
        "mapNoPins": "No pinned listings in this area yet",
        "mapHint": "Click a pin to open the listing",
        "listView": "List",
        "gridView": "Grid",
    },
    "ru": {
        "mapView": "Карта",
        "mapNoPins": "На этой карте пока нет объявлений",
        "mapHint": "Нажмите на метку, чтобы открыть объявление",
        "listView": "Список",
        "gridView": "Плитка",
    },
    "tj": {
        "mapView": "Харита",
        "mapNoPins": "Дар ин ҷо ҳанӯз эълонҳо нест",
        "mapHint": "Барои кушодани эълон ба нишона клик кунед",
        "listView": "Рӯйхат",
        "gridView": "Плитка",
    },
}


def main():
    for lang, keys in SEARCH_KEYS.items():
        path = os.path.join(LOCALES, f"{lang}.json")
        with io.open(path, encoding="utf-8") as f:
            data = json.load(f, object_pairs_hook=collections.OrderedDict)
        target = data.setdefault("search", collections.OrderedDict())
        added = []
        for k, v in keys.items():
            if k in target:
                continue  # never clobber an existing translation
            target[k] = v
            added.append(k)
        with io.open(path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("patched", path, "added:", added)


if __name__ == "__main__":
    main()
