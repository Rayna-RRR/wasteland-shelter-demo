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

    if "status" not in columns:
        cursor.execute("""
        ALTER TABLE survivors
        ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
        """)

    if "available_on_day" not in columns:
        cursor.execute("""
        ALTER TABLE survivors
        ADD COLUMN available_on_day INTEGER NOT NULL DEFAULT 1
        """)

    if "leave_reason" not in columns:
        cursor.execute("""
        ALTER TABLE survivors
        ADD COLUMN leave_reason TEXT NOT NULL DEFAULT ''
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

    cursor.execute("""
    UPDATE survivors
    SET status = 'active'
    WHERE status IS NULL
       OR status NOT IN ('active', 'injured', 'left')
    """)

    cursor.execute("""
    UPDATE survivors
    SET available_on_day = 1
    WHERE available_on_day IS NULL OR available_on_day < 1
    """)

    cursor.execute("""
    UPDATE survivors
    SET leave_reason = ''
    WHERE leave_reason IS NULL
    """)


def ensure_player_init_columns(cursor):
    columns = get_table_columns(cursor, "player")

    if "initialized" not in columns:
        cursor.execute("""
        ALTER TABLE player
        ADD COLUMN initialized INTEGER NOT NULL DEFAULT 0
        """)

    if "shelter_code" not in columns:
        cursor.execute("""
        ALTER TABLE player
        ADD COLUMN shelter_code TEXT NOT NULL DEFAULT ''
        """)

    if "commander_name" not in columns:
        cursor.execute("""
        ALTER TABLE player
        ADD COLUMN commander_name TEXT NOT NULL DEFAULT ''
        """)

    if "difficulty" not in columns:
        cursor.execute("""
        ALTER TABLE player
        ADD COLUMN difficulty TEXT NOT NULL DEFAULT '标准'
        """)


def ensure_offer_log_columns(cursor):
    columns = get_table_columns(cursor, "offer_logs")

    if "action_count" not in columns:
        cursor.execute("""
        ALTER TABLE offer_logs
        ADD COLUMN action_count INTEGER NOT NULL DEFAULT 0
        """)


def ensure_player_meta(cursor):
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS player_meta (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_runs INTEGER NOT NULL DEFAULT 0,
        best_survived_day INTEGER NOT NULL DEFAULT 0,
        unlock_json TEXT NOT NULL DEFAULT '{}'
    )
    """)

    columns = get_table_columns(cursor, "player_meta")

    if "total_runs" not in columns:
        cursor.execute("""
        ALTER TABLE player_meta
        ADD COLUMN total_runs INTEGER NOT NULL DEFAULT 0
        """)

    if "best_survived_day" not in columns:
        cursor.execute("""
        ALTER TABLE player_meta
        ADD COLUMN best_survived_day INTEGER NOT NULL DEFAULT 0
        """)

    if "unlock_json" not in columns:
        cursor.execute("""
        ALTER TABLE player_meta
        ADD COLUMN unlock_json TEXT NOT NULL DEFAULT '{}'
        """)

    cursor.execute("""
    INSERT OR IGNORE INTO player_meta (
        id,
        total_runs,
        best_survived_day,
        unlock_json
    )
    VALUES (1, 0, 0, '{}')
    """)


def ensure_run_state(cursor):
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS run_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        run_uid TEXT NOT NULL,
        difficulty_snapshot TEXT NOT NULL,
        total_days INTEGER NOT NULL,
        current_day INTEGER NOT NULL DEFAULT 1,
        actions_per_day INTEGER NOT NULL DEFAULT 3,
        actions_left INTEGER NOT NULL DEFAULT 3,
        threat_days_left INTEGER NOT NULL,
        game_status TEXT NOT NULL DEFAULT 'active',
        pending_event_id TEXT,
        pending_event_payload TEXT NOT NULL DEFAULT '',
        offer_suppressed_until_day INTEGER NOT NULL DEFAULT 0,
        result TEXT,
        last_settlement_summary TEXT NOT NULL DEFAULT ''
    )
    """)

    columns = get_table_columns(cursor, "run_state")

    if "run_uid" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN run_uid TEXT NOT NULL DEFAULT ''
        """)

    if "difficulty_snapshot" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN difficulty_snapshot TEXT NOT NULL DEFAULT '标准'
        """)

    if "total_days" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN total_days INTEGER NOT NULL DEFAULT 8
        """)

    if "current_day" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN current_day INTEGER NOT NULL DEFAULT 1
        """)

    if "actions_per_day" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN actions_per_day INTEGER NOT NULL DEFAULT 3
        """)

    if "actions_left" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN actions_left INTEGER NOT NULL DEFAULT 3
        """)

    if "threat_days_left" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN threat_days_left INTEGER NOT NULL DEFAULT 8
        """)

    if "game_status" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN game_status TEXT NOT NULL DEFAULT 'active'
        """)

    if "pending_event_id" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN pending_event_id TEXT
        """)

    if "pending_event_payload" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN pending_event_payload TEXT NOT NULL DEFAULT ''
        """)

    if "offer_suppressed_until_day" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN offer_suppressed_until_day INTEGER NOT NULL DEFAULT 0
        """)

    if "result" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN result TEXT
        """)

    if "last_settlement_summary" not in columns:
        cursor.execute("""
        ALTER TABLE run_state
        ADD COLUMN last_settlement_summary TEXT NOT NULL DEFAULT ''
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
        premium_currency INTEGER NOT NULL DEFAULT 20,
        initialized INTEGER NOT NULL DEFAULT 0,
        shelter_code TEXT NOT NULL DEFAULT '',
        commander_name TEXT NOT NULL DEFAULT '',
        difficulty TEXT NOT NULL DEFAULT '标准'
    )
    """)

    ensure_player_init_columns(cursor)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS survivors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rarity TEXT NOT NULL,
        role TEXT NOT NULL,
        mood TEXT NOT NULL DEFAULT 'normal',
        fatigue INTEGER NOT NULL DEFAULT 0,
        health INTEGER NOT NULL DEFAULT 100,
        status TEXT NOT NULL DEFAULT 'active',
        available_on_day INTEGER NOT NULL DEFAULT 1,
        leave_reason TEXT NOT NULL DEFAULT '',
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
        action_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    ensure_offer_log_columns(cursor)
    ensure_player_meta(cursor)
    ensure_run_state(cursor)

    cursor.execute("SELECT * FROM player WHERE id = 1")
    player = cursor.fetchone()

    if not player:
        cursor.execute("""
        INSERT INTO player (
            id,
            food,
            power,
            materials,
            premium_currency,
            initialized,
            shelter_code,
            commander_name,
            difficulty
        )
        VALUES (1, 100, 100, 50, 20, 0, '', '', '标准')
        """)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")


if __name__ == "__main__":
    init_db()
