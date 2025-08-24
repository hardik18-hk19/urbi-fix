#!/usr/bin/env python3
"""
Migration script to add phone column to users table
Run this script to fix the "no such column: users.phone" error
"""

import sqlite3
import os
from app.config import settings

def migrate_add_phone_column():
    """Add phone column to users table if it doesn't exist"""
    
    # Extract database path from DATABASE_URL
    if settings.DATABASE_URL.startswith("sqlite:///"):
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    else:
        print("This migration script only works with SQLite databases")
        return False
    
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if phone column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'phone' in columns:
            print("Phone column already exists in users table")
            conn.close()
            return True
        
        # Add phone column
        print("Adding phone column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN phone VARCHAR(40)")
        
        # Add avatar_url column if it doesn't exist either
        if 'avatar_url' not in columns:
            print("Adding avatar_url column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)")
        
        conn.commit()
        conn.close()
        
        print("Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        if 'conn' in locals():
            conn.close()
        return False

if __name__ == "__main__":
    success = migrate_add_phone_column()
    if success:
        print("\n✅ Database migration completed!")
        print("You can now restart your server and the login should work.")
    else:
        print("\n❌ Migration failed!")
        print("You may need to delete the database file and let it recreate.")