import asyncio
from app.core.database import engine, Base, async_session_factory
from app.models import *  # noqa - ensure all models are loaded
from app.models.category import Category
from app.models.equipment import Equipment
from app.core.enums import EquipmentStatus, EquipmentCondition

CATEGORIES = [
    {"name": "Power Tools", "description": "Drills, saws, grinders, and other power tools"},
    {"name": "Camping & Outdoor", "description": "Tents, sleeping bags, lanterns, and outdoor gear"},
    {"name": "Photography", "description": "Cameras, lenses, tripods, and lighting equipment"},
    {"name": "Audio & Party", "description": "Speakers, microphones, DJ equipment, and sound systems"},
    {"name": "Garden & Lawn", "description": "Mowers, trimmers, blowers, and garden tools"},
    {"name": "Construction", "description": "Heavy-duty tools for construction and renovation"},
    {"name": "Electronics", "description": "Laptops, tablets, projectors, and other electronics"},
    {"name": "Sports & Fitness", "description": "Exercise equipment, bikes, and sports gear"},
]

EQUIPMENT = [
    {"name": "Makita Impact Drill", "description": "18V cordless impact driver, ideal for wood and metal drilling. Includes 2 batteries and charger.", "serial_number": "PT-001", "price_per_day": 15.00, "deposit_amount": 50.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop", "category_idx": 0},
    {"name": "DeWalt Circular Saw", "description": "7-1/4 inch cordless circular saw with brushless motor. Cuts through plywood and 2x4s easily.", "serial_number": "PT-002", "price_per_day": 20.00, "deposit_amount": 75.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.NEW, "image_url": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop", "category_idx": 0},
    {"name": "Bosch Angle Grinder", "description": "4.5 inch angle grinder with 850W motor. Perfect for cutting and grinding metal.", "serial_number": "PT-003", "price_per_day": 12.00, "deposit_amount": 40.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=300&fit=crop", "category_idx": 0},
    {"name": "Makita Reciprocating Saw", "description": "18V cordless reciprocating saw for demolition and pruning. Variable speed trigger.", "serial_number": "PT-004", "price_per_day": 18.00, "deposit_amount": 60.00, "status": EquipmentStatus.RENTED, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1530124566582-a45a7c7cefca?w=400&h=300&fit=crop", "category_idx": 0},
    {"name": "4-Person Dome Tent", "description": "Waterproof dome tent with mesh windows. Easy setup in 10 minutes. Includes carry bag.", "serial_number": "CO-001", "price_per_day": 25.00, "deposit_amount": 80.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop", "category_idx": 1},
    {"name": "LED Camping Lantern", "description": "Rechargeable LED lantern with 1000 lumens. 3 brightness modes, lasts 12 hours.", "serial_number": "CO-002", "price_per_day": 5.00, "deposit_amount": 15.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.NEW, "image_url": "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=400&h=300&fit=crop", "category_idx": 1},
    {"name": "Sleeping Bag - Cold Weather", "description": "Comfort-rated to -10C. Lightweight synthetic fill with compression sack.", "serial_number": "CO-003", "price_per_day": 10.00, "deposit_amount": 30.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=400&h=300&fit=crop", "category_idx": 1},
    {"name": "Portable BBQ Grill", "description": "Compact charcoal grill with legs. Perfect for camping trips and picnics.", "serial_number": "CO-004", "price_per_day": 15.00, "deposit_amount": 40.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.FAIR, "image_url": "https://images.unsplash.com/photo-1529262365831-06d4a988275b?w=400&h=300&fit=crop", "category_idx": 1},
    {"name": "Canon EOS R50 Camera", "description": "24.2MP mirrorless camera with 18-45mm kit lens. 4K video recording.", "serial_number": "PH-001", "price_per_day": 45.00, "deposit_amount": 200.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.NEW, "image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop", "category_idx": 2},
    {"name": "Manfrotto Tripod", "description": "190XPRO3 aluminum tripod with ball head. Max height 170cm, supports 7kg.", "serial_number": "PH-002", "price_per_day": 12.00, "deposit_amount": 50.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1606986628284-4e8e6f46e3e7?w=400&h=300&fit=crop", "category_idx": 2},
    {"name": "Ring Light 18 inch", "description": "Professional 18-inch ring light with stand and phone holder. Adjustable color temperature.", "serial_number": "PH-003", "price_per_day": 10.00, "deposit_amount": 35.00, "status": EquipmentStatus.RENTED, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=400&h=300&fit=crop", "category_idx": 2},
    {"name": "JBL PartyBox 310", "description": "Portable party speaker with 240W output. Light show, karaoke, and 18-hour battery.", "serial_number": "AP-001", "price_per_day": 35.00, "deposit_amount": 150.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.NEW, "image_url": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=300&fit=crop", "category_idx": 3},
    {"name": "Shure SM58 Microphone", "description": "Industry-standard dynamic vocal microphone. Includes XLR cable and stand clip.", "serial_number": "AP-002", "price_per_day": 8.00, "deposit_amount": 30.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=300&fit=crop", "category_idx": 3},
    {"name": "DJ Controller Pioneer", "description": "Pioneer DDJ-400 2-channel DJ controller. Includes headphones and USB cable.", "serial_number": "AP-003", "price_per_day": 40.00, "deposit_amount": 180.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=300&fit=crop", "category_idx": 3},
    {"name": "Electric Lawn Mower", "description": "1800W electric mower with 38cm cutting width. 5 height settings, 45L collection box.", "serial_number": "GL-001", "price_per_day": 20.00, "deposit_amount": 70.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400&h=300&fit=crop", "category_idx": 4},
    {"name": "Leaf Blower", "description": "2200W electric leaf blower with vacuum function. 3 speed settings.", "serial_number": "GL-002", "price_per_day": 10.00, "deposit_amount": 35.00, "status": EquipmentStatus.MAINTENANCE, "condition": EquipmentCondition.FAIR, "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop", "category_idx": 4},
    {"name": "Rotary Hammer Drill", "description": "SDS-Plus rotary hammer with 800W motor. 3 modes: drill, hammer, chisel.", "serial_number": "CN-001", "price_per_day": 25.00, "deposit_amount": 100.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop", "category_idx": 5},
    {"name": "Welding Machine", "description": "MIG/MAG welding machine 200A with gas bottle. For steel and stainless steel.", "serial_number": "CN-002", "price_per_day": 35.00, "deposit_amount": 150.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop", "category_idx": 5},
    {"name": "Epson Projector", "description": "Full HD 1080p projector with 3500 lumens. HDMI, USB, WiFi connectivity.", "serial_number": "EL-001", "price_per_day": 30.00, "deposit_amount": 120.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=300&fit=crop", "category_idx": 6},
    {"name": "MacBook Air M2", "description": "13.6-inch Liquid Retina, 8GB RAM, 256GB SSD. Perfect for presentations and work.", "serial_number": "EL-002", "price_per_day": 50.00, "deposit_amount": 300.00, "status": EquipmentStatus.RESERVED, "condition": EquipmentCondition.NEW, "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop", "category_idx": 6},
    {"name": "Foldable Exercise Bike", "description": "Magnetic resistance exercise bike with LCD monitor. 8 resistance levels.", "serial_number": "SF-001", "price_per_day": 12.00, "deposit_amount": 50.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.GOOD, "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop", "category_idx": 7},
    {"name": "Yoga Mat + Blocks Set", "description": "Premium 6mm yoga mat with 2 foam blocks and strap. Non-slip surface.", "serial_number": "SF-002", "price_per_day": 5.00, "deposit_amount": 15.00, "status": EquipmentStatus.AVAILABLE, "condition": EquipmentCondition.NEW, "image_url": "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=400&h=300&fit=crop", "category_idx": 7},
]


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created!")

    async with async_session_factory() as session:
        from sqlalchemy import select, func
        result = await session.execute(select(func.count()).select_from(Category))
        count = result.scalar()
        if count and count > 0:
            print(f"Database already has {count} categories. Skipping seed.")
            return

        category_map = {}
        for cat_data in CATEGORIES:
            cat = Category(**cat_data)
            session.add(cat)
            await session.flush()
            category_map[cat_data["name"]] = cat.id
            print(f"  + {cat_data['name']} (id={cat.id})")

        for eq_data in EQUIPMENT:
            cat_idx = eq_data.pop("category_idx")
            cat_name = CATEGORIES[cat_idx]["name"]
            eq_data["category_id"] = category_map[cat_name]
            eq = Equipment(**eq_data)
            session.add(eq)
            print(f"  + {eq_data['name']} -> {cat_name}")

        await session.commit()
        print(f"\nDone! Seeded {len(CATEGORIES)} categories and {len(EQUIPMENT)} equipment items.")


if __name__ == "__main__":
    asyncio.run(main())
