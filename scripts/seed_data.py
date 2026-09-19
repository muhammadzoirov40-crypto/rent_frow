import sqlite3
import uuid
from datetime import datetime

conn = sqlite3.connect("rentflow.db")
c = conn.cursor()

c.execute("SELECT COUNT(*) FROM categories")
if c.fetchone()[0] > 0:
    print("Data already exists, skipping seed.")
    conn.close()
    exit()

categories = [
    ("Power Tools", "Electric drills, saws, grinders and more"),
    ("Camping & Outdoor", "Tents, sleeping bags, camp stoves"),
    ("Photography", "Cameras, lenses, tripods, lighting"),
    ("Audio & Party", "Speakers, microphones, DJ equipment"),
    ("Garden & Lawn", "Mowers, trimmers, chainsaws"),
    ("Construction", "Concrete mixers, scaffolding, jackhammers"),
    ("Electronics", "Laptops, projectors, screens"),
    ("Sports & Fitness", "Bikes, treadmills, weights"),
]

for name, desc in categories:
    c.execute(
        "INSERT INTO categories (name, description, created_at) VALUES (?, ?, ?)",
        (name, desc, datetime.utcnow().isoformat()),
    )

equipment_data = [
    (1, "Makita Cordless Drill", "18V cordless drill with 2 batteries", "MKT-DR-001", 15.00, 50.00, "AVAILABLE", "GOOD"),
    (1, "DeWalt Circular Saw", "7-1/4 inch circular saw, 15A", "DW-CS-002", 20.00, 60.00, "AVAILABLE", "NEW"),
    (1, "Bosch Angle Grinder", "4.5 inch angle grinder", "BS-AG-003", 12.00, 40.00, "AVAILABLE", "GOOD"),
    (2, "Coleman 4-Person Tent", "Waterproof camping tent", "CL-TN-004", 10.00, 30.00, "AVAILABLE", "NEW"),
    (2, "Sleeping Bag Comfort", "Comfort rated to 0 degrees", "SB-CF-005", 8.00, 20.00, "AVAILABLE", "GOOD"),
    (3, "Canon EOS R6 Camera", "Mirrorless camera body", "CN-R6-006", 35.00, 200.00, "AVAILABLE", "NEW"),
    (3, "Tripod Manfrotto", "Aluminum tripod with bag", "MF-TR-007", 8.00, 25.00, "AVAILABLE", "GOOD"),
    (4, "JBL PartyBox Speaker", "Portable party speaker 100W", "JB-PB-008", 18.00, 50.00, "AVAILABLE", "NEW"),
    (4, "Wireless Microphone Set", "Dual wireless mic system", "WM-DS-009", 12.00, 30.00, "AVAILABLE", "GOOD"),
    (5, "Honda Lawn Mower", "Self-propelled lawn mower", "HN-LM-010", 25.00, 80.00, "AVAILABLE", "GOOD"),
    (6, "Concrete Mixer", "Electric concrete mixer 3.5 cu ft", "CM-35-011", 22.00, 70.00, "AVAILABLE", "FAIR"),
    (7, "Epson Projector", "1080p HD projector", "EP-1080-012", 20.00, 60.00, "AVAILABLE", "NEW"),
    (8, "Mountain Bike 26", "Full suspension mountain bike", "MT-26-013", 15.00, 45.00, "AVAILABLE", "GOOD"),
    (1, "Impact Driver Kit", "Makita impact driver with bits", "MK-ID-014", 14.00, 45.00, "AVAILABLE", "NEW"),
    (3, "GoPro Hero 12", "Action camera with accessories", "GP-H12-015", 25.00, 100.00, "AVAILABLE", "NEW"),
]

for cat_id, name, desc, serial, price, deposit, status, condition in equipment_data:
    c.execute(
        """INSERT INTO equipment (category_id, name, description, serial_number, price_per_day, deposit_amount, status, condition, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)""",
        (cat_id, name, desc, serial, price, deposit, status, condition, datetime.utcnow().isoformat(), datetime.utcnow().isoformat()),
    )

conn.commit()
print(f"Seeded {len(categories)} categories and {len(equipment_data)} equipment items.")
conn.close()
