#!/usr/bin/env python3
"""
Migration script to add crowdfunding fields to issues table.
Run this once to update the database schema.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db import engine

def migrate():
    with engine.connect() as conn:
        # Add funding fields to issues table
        try:
            conn.execute(text("ALTER TABLE issues ADD COLUMN funding_goal FLOAT DEFAULT 1000.0"))
            print("✓ Added funding_goal column to issues")
        except Exception as e:
            print(f"funding_goal column might already exist: {e}")

        try:
            conn.execute(text("ALTER TABLE issues ADD COLUMN funding_current FLOAT DEFAULT 0.0"))
            print("✓ Added funding_current column to issues")
        except Exception as e:
            print(f"funding_current column might already exist: {e}")

        try:
            conn.execute(text("ALTER TABLE issues ADD COLUMN funding_contributions JSON"))
            print("✓ Added funding_contributions column to issues")
        except Exception as e:
            print(f"funding_contributions column might already exist: {e}")

        try:
            conn.execute(text("ALTER TABLE issues ADD COLUMN auto_assign_enabled INTEGER DEFAULT 1"))
            print("✓ Added auto_assign_enabled column to issues")
        except Exception as e:
            print(f"auto_assign_enabled column might already exist: {e}")

        try:
            conn.execute(text("ALTER TABLE issues ADD COLUMN assigned_booking_id INTEGER"))
            print("✓ Added assigned_booking_id column to issues")
        except Exception as e:
            print(f"assigned_booking_id column might already exist: {e}")

        conn.commit()
        print("✅ Issues migration completed successfully!")

if __name__ == "__main__":
    migrate()