import json
import io
import collections
import os

LOCALES = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "i18n", "locales")

# Shared relative-time keys used by timeAgo() across Header/Messages/Notifications.
TIME = {
    "en": {
        "justNow": "just now",
        "minutesAgo": "{{count}} min ago",
        "hoursAgo": "{{count}} h ago",
        "daysAgo": "{{count}} d ago",
        "monthsAgo": "{{count}} mo ago",
    },
    "ru": {
        "justNow": "только что",
        "minutesAgo": "{{count}} мин назад",
        "hoursAgo": "{{count}} ч назад",
        "daysAgo": "{{count}} дн назад",
        "monthsAgo": "{{count}} мес назад",
    },
    "tj": {
        "justNow": "ҳозир",
        "minutesAgo": "{{count}} дақиқа пеш",
        "hoursAgo": "{{count}} соат пеш",
        "daysAgo": "{{count}} рӯз пеш",
        "monthsAgo": "{{count}} моҳ пеш",
    },
}


def main():
    for lang, keys in TIME.items():
        path = os.path.join(LOCALES, f"{lang}.json")
        with io.open(path, encoding="utf-8") as f:
            data = json.load(f, object_pairs_hook=collections.OrderedDict)
        target = data.setdefault("time", collections.OrderedDict())
        added = [k for k in keys if k not in target]
        for k, v in keys.items():
            target.setdefault(k, v)
        with io.open(path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("patched", path, "added:", added)


if __name__ == "__main__":
    main()
