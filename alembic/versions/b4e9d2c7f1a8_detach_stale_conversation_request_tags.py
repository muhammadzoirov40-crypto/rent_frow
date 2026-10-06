"""Detach conversations whose rental request belongs to other people.

``conversations.rental_request_id`` is a pointer, and a pointer can outlive
what it points at. When a rental request is removed its id becomes free, the
next request created takes that id over, and the old conversation keeps
claiming it. On the live database this had already happened: a conversation
between two other users answered for request #39, so every attempt to write
the rental line into it failed with ``403: Not a participant in this
conversation`` - the request's own chat never got its history.

The application no longer trusts such a tag (it checks that the conversation
is between exactly the renter and the owner before using it); this migration
repairs the rows that are already wrong, so the data agrees with that rule.

Runs on SQLite and PostgreSQL unchanged - the subselect uses no dialect
feature, and clearing a pointer is reversible only by re-creating the
relationship, which no longer exists, so ``downgrade`` does nothing.

Revision ID: b4e9d2c7f1a8
Revises: a1c7f0d42b93
Create Date: 2026-10-05
"""

from alembic import op

revision = "b4e9d2c7f1a8"
down_revision = "a1c7f0d42b93"
branch_labels = None
depends_on = None


_STALE = """
    UPDATE conversations
       SET rental_request_id = NULL
     WHERE rental_request_id IS NOT NULL
       AND EXISTS (
            SELECT 1
              FROM rental_requests r
             WHERE r.id = conversations.rental_request_id
               AND NOT (
                    (r.renter_id = conversations.user1_id
                     AND r.owner_id = conversations.user2_id)
                 OR (r.renter_id = conversations.user2_id
                     AND r.owner_id = conversations.user1_id)
               )
       )
"""


def upgrade() -> None:
    op.execute(_STALE)


def downgrade() -> None:
    """The tag cannot be put back.

    It pointed at a request that no longer existed - there is nothing to
    restore it to. The relationship is rebuilt the next time that renter and
    owner open the chat, which is where the tag belongs anyway.
    """
    return None
