#!/usr/bin/env python3
"""
Migration: create 'consumers' table for SQLite if not exists.
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


def migrate_create_consumers():
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
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS consumers (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                age INTEGER,
                phone VARCHAR(40),
                address VARCHAR(255),
                lat REAL,
                lng REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
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
    ok = migrate_create_consumers()
    print("\n✅ Done!" if ok else "\n❌ Failed.")