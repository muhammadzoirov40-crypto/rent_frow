import sqlite3

conn = sqlite3.connect("rentflow.db")
cur = conn.cursor()

rows = cur.execute(
    "SELECT id, email, role FROM users WHERE email LIKE '%muhammadzoirov%'"
).fetchall()
print("before:", rows)

cur.execute(
    "UPDATE users SET role='ADMIN' WHERE email LIKE '%muhammadzoirov%'"
)
conn.commit()

rows = cur.execute(
    "SELECT id, email, role FROM users WHERE email LIKE '%muhammadzoirov%'"
).fetchall()
print("after:", rows)
conn.close()
