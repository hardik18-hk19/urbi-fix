# backend/migrate_add_forum_posts.py
"""
SQLite ad-hoc migration helper for adding forum_posts table.
Run this once if your existing DB predates this feature.
"""
import sqlite3

def run(db_path="backend/data.db"):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS forum_posts (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            author_id INTEGER,
            author_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            issue_id INTEGER,
            fundraiser_id INTEGER
        );
        """
    )
    conn.commit()
    conn.close()

if __name__ == "__main__":
    run()