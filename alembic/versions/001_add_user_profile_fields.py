"""add user profile fields (display_name, avatar_url)

Revision ID: 001_add_profile
Revises: 
Create Date: 2026-09-18
"""
from alembic import op
import sqlalchemy as sa

revision = "001_add_profile"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(512), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "display_name")
