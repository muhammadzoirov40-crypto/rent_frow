"""add OWNER to userrole enum

Revision ID: 005_add_owner_role
Revises: 004_add_category_start_date
Create Date: 2026-09-20
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005_add_owner_role"
down_revision: Union[str, None] = "004_add_category_start_date"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'OWNER'")


def downgrade() -> None:
    pass
