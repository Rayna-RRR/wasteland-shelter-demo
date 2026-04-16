import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "game.db")


def get_table_columns(cursor, table_name):
    cursor.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cursor.fetchall()}


def ensure_survivor_state_columns(cursor):
    columns = get_table_columns(cursor, "survivors")

    if "fatigue" not in columns:
        cursor.execute("""
        ALTER TABLE survivors
        ADD COLUMN fatigue INTEGER NOT NULL DEFAULT 0
        """)

    if "health" not in columns:
        cursor.execute("""
        ALTER TABLE survivors
        ADD COLUMN health INTEGER NOT NULL DEFAULT 100
        """)

    cursor.execute("""
    UPDATE survivors
    SET fatigue = 0
    WHERE fatigue IS NULL OR fatigue < 0
    """)

    cursor.execute("""
    UPDATE survivors
    SET fatigue = 100
    WHERE fatigue > 100
    """)

    cursor.execute("""
    UPDATE survivors
    SET health = 100
    WHERE health IS NULL OR health > 100
    """)

    cursor.execute("""
    UPDATE survivors
    SET health = 0
    WHERE health < 0
    """)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS player (
        id INTEGER PRIMARY KEY,
        food INTEGER NOT NULL DEFAULT 100,
        power INTEGER NOT NULL DEFAULT 100,
        materials INTEGER NOT NULL DEFAULT 50,
        premium_currency INTEGER NOT NULL DEFAULT 20
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS survivors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rarity TEXT NOT NULL,
        role TEXT NOT NULL,
        mood TEXT NOT NULL DEFAULT 'normal',
        fatigue INTEGER NOT NULL DEFAULT 0,
        health INTEGER NOT NULL DEFAULT 100,
        owned INTEGER NOT NULL DEFAULT 1
    )
    """)

    ensure_survivor_state_columns(cursor)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gacha_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survivor_name TEXT NOT NULL,
        rarity TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS duty_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survivor_name TEXT NOT NULL,
        duty_type TEXT NOT NULL,
        result_text TEXT NOT NULL,
        food_change INTEGER NOT NULL DEFAULT 0,
        power_change INTEGER NOT NULL DEFAULT 0,
        materials_change INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS offer_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        trigger_reason TEXT,
        food_before INTEGER NOT NULL DEFAULT 0,
        power_before INTEGER NOT NULL DEFAULT 0,
        materials_before INTEGER NOT NULL DEFAULT 0,
        premium_currency_before INTEGER NOT NULL DEFAULT 0,
        survivor_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("SELECT * FROM player WHERE id = 1")
    player = cursor.fetchone()

    if not player:
        cursor.execute("""
        INSERT INTO player (id, food, power, materials, premium_currency)
        VALUES (1, 100, 100, 50, 20)
        """)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")


if __name__ == "__main__":
    init_db()
