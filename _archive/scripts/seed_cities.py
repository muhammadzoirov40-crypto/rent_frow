import sqlite3

CITIES = [
    ("Душанбе", "Душанбе"),
    ("Хуҷанд", "Хуҷанд"),
    ("Бохтар", "Бохтар"),
    ("Кӯлоб", "Кӯлоб"),
    ("Ваҳдат", "Ваҳдат"),
    ("Турсунзода", "Турсунзода"),
    ("Истаравшан", "Истаравшан"),
    ("Конибодом", "Конибодом"),
    ("Панҷакент", "Панҷакент"),
    ("Қурғонтеппа", "Қурғонтеппа"),
]

DISTRICTS = {
    "Душанбе": ["Сино", "Фирӯзобод", "Шоҳмансур", "Исмоили Сомонӣ", "Рӯдакӣ"],
    "Хуҷанд": ["Markazi", "Сомониён", "Қирғизобод"],
}

conn = sqlite3.connect("rentflow.db")
c = conn.cursor()

c.execute("SELECT COUNT(*) FROM cities")
count = c.fetchone()[0]
if count == 0:
    for name, name_tj in CITIES:
        c.execute("INSERT INTO cities (name, name_tj, is_active, created_at) VALUES (?, ?, 1, datetime('now'))", (name, name_tj))
        city_id = c.lastrowid
        if name in DISTRICTS:
            for d_name in DISTRICTS[name]:
                c.execute("INSERT INTO districts (city_id, name, created_at) VALUES (?, ?, datetime('now'))", (city_id, d_name))
    conn.commit()
    print("Seeded 10 cities and districts")
else:
    print(f"Already {count} cities exist")

c.execute("SELECT * FROM cities")
for row in c.fetchall():
    print(row)

conn.close()
