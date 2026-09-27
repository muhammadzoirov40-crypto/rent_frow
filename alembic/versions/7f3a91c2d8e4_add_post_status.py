"""add post status for moderation

Revision ID: 7f3a91c2d8e4
Revises: d8a01082bf45
Create Date: 2026-09-26 08:30:00
"""

from alembic import op
import sqlalchemy as sa

revision = "7f3a91c2d8e4"
down_revision = "d8a01082bf45"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "posts",
        sa.Column("status", sa.String(length=16), nullable=False, server_default="approved"),
    )


def downgrade() -> None:
    op.drop_column("posts", "status")
