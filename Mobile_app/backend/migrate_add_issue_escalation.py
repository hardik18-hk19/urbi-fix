# Simple SQLite migration to add complaint escalation fields to issues table
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'data.db')

COLUMNS = {
    'complaint_draft': 'TEXT',
    'escalated': 'BOOLEAN',
    'escalated_to': 'TEXT',
    'escalated_at': 'DATETIME',
}

def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cursor.fetchall()]
    return column in cols


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    try:
        for col, typ in COLUMNS.items():
            if not column_exists(cur, 'issues', col):
                cur.execute(f"ALTER TABLE issues ADD COLUMN {col} {typ}")
                print(f"Added column {col} {typ}")
            else:
                print(f"Column {col} already exists")
        conn.commit()
        print("Migration complete.")
    finally:
        conn.close()

if __name__ == '__main__':
    main()