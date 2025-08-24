# backend/migrate_add_fundraiser.py
"""
SQLite ad-hoc migration helper for adding fundraiser tables.
Run this once if your existing DB predates this feature.
"""
import sqlite3

def run(db_path="backend/data.db"):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    # Create fundraisers table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS fundraisers (
            id INTEGER PRIMARY KEY,
            issue_id INTEGER NOT NULL,
            creator_user_id INTEGER NOT NULL,
            target_amount REAL NOT NULL,
            collected_amount REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'INR',
            upi_or_pay_url TEXT,
            qr_image_url TEXT,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME
        );
        """
    )
    # Create contributions table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS contributions (
            id INTEGER PRIMARY KEY,
            fundraiser_id INTEGER NOT NULL,
            contributor_user_id INTEGER,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.commit()
    conn.close()

if __name__ == "__main__":
    run()