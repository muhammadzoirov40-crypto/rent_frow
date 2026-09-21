"""add start_date to categories

Revision ID: 004_add_category_start_date
Revises: 003_add_owner_id
Create Date: 2026-09-20
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004_add_category_start_date"
down_revision: Union[str, None] = "003_add_owner_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("start_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("categories", "start_date")
