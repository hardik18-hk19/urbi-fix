#!/usr/bin/env python3
"""
Migration script to add eta_minutes, price_amount, price_currency columns to bookings table.
Run once after pulling changes to update existing SQLite DB.
"""
import sqlite3
import os
from app.config import settings


def _resolve_sqlite_path(url: str) -> str | None:
    if not url.startswith("sqlite:///"):
        return None
    raw_path = url.replace("sqlite:///", "", 1)
    if raw_path.startswith("/") and os.name == "nt":
        raw_path = raw_path.lstrip("/")
    if os.path.isabs(raw_path):
        return raw_path
    backend_dir = os.path.dirname(__file__)
    return os.path.abspath(os.path.join(backend_dir, raw_path))


def migrate_add_booking_offer():
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

        if 'eta_minutes' not in cols:
            print("Adding eta_minutes column to bookings ...")
            cur.execute("ALTER TABLE bookings ADD COLUMN eta_minutes INTEGER")
        else:
            print("eta_minutes column already exists")

        if 'price_amount' not in cols:
            print("Adding price_amount column to bookings ...")
            cur.execute("ALTER TABLE bookings ADD COLUMN price_amount REAL")
        else:
            print("price_amount column already exists")

        if 'price_currency' not in cols:
            print("Adding price_currency column to bookings ...")
            cur.execute("ALTER TABLE bookings ADD COLUMN price_currency VARCHAR(8)")
        else:
            print("price_currency column already exists")

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
    ok = migrate_add_booking_offer()
    print("\n✅ Done!" if ok else "\n❌ Failed.")