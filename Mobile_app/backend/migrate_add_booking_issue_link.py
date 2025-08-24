# backend/migrate_add_booking_issue_link.py
"""SQLite ad-hoc migration to add issue_id column to bookings."""
import sqlite3

def run(db_path="backend/data.db"):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute("SELECT issue_id FROM bookings LIMIT 1;")
    except sqlite3.OperationalError:
        try:
            cur.execute("ALTER TABLE bookings ADD COLUMN issue_id INTEGER;")
        except Exception:
            pass
    conn.commit()
    conn.close()

if __name__ == "__main__":
    run()