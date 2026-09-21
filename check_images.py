import sqlite3, sys, os
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('rentflow.db')
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM listing_images WHERE image_url = '/uploads/placeholder.jpg'")
print('Placeholder count:', c.fetchone()[0])
c.execute("SELECT COUNT(*) FROM listing_images WHERE image_url != '/uploads/placeholder.jpg'")
print('Real images count:', c.fetchone()[0])
c.execute("SELECT id, image_url FROM listing_images WHERE image_url != '/uploads/placeholder.jpg' LIMIT 10")
for row in c.fetchall():
    exists = os.path.exists('.' + row[1])
    print(row, 'exists:', exists)
conn.close()
