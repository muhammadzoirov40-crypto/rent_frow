from sqlalchemy import create_engine, text
from app.core.config import get_settings
from app.core.database import Base
from app.models import user, equipment, category, booking, rental, payment, penalty, inspection, maintenance, audit_log, post, review, comment

settings = get_settings()
url = settings.DATABASE_URL.replace('+asyncpg', '+psycopg2')
engine = create_engine(url)

db_tables = set()
with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' GROUP BY table_name"
    ))
    for r in rows:
        db_tables.add(r[0])

orm_tables = set(Base.metadata.tables.keys())

print("DB tables:", sorted(db_tables))
print("ORM tables:", sorted(orm_tables))

missing_in_db = orm_tables - db_tables
missing_in_orm = db_tables - orm_tables
if missing_in_db:
    print("MISSING in DB:", missing_in_db)
if missing_in_orm:
    print("Extra in DB (no model):", missing_in_orm)
if not missing_in_db and not missing_in_orm:
    print("All tables match!")
