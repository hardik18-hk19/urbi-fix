# backend/migrate_add_issue_official_response.py
"""SQLite ad-hoc migration to add official response columns to issues."""
import sqlite3

def run(db_path="backend/data.db"):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    # Add columns if not exist by attempting to select; fallback to ALTER
    try:
        cur.execute("SELECT official_status, official_response_at FROM issues LIMIT 1;")
    except sqlite3.OperationalError:
        try:
            cur.execute("ALTER TABLE issues ADD COLUMN official_status TEXT;")
        except Exception:
            pass
        try:
            cur.execute("ALTER TABLE issues ADD COLUMN official_response_at DATETIME;")
        except Exception:
            pass
    conn.commit()
    conn.close()

if __name__ == "__main__":
    run()