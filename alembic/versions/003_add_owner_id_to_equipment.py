"""add owner_id to equipment

Revision ID: 003_add_owner_id
Revises: 002_add_post_category
Create Date: 2026-09-20
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003_add_owner_id"
down_revision: Union[str, None] = "002_add_post_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("equipment", sa.Column("owner_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_equipment_owner_id", "equipment", "users", ["owner_id"], ["id"])
    op.create_index("ix_equipment_owner_id", "equipment", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_equipment_owner_id", table_name="equipment")
    op.drop_constraint("fk_equipment_owner_id", "equipment", type_="foreignkey")
    op.drop_column("equipment", "owner_id")
