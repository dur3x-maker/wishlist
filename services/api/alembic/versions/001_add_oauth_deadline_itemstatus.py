"""add oauth fields, deadline, itemstatus funded/expired

Revision ID: 001_oauth_deadline
Revises:
Create Date: 2026-02-16
"""
from alembic import op
import sqlalchemy as sa

revision = "001_oauth_deadline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users table: add oauth_provider, oauth_id ---
    op.add_column(
        "users",
        sa.Column("oauth_provider", sa.String(50), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("oauth_id", sa.String(255), nullable=True),
    )

    # --- users table: make password_hash nullable (for OAuth-only users) ---
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(128),
        nullable=True,
    )

    # --- wishlists table: add deadline ---
    op.add_column(
        "wishlists",
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
    )

    # --- ItemStatus enum: add 'funded' and 'expired' values ---
    # PostgreSQL requires ALTER TYPE ... ADD VALUE for native enums.
    # These statements are idempotent: IF NOT EXISTS prevents errors on re-run.
    # IMPORTANT: ALTER TYPE ... ADD VALUE cannot run inside a transaction in PG < 12.
    # For PG 12+ (Render uses PG 14+), it works inside transactions.
    op.execute("ALTER TYPE itemstatus ADD VALUE IF NOT EXISTS 'funded'")
    op.execute("ALTER TYPE itemstatus ADD VALUE IF NOT EXISTS 'expired'")


def downgrade() -> None:
    op.drop_column("wishlists", "deadline")
    op.drop_column("users", "oauth_id")
    op.drop_column("users", "oauth_provider")
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(128),
        nullable=False,
    )
    # NOTE: PostgreSQL does not support removing values from an enum type.
    # To fully downgrade itemstatus, you would need to:
    #   1. Create a new enum without 'funded'/'expired'
    #   2. Alter the column to use the new enum
    #   3. Drop the old enum
    # This is intentionally left out for safety.
