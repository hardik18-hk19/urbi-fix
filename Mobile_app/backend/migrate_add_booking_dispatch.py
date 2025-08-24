#!/usr/bin/env python3
"""
Migration script to add dispatch_queue and dispatch_idx columns to bookings table.
Run once after pulling changes to update existing SQLite DB.
"""
import sqlite3
import os
from app.config import settings


def _resolve_sqlite_path(url: str) -> str | None:
    """Return absolute filesystem path for a sqlite DATABASE_URL.
    Supports:
    - sqlite:///relative/path.db
    - sqlite:////absolute/path.db (POSIX style)
    - sqlite:///C:/absolute/windows/path.db (Windows style)
    """
    if not url.startswith("sqlite///") and not url.startswith("sqlite:///"):
        return None
    raw_path = url.replace("sqlite:///", "", 1)
    # If POSIX absolute style with leading double slash left from four slashes
    if raw_path.startswith("/") and os.name == "nt":
        # On Windows, strip leading slash like "/C:/..."
        raw_path = raw_path.lstrip("/")
    # If already absolute, return as-is
    if os.path.isabs(raw_path):
        return raw_path
    # Make it relative to the backend directory (same folder as this script)
    backend_dir = os.path.dirname(__file__)  # .../backend
    return os.path.abspath(os.path.join(backend_dir, raw_path))


def migrate_add_booking_dispatch():
    db_path = _resolve_sqlite_path(settings.DATABASE_URL)
    if not db_path:
        print("This migration script only supports SQLite DATABASE_URL")
        return False

    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(bookings)")
        cols = [c[1] for c in cur.fetchall()]

        if 'dispatch_queue' not in cols:
            print("Adding dispatch_queue column to bookings ...")
            # JSON maps to TEXT in SQLite
            cur.execute("ALTER TABLE bookings ADD COLUMN dispatch_queue TEXT")
        else:
            print("dispatch_queue column already exists")

        if 'dispatch_idx' not in cols:
            print("Adding dispatch_idx column to bookings ...")
            cur.execute("ALTER TABLE bookings ADD COLUMN dispatch_idx INTEGER DEFAULT 0")
        else:
            print("dispatch_idx column already exists")

        conn.commit()
        conn.close()
        print("Migration completed successfully!")
        return True
    except Exception as e:
        print(f"Migration failed: {e}")
        try:
            conn.close()
        except Exception:
            pass
        return False


if __name__ == "__main__":
    ok = migrate_add_booking_dispatch()
    print("\n✅ Done!" if ok else "\n❌ Failed.")