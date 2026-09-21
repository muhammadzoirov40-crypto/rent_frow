import sqlite3

conn = sqlite3.connect("rentflow.db")
c = conn.cursor()

c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print("Tables:", tables)

if "cities" in tables:
    c.execute("SELECT * FROM cities")
    rows = c.fetchall()
    print(f"Cities ({len(rows)}):", rows)
else:
    print("No cities table found")

conn.close()
