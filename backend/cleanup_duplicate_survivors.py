import argparse
import os
import shutil
import sqlite3
from datetime import datetime


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "data", "game.db")
BACKUP_DIR = os.path.join(BASE_DIR, "data", "backups")


def get_connection(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def get_tables(conn):
    rows = conn.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
        """
    ).fetchall()
    return [row["name"] for row in rows]


def get_table_columns(conn, table_name):
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return [row["name"] for row in rows]


def get_survivor_reference_report(conn):
    report = []
    for table_name in get_tables(conn):
        columns = get_table_columns(conn, table_name)
        survivor_columns = [
            column for column in columns
            if "survivor" in column.lower()
        ]
        foreign_keys = conn.execute(
            f"PRAGMA foreign_key_list({table_name})"
        ).fetchall()
        survivor_foreign_keys = [
            dict(row) for row in foreign_keys
            if row["table"] == "survivors"
        ]
        if survivor_columns or survivor_foreign_keys:
            report.append({
                "table": table_name,
                "survivor_columns": survivor_columns,
                "survivor_foreign_keys": survivor_foreign_keys
            })
    return report


def find_duplicate_groups(conn):
    duplicate_names = conn.execute(
        """
        SELECT name
        FROM survivors
        WHERE owned = 1
        GROUP BY name
        HAVING COUNT(*) > 1
        ORDER BY name
        """
    ).fetchall()

    groups = []
    for row in duplicate_names:
        rows = conn.execute(
            """
            SELECT id, name, rarity, role, mood, fatigue, health, owned
            FROM survivors
            WHERE name = ? AND owned = 1
            ORDER BY id
            """,
            (row["name"],)
        ).fetchall()
        survivors = [dict(survivor) for survivor in rows]
        groups.append({
            "name": row["name"],
            "keep_id": survivors[0]["id"],
            "delete_ids": [survivor["id"] for survivor in survivors[1:]],
            "merged_fatigue": min(survivor["fatigue"] for survivor in survivors),
            "merged_health": max(survivor["health"] for survivor in survivors),
            "rows": survivors
        })
    return groups


def print_reference_report(report):
    print("Survivor reference report:")
    if not report:
        print("- No survivor-related columns found outside survivors.")
        return

    for item in report:
        print(
            f"- {item['table']}: columns={item['survivor_columns']}, "
            f"foreign_keys={item['survivor_foreign_keys']}"
        )


def print_duplicate_report(groups):
    print("Duplicate survivor report:")
    if not groups:
        print("- No duplicate owned survivor names found.")
        return

    for group in groups:
        print(
            f"- name={group['name']} keep_id={group['keep_id']} "
            f"delete_ids={group['delete_ids']} "
            f"merged_fatigue={group['merged_fatigue']} "
            f"merged_health={group['merged_health']}"
        )
        for row in group["rows"]:
            print(
                "  "
                f"id={row['id']} rarity={row['rarity']} role={row['role']} "
                f"mood={row['mood']} fatigue={row['fatigue']} "
                f"health={row['health']} owned={row['owned']}"
            )


def has_unsafe_survivor_id_reference(report):
    for item in report:
        if item["table"] == "survivors":
            continue
        if "survivor_id" in item["survivor_columns"]:
            return True
        if item["survivor_foreign_keys"]:
            return True
    return False


def create_backup(db_path):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(
        BACKUP_DIR,
        f"game.before_duplicate_cleanup.{stamp}.db"
    )
    shutil.copy2(db_path, backup_path)
    return backup_path


def apply_cleanup(conn, groups):
    for group in groups:
        conn.execute(
            """
            UPDATE survivors
            SET fatigue = ?,
                health = ?
            WHERE id = ?
            """,
            (
                group["merged_fatigue"],
                group["merged_health"],
                group["keep_id"]
            )
        )
        conn.executemany(
            "DELETE FROM survivors WHERE id = ?",
            [(delete_id,) for delete_id in group["delete_ids"]]
        )
    conn.commit()


def main():
    parser = argparse.ArgumentParser(
        description="Report or clean duplicate owned survivor rows by name."
    )
    parser.add_argument(
        "--db-path",
        default=DEFAULT_DB_PATH,
        help="Path to the SQLite database."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Back up the database and remove duplicate survivor rows."
    )
    args = parser.parse_args()

    conn = get_connection(args.db_path)
    reference_report = get_survivor_reference_report(conn)
    duplicate_groups = find_duplicate_groups(conn)

    print_reference_report(reference_report)
    print_duplicate_report(duplicate_groups)

    if not args.apply:
        print("Dry run only. Re-run with --apply to back up and clean.")
        conn.close()
        return

    if has_unsafe_survivor_id_reference(reference_report):
        conn.close()
        raise SystemExit(
            "Aborted: found survivor_id or foreign-key references that need "
            "manual handling before deleting rows."
        )

    if not duplicate_groups:
        print("No cleanup needed.")
        conn.close()
        return

    conn.close()
    backup_path = create_backup(args.db_path)
    print(f"Backup created: {backup_path}")

    conn = get_connection(args.db_path)
    apply_cleanup(conn, duplicate_groups)
    after_groups = find_duplicate_groups(conn)
    conn.close()

    print_duplicate_report(after_groups)
    print("Cleanup complete.")


if __name__ == "__main__":
    main()
