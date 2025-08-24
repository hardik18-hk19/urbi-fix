#!/usr/bin/env python3
"""
Migration: add 'embedding' JSON column to providers table (SQLite only).
Run once after pulling changes.
"""
import sqlite3
import os
from app.config import settings


def _resolve_sqlite_path(url: str) -> str | None:
    if not url.startswith("sqlite///") and not url.startswith("sqlite:///"):
        return None
    raw_path = url.replace("sqlite:///", "", 1)
    if raw_path.startswith("/") and os.name == "nt":
        raw_path = raw_path.lstrip("/")
    if os.path.isabs(raw_path):
        return raw_path
    backend_dir = os.path.dirname(__file__)
    return os.path.abspath(os.path.join(backend_dir, raw_path))


def migrate_add_embedding():
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
        cur.execute("PRAGMA table_info(providers)")
        cols = [c[1] for c in cur.fetchall()]
        if 'embedding' not in cols:
            print("Adding embedding column to providers ...")
            # SQLite does not have native JSON type; store as TEXT
            cur.execute("ALTER TABLE providers ADD COLUMN embedding TEXT")
        else:
            print("embedding column already exists")
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
    ok = migrate_add_embedding()
    print("\n✅ Done!" if ok else "\n❌ Failed.")