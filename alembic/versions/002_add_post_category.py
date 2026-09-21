"""add category_id to posts

Revision ID: 002_add_post_category
Revises: 001_add_profile
Create Date: 2026-09-19
"""
from alembic import op
import sqlalchemy as sa

revision = "002_add_post_category"
down_revision = "001_add_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("category_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_posts_category_id", "posts", "categories", ["category_id"], ["id"])
    op.create_index("ix_posts_category_id", "posts", ["category_id"])


def downgrade() -> None:
    op.drop_index("ix_posts_category_id", table_name="posts")
    op.drop_constraint("fk_posts_category_id", "posts", type_="foreignkey")
    op.drop_column("posts", "category_id")
