import sqlite3

conn = sqlite3.connect("rentflow.db")
c = conn.cursor()

# --- POSTS (posts + comments + likes) ---
c.execute("SELECT COUNT(*) FROM posts"); n_posts = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM comments"); n_comments = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM likes"); n_likes = c.fetchone()[0]

c.execute("DELETE FROM likes")
c.execute("DELETE FROM comments")
c.execute("DELETE FROM posts")

# --- LISTINGS (listings + images + favorites + rental_requests + reviews) ---
c.execute("SELECT COUNT(*) FROM listings"); n_listings = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM listing_images"); n_images = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM favorites"); n_fav = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM rental_requests"); n_rr = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM reviews"); n_rev = c.fetchone()[0]

c.execute("DELETE FROM favorites")
c.execute("DELETE FROM rental_requests")
c.execute("DELETE FROM reviews")
c.execute("DELETE FROM listing_images")
c.execute("DELETE FROM listings")

# Conversations: detach listing_id (keep conversations themselves)
c.execute("UPDATE conversations SET listing_id = NULL WHERE listing_id IS NOT NULL")

conn.commit()

# Verify
for t in ["posts", "comments", "likes", "listings", "listing_images", "favorites", "rental_requests", "reviews"]:
    c.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"{t}: {c.fetchone()[0]}")

conn.close()
print("\nDeleted before:")
print(f"  posts={n_posts}, comments={n_comments}, likes={n_likes}")
print(f"  listings={n_listings}, images={n_images}, favorites={n_fav}, rental_requests={n_rr}, reviews={n_rev}")
