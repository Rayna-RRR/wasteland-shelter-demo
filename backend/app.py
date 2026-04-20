from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
import random
import uuid
import json

app = Flask(__name__)
app.json.ensure_ascii = False
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "game.db")
EVENT_DEFINITIONS_PATH = os.path.join(BASE_DIR, "data", "event_definitions.json")

SURVIVOR_POOL = {
    "SSR": [
        {"name": "周萤", "role": "维修员", "mood": "cold"},
        {"name": "唐鸦", "role": "守卫", "mood": "alert"}
    ],
    "SR": [
        {"name": "林七", "role": "采集员", "mood": "steady"},
        {"name": "许禾", "role": "医生", "mood": "calm"},
        {"name": "阿拓", "role": "搜寻员", "mood": "reckless"}
    ],
    "R": [
        {"name": "小五", "role": "杂务员", "mood": "normal"},
        {"name": "阿琴", "role": "发电员", "mood": "tired"},
        {"name": "老秦", "role": "炊事员", "mood": "gentle"},
        {"name": "石头", "role": "搬运工", "mood": "silent"}
    ]
}

STATIC_TRAIT_POOL = [
    "可靠", "冷静", "温和", "鲁莽", "谨慎", "沉默", "倔强",
    "机敏", "强硬", "老练", "多疑", "耐压", "护短", "狠劲"
]

TRAIT_BY_MOOD = {
    "normal": "可靠",
    "cold": "冷静",
    "gentle": "温和",
    "reckless": "鲁莽",
    "steady": "谨慎",
    "silent": "沉默",
    "alert": "机敏",
    "calm": "耐压",
    "tired": "倔强"
}

ROLE_PROFILE_MAPPINGS = {
    "维修员": {
        "work_style": "先听机器哪儿不对劲，再决定从哪块铁皮下手。",
        "archive": "停电后的滤芯室里曾留了三天，出来时还抱着一捆干净电缆。"
    },
    "杂务员": {
        "work_style": "哪儿漏风就先去哪儿，落到手里的杂活也都能收拾清楚。",
        "archive": "总能在漏风走廊里翻出还能用的螺丝和旧布。"
    },
    "发电员": {
        "work_style": "习惯先看电表和油压，灯稳下来以后才肯离开发电间。",
        "archive": "发电机低吼时，常把耳朵贴近铁壳听每一次抖动。"
    },
    "炊事员": {
        "work_style": "下锅前总要再点一遍库存，尽量让每只碗里都留点热气。",
        "archive": "灶台烟灰落满袖口，仍记得谁昨夜少领了半勺汤。"
    },
    "守卫": {
        "work_style": "换岗前总会多绕一圈，尤其留意那些突然安静下来的地方。",
        "archive": "探照灯扫过沙尘时，往往比警铃更早看见阴影。"
    },
    "搜寻员": {
        "work_style": "进废楼前先记退路，背包只留给真正能救命的东西。",
        "archive": "从塌陷商场的货架间走出来时，背包里装的总是避难所最缺的零碎。"
    },
    "采集员": {
        "work_style": "会把水源、地标和能认路的废弃物一起记下来，回程从不只留一条路。",
        "archive": "荒地风把地图磨得发白，还是能指出下一处可采的暗沟。"
    },
    "医生": {
        "work_style": "先稳住伤员呼吸，再决定药该省在哪儿、伤口该先处理哪一处。",
        "archive": "药箱外壳被酸雨咬出白痕，里面的绷带却总是分格收好。"
    },
    "搬运工": {
        "work_style": "搬东西前会先试重量和落脚点，很少让队伍在半路返工。",
        "archive": "背过一扇从旧地铁站拆下的铁门，后来那成了避难所的新挡板。"
    }
}

DEFAULT_ROLE_PROFILE = {
    "work_style": "接到活就先确认工具和路线，尽量把风险留在出门之前。",
    "archive": "尘暴压低天色时，{role}把自己的工具放回最顺手的位置。"
}

RARITY_GACHA_LABELS = {
    "SSR": "稀有信号确认",
    "SR": "可靠信号接入",
    "R": "新成员登记"
}

MOOD_GACHA_ENTRANCE_LINES = {
    "cold": "先检查门锁，再把行囊靠到墙边。",
    "alert": "进门后扫过通风口和岗哨阴影。",
    "steady": "把路线图摊在桌上，等下一次外勤安排。",
    "calm": "低声确认伤员名单，像已经在这里待了很久。",
    "reckless": "拍掉袖口尘土，问废墟入口还剩几条路。",
    "normal": "安静领下床位牌，准备从杂活做起。",
    "tired": "摘下防尘面罩，仍把工具攥得很紧。",
    "gentle": "先问灶台在哪里，又把半袋粮递给仓库。",
    "silent": "没有多说，只把沉重物资放到登记处。"
}

DUTY_NARRATIVE_FOCUS = {
    "scavenge": "废墟搜集路线",
    "generate_power": "发电机组",
    "cook": "灶台和库存",
    "guard": "闸门夜哨"
}

DUTY_TYPES = ["scavenge", "generate_power", "cook", "guard"]
GACHA_DUPLICATE_MATERIAL_COMPENSATION = 8
LOCAL_DEMO_GACHA_SEQUENCE = [
    {"rarity": "SSR", "name": "周萤"},
    {"rarity": "SSR", "name": "周萤"}
]
DEMO_MODE_ENABLED = False
DUTY_OPERATING_COSTS = {
    "scavenge": {
        "food": 0,
        "power": 2,
        "materials": 0
    },
    "generate_power": {
        "food": 1,
        "power": 0,
        "materials": 2
    },
    "cook": {
        "food": 0,
        "power": 1,
        "materials": 0
    },
    "guard": {
        "food": 1,
        "power": 1,
        "materials": 1
    }
}
SHELTER_UPKEEP_COSTS = {
    "food": 10,
    "power": 10,
    "materials": 7
}
SHELTER_UPKEEP_FATIGUE_PENALTY = 8
SHELTER_UPKEEP_HEALTH_PENALTY = 3
PLAYER_RESOURCE_KEYS = ("food", "power", "materials")
SHELTER_CODE_MAX_LENGTH = 16
COMMANDER_NAME_MAX_LENGTH = 12
LOCAL_DEV_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}
PRE_INIT_PLAYER_RESOURCES = {
    "food": 100,
    "power": 100,
    "materials": 50,
    "premium_currency": 20
}
INIT_INTRO_TEXT = (
    "旧广播塔还剩最后一格电。登记代号，确认指挥官，"
    "补给室会按难度发放第一批物资。"
)
DIFFICULTY_STARTING_RESOURCES = {
    "稳健": {
        "food": 100,
        "power": 95,
        "materials": 70,
        "premium_currency": 45
    },
    "标准": {
        "food": 80,
        "power": 80,
        "materials": 55,
        "premium_currency": 30
    },
    "极端": {
        "food": 55,
        "power": 60,
        "materials": 32,
        "premium_currency": 15
    }
}
DIFFICULTY_TOTAL_DAYS = {
    "稳健": 10,
    "标准": 8,
    "极端": 7
}
DEFAULT_ACTIONS_PER_DAY = 3
CURRENT_RUN_ID = 1
PLAYER_META_ID = 1
ACTION_EXHAUSTED_MESSAGE = "今日行动次数已用尽。日推进会在下一阶段接入。"
PENDING_EVENT_ACTION_BLOCK_MESSAGE = "今日随机事件尚未处理，请先回到首页完成选择。"
RUN_ENDED_MESSAGES = {
    "won": "避难所已撑过最终日，本轮已胜利。",
    "lost": "避难所已经失守，本轮已结束。"
}
RUN_INACTIVE_MESSAGE = "当前轮次已经结束，请回到首页查看结果。"
SURVIVOR_STATUS_ACTIVE = "active"
SURVIVOR_STATUS_INJURED = "injured"
SURVIVOR_STATUS_LEFT = "left"
SURVIVOR_STATUSES = {
    SURVIVOR_STATUS_ACTIVE,
    SURVIVOR_STATUS_INJURED,
    SURVIVOR_STATUS_LEFT
}
EVENT_PAYLOAD_STATUS_PENDING = "pending"
EVENT_PAYLOAD_STATUS_RESOLVED = "resolved"
HIGH_RISK_INJURY_RECOVERY_DAYS = 2
POWER_SHORTAGE_FATIGUE_PENALTY = 4
FATIGUE_INCREASE_BY_DUTY = {
    "scavenge": 18,
    "generate_power": 14,
    "cook": 10,
    "guard": 12
}
HIGH_RISK_DUTIES = ["scavenge", "guard"]
EMERGENCY_OFFER_FATIGUE_RECOVERY = 10
EMERGENCY_OFFER_HEALTH_RECOVERY = 3
RESOURCE_CRITICAL_THRESHOLDS = {
    "food": 60,
    "power": 60,
    "materials": 25
}
RESOURCE_WARNING_THRESHOLDS = {
    "food": 75,
    "power": 75,
    "materials": 35
}
TEAM_STRESS_FATIGUE_THRESHOLD = 70
TEAM_STRESS_HEALTH_THRESHOLD = 60
TEAM_CRITICAL_HEALTH_THRESHOLD = 30
RECENT_DUTY_LOG_LIMIT = 3
LOW_EFFICIENCY_TRIGGER_COUNT = 2
LOW_EFFICIENCY_TOTAL_CHANGE_THRESHOLD = 2
EMERGENCY_OFFER_SUPPRESS_ACTION_WINDOW = 3
EMERGENCY_OFFER_SUPPRESS_DAYS_AFTER_CLOSE = 1
SEVERE_RESOURCE_THRESHOLDS = {
    "food": 35,
    "power": 35,
    "materials": 10
}
SEVERE_TEAM_HEALTH_THRESHOLD = 20
SEVERE_TEAM_FATIGUE_THRESHOLD = 90

EMERGENCY_OFFER_ID = "emergency_supply_v1"
EMERGENCY_OFFER = {
    "offer_id": EMERGENCY_OFFER_ID,
    "title": "战备应急补给协议",
    "subtitle": "避难所监测到补给压力，限时开放一次战备补给。",
    "urgency_label": "短时开放",
    "price_label": "¥6",
    "rewards": {
        "premium_currency": 2,
        "food": 25,
        "power": 25,
        "materials": 15
    }
}
EMERGENCY_OFFER_COPY_BY_TRIGGER = {
    "power_shortage": {
        "title": "低功耗应急补给",
        "subtitle": "电力已经触底，避难所正在压缩照明和过滤负载。补给室建议先恢复基础供能。",
        "urgency_label": "断电处置"
    },
    "power_pressure": {
        "title": "电力预警补给",
        "subtitle": "电力储备低于安全线，发电排班正在挤压其他值勤。补给室准备了稳定供能包。",
        "urgency_label": "电力预警"
    },
    "food_pressure": {
        "title": "口粮应急补给",
        "subtitle": "食物库存已经进入危险区，队伍恢复和日常值勤都会被拖慢。补给室开放一次口粮支援。",
        "urgency_label": "口粮告急"
    },
    "materials_pressure": {
        "title": "维修材料补给",
        "subtitle": "材料储备低于维护线，发电、守卫和例行检修都会受影响。补给室建议补足基础耗材。",
        "urgency_label": "材料告急"
    },
    "combined_resource_pressure": {
        "title": "综合维持补给",
        "subtitle": "多项资源同时接近警戒线，避难所需要一次稳定补给来撑过当前轮值。",
        "urgency_label": "多线压力"
    },
    "team_state_pressure": {
        "title": "医疗休整补给",
        "subtitle": "队伍疲劳或伤情已经累积，继续硬撑会压低后续行动效率。补给室准备了恢复支援。",
        "urgency_label": "队伍告急"
    },
    "low_efficiency_pressure": {
        "title": "低效行动补给",
        "subtitle": "最近值勤产出偏低，避难所运转效率正在下滑。补给室建议先稳住基础盘。",
        "urgency_label": "效率下滑"
    },
    "shelter_pressure": {
        "title": "避难所应急补给",
        "subtitle": "避难所运转压力升高，补给室临时开放一次救援协议。",
        "urgency_label": "避难所压力"
    }
}


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_table_columns(conn, table_name):
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row["name"] for row in rows}


def ensure_player_init_columns(conn):
    columns = get_table_columns(conn, "player")

    if "initialized" not in columns:
        conn.execute(
            "ALTER TABLE player ADD COLUMN initialized INTEGER NOT NULL DEFAULT 0"
        )

    if "shelter_code" not in columns:
        conn.execute(
            "ALTER TABLE player ADD COLUMN shelter_code TEXT NOT NULL DEFAULT ''"
        )

    if "commander_name" not in columns:
        conn.execute(
            "ALTER TABLE player ADD COLUMN commander_name TEXT NOT NULL DEFAULT ''"
        )

    if "difficulty" not in columns:
        conn.execute(
            "ALTER TABLE player ADD COLUMN difficulty TEXT NOT NULL DEFAULT '标准'"
        )

    player = conn.execute("SELECT id FROM player WHERE id = 1").fetchone()
    if not player:
        conn.execute(
            """
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
            """
        )


def ensure_survivor_state_columns(conn):
    columns = get_table_columns(conn, "survivors")

    if "status" not in columns:
        conn.execute(
            "ALTER TABLE survivors ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"
        )

    if "available_on_day" not in columns:
        conn.execute(
            """
            ALTER TABLE survivors
            ADD COLUMN available_on_day INTEGER NOT NULL DEFAULT 1
            """
        )

    if "leave_reason" not in columns:
        conn.execute(
            "ALTER TABLE survivors ADD COLUMN leave_reason TEXT NOT NULL DEFAULT ''"
        )

    conn.execute(
        """
        UPDATE survivors
        SET status = 'active'
        WHERE status IS NULL
           OR status NOT IN ('active', 'injured', 'left')
        """
    )
    conn.execute(
        """
        UPDATE survivors
        SET available_on_day = 1
        WHERE available_on_day IS NULL OR available_on_day < 1
        """
    )
    conn.execute(
        """
        UPDATE survivors
        SET leave_reason = ''
        WHERE leave_reason IS NULL
        """
    )


def ensure_offer_log_columns(conn):
    columns = get_table_columns(conn, "offer_logs")

    if "action_count" not in columns:
        conn.execute(
            "ALTER TABLE offer_logs ADD COLUMN action_count INTEGER NOT NULL DEFAULT 0"
        )


def ensure_player_meta_table(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS player_meta (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            total_runs INTEGER NOT NULL DEFAULT 0,
            best_survived_day INTEGER NOT NULL DEFAULT 0,
            unlock_json TEXT NOT NULL DEFAULT '{}'
        )
        """
    )
    columns = get_table_columns(conn, "player_meta")

    if "total_runs" not in columns:
        conn.execute(
            "ALTER TABLE player_meta ADD COLUMN total_runs INTEGER NOT NULL DEFAULT 0"
        )

    if "best_survived_day" not in columns:
        conn.execute(
            """
            ALTER TABLE player_meta
            ADD COLUMN best_survived_day INTEGER NOT NULL DEFAULT 0
            """
        )

    if "unlock_json" not in columns:
        conn.execute(
            "ALTER TABLE player_meta ADD COLUMN unlock_json TEXT NOT NULL DEFAULT '{}'"
        )

    conn.execute(
        """
        INSERT OR IGNORE INTO player_meta (
            id,
            total_runs,
            best_survived_day,
            unlock_json
        )
        VALUES (?, 0, 0, '{}')
        """,
        (PLAYER_META_ID,)
    )


def ensure_run_state_table(conn):
    conn.execute(
        """
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
        """
    )
    columns = get_table_columns(conn, "run_state")

    if "run_uid" not in columns:
        conn.execute(
            "ALTER TABLE run_state ADD COLUMN run_uid TEXT NOT NULL DEFAULT ''"
        )

    if "difficulty_snapshot" not in columns:
        conn.execute(
            """
            ALTER TABLE run_state
            ADD COLUMN difficulty_snapshot TEXT NOT NULL DEFAULT '标准'
            """
        )

    if "total_days" not in columns:
        conn.execute(
            "ALTER TABLE run_state ADD COLUMN total_days INTEGER NOT NULL DEFAULT 8"
        )

    if "current_day" not in columns:
        conn.execute(
            "ALTER TABLE run_state ADD COLUMN current_day INTEGER NOT NULL DEFAULT 1"
        )

    if "actions_per_day" not in columns:
        conn.execute(
            """
            ALTER TABLE run_state
            ADD COLUMN actions_per_day INTEGER NOT NULL DEFAULT 3
            """
        )

    if "actions_left" not in columns:
        conn.execute(
            "ALTER TABLE run_state ADD COLUMN actions_left INTEGER NOT NULL DEFAULT 3"
        )

    if "threat_days_left" not in columns:
        conn.execute(
            """
            ALTER TABLE run_state
            ADD COLUMN threat_days_left INTEGER NOT NULL DEFAULT 8
            """
        )

    if "game_status" not in columns:
        conn.execute(
            """
            ALTER TABLE run_state
            ADD COLUMN game_status TEXT NOT NULL DEFAULT 'active'
            """
        )

    if "pending_event_id" not in columns:
        conn.execute("ALTER TABLE run_state ADD COLUMN pending_event_id TEXT")

    if "pending_event_payload" not in columns:
        conn.execute(
            """
            ALTER TABLE run_state
            ADD COLUMN pending_event_payload TEXT NOT NULL DEFAULT ''
            """
        )

    if "offer_suppressed_until_day" not in columns:
        conn.execute(
            """
            ALTER TABLE run_state
            ADD COLUMN offer_suppressed_until_day INTEGER NOT NULL DEFAULT 0
            """
        )

    if "result" not in columns:
        conn.execute("ALTER TABLE run_state ADD COLUMN result TEXT")

    if "last_settlement_summary" not in columns:
        conn.execute(
            """
            ALTER TABLE run_state
            ADD COLUMN last_settlement_summary TEXT NOT NULL DEFAULT ''
            """
        )


def get_total_days_for_difficulty(difficulty):
    return DIFFICULTY_TOTAL_DAYS.get(difficulty, DIFFICULTY_TOTAL_DAYS["标准"])


def read_current_run(conn):
    ensure_run_state_table(conn)
    return conn.execute(
        """
        SELECT id, run_uid, difficulty_snapshot, total_days, current_day,
               actions_per_day, actions_left, threat_days_left, game_status,
               pending_event_id, pending_event_payload,
               offer_suppressed_until_day, result,
               last_settlement_summary
        FROM run_state
        WHERE id = ?
        """,
        (CURRENT_RUN_ID,)
    ).fetchone()


def serialize_run_state(row):
    if not row:
        return None

    return {
        "id": row["id"],
        "run_uid": row["run_uid"],
        "difficulty_snapshot": row["difficulty_snapshot"],
        "total_days": row["total_days"],
        "current_day": row["current_day"],
        "actions_per_day": row["actions_per_day"],
        "actions_left": row["actions_left"],
        "threat_days_left": row["threat_days_left"],
        "game_status": row["game_status"],
        "pending_event_id": row["pending_event_id"],
        "pending_event": build_pending_event_view(
            row["pending_event_id"],
            row["pending_event_payload"]
        ),
        "offer_suppressed_until_day": row["offer_suppressed_until_day"],
        "result": row["result"],
        "last_settlement_summary": row["last_settlement_summary"]
    }


def create_current_run(conn, difficulty, count_as_new_run=False):
    ensure_player_meta_table(conn)
    ensure_run_state_table(conn)

    total_days = get_total_days_for_difficulty(difficulty)
    conn.execute("DELETE FROM run_state")
    conn.execute(
        """
        INSERT INTO run_state (
            id,
            run_uid,
            difficulty_snapshot,
            total_days,
            current_day,
            actions_per_day,
            actions_left,
            threat_days_left,
            game_status,
            pending_event_id,
            pending_event_payload,
            offer_suppressed_until_day,
            result,
            last_settlement_summary
        )
        VALUES (?, ?, ?, ?, 1, ?, ?, ?, 'active', NULL, '', 0, NULL, '')
        """,
        (
            CURRENT_RUN_ID,
            uuid.uuid4().hex,
            difficulty,
            total_days,
            DEFAULT_ACTIONS_PER_DAY,
            DEFAULT_ACTIONS_PER_DAY,
            total_days
        )
    )

    if count_as_new_run:
        conn.execute(
            """
            UPDATE player_meta
            SET total_runs = total_runs + 1
            WHERE id = ?
            """,
            (PLAYER_META_ID,)
        )

    return read_current_run(conn)


def ensure_current_run_exists(conn):
    run_state = read_current_run(conn)
    if run_state:
        return run_state

    player = get_player_init_profile(conn)
    if not player["initialized"]:
        return None

    return create_current_run(
        conn,
        player["difficulty"],
        count_as_new_run=False
    )


def dumps_compact_json(data):
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def parse_compact_json_object(value):
    if not value or not isinstance(value, str):
        return {}

    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return {}

    return parsed if isinstance(parsed, dict) else {}


def load_event_definitions():
    try:
        with open(EVENT_DEFINITIONS_PATH, "r", encoding="utf-8") as file_obj:
            data = json.load(file_obj)
    except (OSError, ValueError):
        return []

    events = data.get("events") if isinstance(data, dict) else data
    if not isinstance(events, list):
        return []

    return [
        event for event in events
        if isinstance(event, dict) and event.get("id")
    ]


def get_event_definition(event_id):
    for event in load_event_definitions():
        if event.get("id") == event_id:
            return event
    return None


def get_event_target_name(payload):
    target = payload.get("target_survivor") or {}
    return target.get("name") or "一名幸存者"


def format_event_text(text, payload):
    if not isinstance(text, str):
        return ""

    target_name = get_event_target_name(payload)
    return text.replace("{target}", target_name)


def build_pending_event_view(event_id, payload_text):
    if not event_id:
        return None

    payload = parse_compact_json_object(payload_text)
    event_def = get_event_definition(event_id)
    if not event_def:
        return {
            "id": event_id,
            "day": payload.get("day"),
            "title": "未知事件",
            "description": "事件配置暂时无法读取，请刷新后重试。",
            "target_survivor": payload.get("target_survivor"),
            "choices": []
        }

    choices = []
    for choice in event_def.get("choices", []):
        if not isinstance(choice, dict):
            continue
        choices.append({
            "id": choice.get("id"),
            "label": format_event_text(choice.get("label", ""), payload),
            "description": format_event_text(
                choice.get("description", ""),
                payload
            )
        })

    return {
        "id": event_def["id"],
        "day": payload.get("day"),
        "title": format_event_text(event_def.get("title", ""), payload),
        "description": format_event_text(
            event_def.get("description", ""),
            payload
        ),
        "target_survivor": payload.get("target_survivor"),
        "choices": choices
    }


def restore_recovered_survivors(conn, current_day):
    ensure_survivor_state_columns(conn)
    rows = conn.execute(
        """
        SELECT id
        FROM survivors
        WHERE owned = 1
          AND status = 'injured'
          AND available_on_day <= ?
        """,
        (current_day,)
    ).fetchall()

    for row in rows:
        conn.execute(
            """
            UPDATE survivors
            SET status = 'active',
                leave_reason = ''
            WHERE id = ?
              AND owned = 1
              AND status = 'injured'
              AND available_on_day <= ?
            """,
            (row["id"], current_day)
        )

    return [row["id"] for row in rows]


def set_offer_suppression_window(conn, current_day):
    ensure_run_state_table(conn)
    suppressed_until_day = current_day + EMERGENCY_OFFER_SUPPRESS_DAYS_AFTER_CLOSE
    conn.execute(
        """
        UPDATE run_state
        SET offer_suppressed_until_day = ?
        WHERE id = ?
        """,
        (suppressed_until_day, CURRENT_RUN_ID)
    )
    return suppressed_until_day


def get_active_survivor_rows(conn):
    ensure_survivor_state_columns(conn)
    return conn.execute(
        """
        SELECT id, name, rarity, role, mood, fatigue, health,
               status, available_on_day, leave_reason
        FROM survivors
        WHERE owned = 1
          AND status = 'active'
        ORDER BY id ASC
        """
    ).fetchall()


def survivor_is_poor_condition(survivor):
    return survivor["health"] <= 45 or survivor["fatigue"] >= 80


def pick_event_target(conn, event_def, current_day):
    if not event_def.get("requires_survivor"):
        return None

    rows = get_active_survivor_rows(conn)
    if event_def.get("requires_poor_condition"):
        rows = [row for row in rows if survivor_is_poor_condition(row)]

    if not rows:
        return None

    selector = event_def.get("target_selector")
    if selector == "lowest_health_active":
        return sorted(rows, key=lambda row: (row["health"], -row["fatigue"], row["id"]))[0]
    if selector == "highest_fatigue_active":
        return sorted(rows, key=lambda row: (-row["fatigue"], row["health"], row["id"]))[0]

    seed = f"{event_def.get('id')}:{current_day}"
    index = sum(ord(character) for character in seed) % len(rows)
    return rows[index]


def event_is_valid_for_today(conn, event_def, current_day):
    if not event_def.get("requires_survivor"):
        return True

    return pick_event_target(conn, event_def, current_day) is not None


def choose_daily_event(conn, current_day):
    definitions = load_event_definitions()
    valid_events = [
        event for event in definitions
        if event_is_valid_for_today(conn, event, current_day)
    ]

    if not valid_events:
        return None, None

    event_def = valid_events[(current_day - 1) % len(valid_events)]
    target = pick_event_target(conn, event_def, current_day)
    return event_def, target


def build_pending_event_storage_payload(event_def, current_day, target):
    payload = {
        "status": EVENT_PAYLOAD_STATUS_PENDING,
        "day": current_day,
        "event_id": event_def["id"]
    }

    if target:
        payload["target_survivor"] = {
            "id": target["id"],
            "name": target["name"]
        }

    return payload


def event_already_handled_today(run_state):
    if run_state["pending_event_id"]:
        return True

    payload = parse_compact_json_object(run_state["pending_event_payload"])
    return (
        payload.get("day") == run_state["current_day"]
        and payload.get("status") == EVENT_PAYLOAD_STATUS_RESOLVED
    )


def ensure_daily_event_for_run(conn, run_state=None):
    if not run_state:
        run_state = read_current_run(conn)

    if not run_state or run_state["game_status"] != "active":
        return run_state

    if run_state["actions_left"] <= 0 or event_already_handled_today(run_state):
        return run_state

    event_def, target = choose_daily_event(conn, run_state["current_day"])
    if not event_def:
        return run_state

    payload = build_pending_event_storage_payload(
        event_def,
        run_state["current_day"],
        target
    )
    conn.execute(
        """
        UPDATE run_state
        SET pending_event_id = ?,
            pending_event_payload = ?
        WHERE id = ?
        """,
        (
            event_def["id"],
            dumps_compact_json(payload),
            CURRENT_RUN_ID
        )
    )
    return read_current_run(conn)


def ensure_current_run_ready(conn):
    run_state = ensure_current_run_exists(conn)
    if not run_state:
        return None

    if run_state["game_status"] == "active":
        restore_recovered_survivors(conn, run_state["current_day"])
        run_state = ensure_daily_event_for_run(conn, read_current_run(conn))

    return run_state


def get_run_inactive_message(run_state):
    if not run_state:
        return RUN_INACTIVE_MESSAGE

    return RUN_ENDED_MESSAGES.get(
        run_state["game_status"],
        RUN_INACTIVE_MESSAGE
    )


def reject_if_actions_exhausted(conn):
    run_state = ensure_current_run_ready(conn)

    if run_state and run_state["game_status"] != "active":
        return run_state, jsonify({
            "status": "error",
            "message": get_run_inactive_message(run_state),
            "run_state": serialize_run_state(run_state)
        }), 400

    if run_state and run_state["actions_left"] <= 0:
        return run_state, jsonify({
            "status": "error",
            "message": ACTION_EXHAUSTED_MESSAGE,
            "run_state": serialize_run_state(run_state)
        }), 400

    if run_state and run_state["pending_event_id"]:
        return run_state, jsonify({
            "status": "error",
            "message": PENDING_EVENT_ACTION_BLOCK_MESSAGE,
            "run_state": serialize_run_state(run_state)
        }), 400

    return run_state, None, None


def decrement_actions_safely(conn):
    ensure_run_state_table(conn)
    cursor = conn.execute(
        """
        UPDATE run_state
        SET actions_left = actions_left - 1
        WHERE id = ?
          AND actions_left > 0
          AND game_status = 'active'
        """,
        (CURRENT_RUN_ID,)
    )

    if cursor.rowcount == 0:
        return None

    return read_current_run(conn)


def resolve_end_of_day(conn, run_state):
    settled_day = run_state["current_day"]
    total_days = run_state["total_days"]
    upkeep = apply_shelter_upkeep(conn)
    player = normalize_player_resources(conn)["player"]

    if player["food"] <= 0 or player["power"] <= 0:
        result = "lost"
    elif settled_day >= total_days:
        result = "won"
    else:
        result = "advanced"

    summary = {
        "settled_day": settled_day,
        "upkeep": {
            "paid": upkeep["paid"],
            "shortfall": upkeep["shortfall"],
            "fully_paid": upkeep["fully_paid"],
            "team_penalty": upkeep["team_penalty"]
        },
        "result": result
    }

    if result == "advanced":
        next_day = settled_day + 1
        threat_days_left = max(total_days - (next_day - 1), 0)
        summary["next_day"] = next_day
        conn.execute(
            """
            UPDATE run_state
            SET current_day = ?,
                actions_left = actions_per_day,
                threat_days_left = ?,
                game_status = 'active',
                pending_event_id = NULL,
                pending_event_payload = '',
                result = NULL,
                last_settlement_summary = ?
            WHERE id = ?
            """,
            (
                next_day,
                threat_days_left,
                dumps_compact_json(summary),
                CURRENT_RUN_ID
            )
        )
    else:
        conn.execute(
            """
            UPDATE run_state
            SET actions_left = 0,
                threat_days_left = 0,
                game_status = ?,
                pending_event_id = NULL,
                pending_event_payload = '',
                result = ?,
                last_settlement_summary = ?
            WHERE id = ?
            """,
            (
                result,
                result,
                dumps_compact_json(summary),
                CURRENT_RUN_ID
            )
        )

    return summary, read_current_run(conn)


def consume_action_and_maybe_settle(conn):
    run_state = decrement_actions_safely(conn)
    if not run_state:
        return None, None

    if run_state["actions_left"] > 0:
        run_state = ensure_current_run_ready(conn)
        return run_state, None

    day_transition, updated_run_state = resolve_end_of_day(conn, run_state)
    updated_run_state = ensure_current_run_ready(conn)
    return updated_run_state, day_transition


def get_player_init_profile(conn):
    ensure_player_init_columns(conn)
    return conn.execute(
        """
        SELECT initialized, shelter_code, commander_name, difficulty
        FROM player
        WHERE id = 1
        """
    ).fetchone()


def build_init_status_payload(player):
    return {
        "status": "ok",
        "initialized": bool(player["initialized"]),
        "shelter_code": player["shelter_code"],
        "commander_name": player["commander_name"],
        "difficulty": player["difficulty"],
        "intro_text": INIT_INTRO_TEXT
    }


def get_clean_init_text(payload, key):
    value = payload.get(key)
    if not isinstance(value, str):
        return ""
    return value.strip()


def validate_init_payload(payload):
    shelter_code = get_clean_init_text(payload, "shelter_code")
    commander_name = get_clean_init_text(payload, "commander_name")
    difficulty = get_clean_init_text(payload, "difficulty") or "标准"

    if not shelter_code:
        return None, {
            "status": "error",
            "message": "需要填写避难所代号。"
        }

    if len(shelter_code) > SHELTER_CODE_MAX_LENGTH:
        return None, {
            "status": "error",
            "message": f"避难所代号最多 {SHELTER_CODE_MAX_LENGTH} 个字。"
        }

    if not commander_name:
        return None, {
            "status": "error",
            "message": "需要填写指挥官。"
        }

    if len(commander_name) > COMMANDER_NAME_MAX_LENGTH:
        return None, {
            "status": "error",
            "message": f"指挥官最多 {COMMANDER_NAME_MAX_LENGTH} 个字。"
        }

    if difficulty not in DIFFICULTY_STARTING_RESOURCES:
        return None, {
            "status": "error",
            "message": "难度只能选择：稳健、标准、极端。"
        }

    return {
        "shelter_code": shelter_code,
        "commander_name": commander_name,
        "difficulty": difficulty
    }, None


def is_local_dev_request():
    host = (request.host or "").split(":")[0].lower()
    remote_addr = (request.remote_addr or "").lower()
    dev_mode_enabled = (
        app.debug
        or app.config.get("TESTING")
        or os.environ.get("FLASK_ENV") == "development"
        or os.environ.get("WASTELAND_ENABLE_DEV_TOOLS") == "1"
    )
    return dev_mode_enabled and (
        host in LOCAL_DEV_HOSTS or remote_addr in LOCAL_DEV_HOSTS
    )


def reject_non_local_dev_request():
    return jsonify({
        "status": "error",
        "message": "该调试接口仅限本地开发环境使用。"
    }), 403


def reset_current_run_state(conn):
    ensure_player_init_columns(conn)
    ensure_run_state_table(conn)
    reset_tables = ("survivors", "gacha_logs", "duty_logs", "offer_logs", "run_state")
    deleted_counts = {}

    for table_name in reset_tables:
        cursor = conn.execute(f"DELETE FROM {table_name}")
        deleted_counts[table_name] = cursor.rowcount

    cursor = conn.execute(
        """
        UPDATE player
        SET food = ?,
            power = ?,
            materials = ?,
            premium_currency = ?,
            initialized = 0,
            shelter_code = '',
            commander_name = '',
            difficulty = '标准'
        WHERE id = 1
        """,
        (
            PRE_INIT_PLAYER_RESOURCES["food"],
            PRE_INIT_PLAYER_RESOURCES["power"],
            PRE_INIT_PLAYER_RESOURCES["materials"],
            PRE_INIT_PLAYER_RESOURCES["premium_currency"]
        )
    )

    if cursor.rowcount == 0:
        conn.execute(
            """
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
            VALUES (?, ?, ?, ?, ?, 0, '', '', '标准')
            """,
            (
                1,
                PRE_INIT_PLAYER_RESOURCES["food"],
                PRE_INIT_PLAYER_RESOURCES["power"],
                PRE_INIT_PLAYER_RESOURCES["materials"],
                PRE_INIT_PLAYER_RESOURCES["premium_currency"]
            )
        )

    conn.execute(
        """
        DELETE FROM sqlite_sequence
        WHERE name IN ('survivors', 'gacha_logs', 'duty_logs', 'offer_logs')
        """
    )
    return deleted_counts


def clamp_resource_value(value):
    return max(0, value)


def normalize_player_resources(conn):
    player = conn.execute(
        "SELECT food, power, materials, premium_currency FROM player WHERE id = 1"
    ).fetchone()

    normalized = {}
    repaired_deficit = {}

    for resource_name in PLAYER_RESOURCE_KEYS:
        current_value = player[resource_name]
        normalized[resource_name] = clamp_resource_value(current_value)
        repaired_deficit[resource_name] = max(0, -current_value)

    normalized["premium_currency"] = player["premium_currency"]

    if any(repaired_deficit.values()):
        conn.execute(
            """
            UPDATE player
            SET food = ?,
                power = ?,
                materials = ?
            WHERE id = 1
            """,
            (
                normalized["food"],
                normalized["power"],
                normalized["materials"]
            )
        )

    return {
        "player": normalized,
        "repaired_deficit": repaired_deficit
    }


def build_resource_payload(player, power_deficit=0):
    power = clamp_resource_value(player["power"])

    return {
        "food": clamp_resource_value(player["food"]),
        "power": power,
        "materials": clamp_resource_value(player["materials"]),
        "premium_currency": player["premium_currency"],
        "power_shortage": power <= 0,
        "power_deficit": power_deficit
    }


def build_emergency_offer(trigger_reason=None):
    offer = {
        "offer_id": EMERGENCY_OFFER["offer_id"],
        "title": EMERGENCY_OFFER["title"],
        "subtitle": EMERGENCY_OFFER["subtitle"],
        "urgency_label": EMERGENCY_OFFER["urgency_label"],
        "price_label": EMERGENCY_OFFER["price_label"],
        "rewards": dict(EMERGENCY_OFFER["rewards"])
    }
    copy = EMERGENCY_OFFER_COPY_BY_TRIGGER.get(trigger_reason)

    if copy:
        offer.update(copy)

    return offer


def survivor_name_exists(conn, name):
    return conn.execute(
        """
        SELECT id
        FROM survivors
        WHERE name = ?
        LIMIT 1
        """,
        (name,)
    ).fetchone() is not None


def pick_static_trait(mood, role):
    if mood in TRAIT_BY_MOOD:
        return TRAIT_BY_MOOD[mood]

    seed = f"{mood}:{role}"
    trait_index = sum(ord(character) for character in seed) % len(STATIC_TRAIT_POOL)
    return STATIC_TRAIT_POOL[trait_index]


def build_survivor_personality(mood, role, name=None):
    trait = pick_static_trait(mood, role)
    role_profile = ROLE_PROFILE_MAPPINGS.get(role, DEFAULT_ROLE_PROFILE)
    work_style_line = role_profile["work_style"].format(
        trait=trait,
        role=role
    )
    archive_line = role_profile["archive"].format(
        trait=trait,
        role=role
    )

    return {
        "trait_label": trait,
        "work_style_line": work_style_line,
        "archive_line": archive_line,
        "personality_label": trait,
        "signature_line": archive_line
    }


def build_survivor_profile_fields(personality):
    return {
        "trait_label": personality["trait_label"],
        "work_style_line": personality["work_style_line"],
        "archive_line": personality["archive_line"],
        "personality_label": personality["personality_label"],
        "signature_line": personality["signature_line"]
    }


def build_gacha_intro_line(survivor):
    rarity_label = RARITY_GACHA_LABELS.get(
        survivor["rarity"],
        "新成员登记"
    )
    entrance_line = MOOD_GACHA_ENTRANCE_LINES.get(
        survivor["mood"],
        "在登记台前停下，等待避难所分配任务。"
    )

    return (
        f"{rarity_label}：{survivor['name']}以{survivor['role']}身份加入，"
        f"{entrance_line}"
    )


def build_survivor_state_tags(fatigue, health):
    if health <= 30:
        return {
            "current_state_tag": "重伤",
            "injured_tag": "重伤"
        }

    if health <= 60:
        return {
            "current_state_tag": "状态不稳",
            "injured_tag": "受伤"
        }

    if fatigue >= 80:
        return {
            "current_state_tag": "疲惫",
            "injured_tag": None
        }

    return {
        "current_state_tag": "状态良好",
        "injured_tag": None
    }


def build_survivor_status_fields(survivor, current_day=None):
    status = survivor["status"] if "status" in survivor.keys() else SURVIVOR_STATUS_ACTIVE
    if status not in SURVIVOR_STATUSES:
        status = SURVIVOR_STATUS_ACTIVE

    available_on_day = (
        survivor["available_on_day"]
        if "available_on_day" in survivor.keys()
        else 1
    )
    leave_reason = (
        survivor["leave_reason"]
        if "leave_reason" in survivor.keys()
        else ""
    ) or ""

    if status == SURVIVOR_STATUS_INJURED:
        reason = f"重伤停工，恢复日：第 {available_on_day} 天"
        return {
            "status": status,
            "status_label": "重伤停工",
            "available_on_day": available_on_day,
            "leave_reason": "",
            "assignable": False,
            "unavailable_reason": reason,
            "current_state_tag": "重伤停工",
            "injured_tag": f"恢复日：第 {available_on_day} 天"
        }

    if status == SURVIVOR_STATUS_LEFT:
        reason = leave_reason or "已离开避难所"
        return {
            "status": status,
            "status_label": "已离队",
            "available_on_day": available_on_day,
            "leave_reason": reason,
            "assignable": False,
            "unavailable_reason": reason,
            "current_state_tag": "已离队",
            "injured_tag": None
        }

    return {
        "status": SURVIVOR_STATUS_ACTIVE,
        "status_label": "可值勤",
        "available_on_day": available_on_day,
        "leave_reason": "",
        "assignable": True,
        "unavailable_reason": "",
        "current_state_tag": None,
        "injured_tag": None
    }


def serialize_survivor(row, current_day=None):
    personality = build_survivor_personality(row["mood"], row["role"])
    state_tags = build_survivor_state_tags(row["fatigue"], row["health"])
    status_fields = build_survivor_status_fields(row, current_day)
    current_state_tag = (
        status_fields["current_state_tag"]
        or state_tags["current_state_tag"]
    )
    injured_tag = (
        status_fields["injured_tag"]
        if status_fields["injured_tag"] is not None
        else state_tags["injured_tag"]
    )

    return {
        "id": row["id"],
        "name": row["name"],
        "rarity": row["rarity"],
        "role": row["role"],
        "mood": row["mood"],
        "fatigue": row["fatigue"],
        "health": row["health"],
        **build_survivor_profile_fields(personality),
        "current_state_tag": current_state_tag,
        "injured_tag": injured_tag,
        "status": status_fields["status"],
        "status_label": status_fields["status_label"],
        "available_on_day": status_fields["available_on_day"],
        "leave_reason": status_fields["leave_reason"],
        "assignable": status_fields["assignable"],
        "unavailable_reason": status_fields["unavailable_reason"]
    }


def build_duty_condition_phrase(state_tag):
    if state_tag == "疲惫":
        return "出发时已经疲惫"
    if state_tag == "状态不稳":
        return "出发时状态不稳"
    if state_tag == "重伤":
        return "出发时带着重伤"
    return "出发时状态良好"


def build_duty_outcome_phrase(output_warnings, state_change):
    penalty_applied = len(output_warnings) > 0
    injured = state_change.get("health_change", 0) < 0

    if penalty_applied and injured:
        return "产出被压低，撤回时还留下新伤"
    if penalty_applied:
        return "状态拖慢了节奏，产出被压低"
    if injured:
        return "任务完成了，但撤回时留下新伤"
    return "任务收尾稳定"


def build_duty_result_text(
    survivor,
    duty_type,
    result_sentence,
    output_warnings,
    state_change
):
    personality = build_survivor_personality(
        survivor["mood"],
        survivor["role"],
        survivor["name"]
    )
    state_tags = build_survivor_state_tags(
        survivor["fatigue"],
        survivor["health"]
    )
    duty_focus = DUTY_NARRATIVE_FOCUS.get(duty_type, "临时任务")
    condition_phrase = build_duty_condition_phrase(
        state_tags["current_state_tag"]
    )
    outcome_phrase = build_duty_outcome_phrase(output_warnings, state_change)
    flavor_sentence = (
        f"{survivor['name']}接手{duty_focus}时显得{personality['trait_label']}，"
        f"{condition_phrase}，{outcome_phrase}。"
    )

    return f"{result_sentence} {flavor_sentence}"


def get_resource_pressure_reason(player):
    if player["power"] <= 0:
        return "power_shortage"
    if player["food"] <= RESOURCE_CRITICAL_THRESHOLDS["food"]:
        return "food_pressure"
    if player["power"] <= RESOURCE_CRITICAL_THRESHOLDS["power"]:
        return "power_pressure"
    if player["materials"] <= RESOURCE_CRITICAL_THRESHOLDS["materials"]:
        return "materials_pressure"

    warning_count = 0
    for key, threshold in RESOURCE_WARNING_THRESHOLDS.items():
        if player[key] <= threshold:
            warning_count += 1

    if warning_count >= 2:
        return "combined_resource_pressure"

    return None


def get_team_state_pressure_reason(conn):
    ensure_survivor_state_columns(conn)
    rows = conn.execute(
        """
        SELECT fatigue, health
        FROM survivors
        WHERE owned = 1
          AND status != 'left'
        """
    ).fetchall()

    if not rows:
        return None

    stressed_count = 0
    critical_health_count = 0

    for row in rows:
        if row["health"] <= TEAM_CRITICAL_HEALTH_THRESHOLD:
            critical_health_count += 1
        if (
            row["fatigue"] >= TEAM_STRESS_FATIGUE_THRESHOLD
            or row["health"] <= TEAM_STRESS_HEALTH_THRESHOLD
        ):
            stressed_count += 1

    if critical_health_count >= 1:
        return "team_state_pressure"
    if len(rows) >= 2 and stressed_count >= 2:
        return "team_state_pressure"

    return None


def get_low_efficiency_pressure_reason(conn):
    rows = conn.execute(
        """
        SELECT food_change, power_change, materials_change
        FROM duty_logs
        WHERE duty_type != 'rest'
        ORDER BY id DESC
        LIMIT ?
        """,
        (RECENT_DUTY_LOG_LIMIT,)
    ).fetchall()

    if len(rows) < RECENT_DUTY_LOG_LIMIT:
        return None

    low_efficiency_count = 0
    for row in rows:
        total_change = (
            row["food_change"]
            + row["power_change"]
            + row["materials_change"]
        )
        if total_change <= LOW_EFFICIENCY_TOTAL_CHANGE_THRESHOLD:
            low_efficiency_count += 1

    if low_efficiency_count >= LOW_EFFICIENCY_TRIGGER_COUNT:
        return "low_efficiency_pressure"

    return None


def has_purchased_offer_for_trigger(conn, trigger_reason):
    if not trigger_reason:
        return False

    return conn.execute(
        """
        SELECT id
        FROM offer_logs
        WHERE offer_id = ?
          AND event_type = 'purchased'
          AND trigger_reason = ?
        LIMIT 1
        """,
        (EMERGENCY_OFFER_ID, trigger_reason)
    ).fetchone() is not None


def is_severe_emergency_pressure(conn, player):
    if player["power"] <= 0:
        return True

    for resource_name, threshold in SEVERE_RESOURCE_THRESHOLDS.items():
        if player[resource_name] <= threshold:
            return True

    ensure_survivor_state_columns(conn)
    rows = conn.execute(
        """
        SELECT fatigue, health
        FROM survivors
        WHERE owned = 1
          AND status != 'left'
        """
    ).fetchall()

    exhausted_count = 0
    for row in rows:
        if row["health"] <= SEVERE_TEAM_HEALTH_THRESHOLD:
            return True
        if row["fatigue"] >= SEVERE_TEAM_FATIGUE_THRESHOLD:
            exhausted_count += 1

    return len(rows) >= 2 and exhausted_count >= 2


def get_offer_suppression_status(conn, trigger_reason, action_count, player, run_state):
    current_day = run_state["current_day"] if run_state else 0
    suppressed_until_day = (
        run_state["offer_suppressed_until_day"]
        if run_state
        else 0
    )
    day_suppressed = (
        suppressed_until_day > 0
        and current_day <= suppressed_until_day
    )
    status = {
        "is_suppressed": day_suppressed,
        "day_suppressed": day_suppressed,
        "suppress_until_day": suppressed_until_day,
        "suppress_remaining_days": max(0, suppressed_until_day - current_day + 1)
        if day_suppressed
        else 0,
        "suppress_remaining_actions": 0,
        "suppress_until_action_count": None,
        "closed_action_count": None,
        "severe_pressure_override": False
    }

    if not trigger_reason:
        return status

    if day_suppressed:
        return status

    ensure_offer_log_columns(conn)

    closed = conn.execute(
        """
        SELECT action_count
        FROM offer_logs
        WHERE offer_id = ?
          AND event_type = 'closed'
          AND trigger_reason = ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (EMERGENCY_OFFER_ID, trigger_reason)
    ).fetchone()

    if not closed:
        return status

    suppress_until = (
        closed["action_count"] + EMERGENCY_OFFER_SUPPRESS_ACTION_WINDOW
    )
    remaining_actions = max(0, suppress_until - action_count)
    severe_override = is_severe_emergency_pressure(conn, player)

    status.update({
        "is_suppressed": remaining_actions > 0 and not severe_override,
        "day_suppressed": False,
        "suppress_remaining_actions": remaining_actions,
        "suppress_until_action_count": suppress_until,
        "closed_action_count": closed["action_count"],
        "severe_pressure_override": severe_override
    })
    return status


def get_emergency_offer_context(conn):
    run_state = read_current_run(conn)
    resource_state = normalize_player_resources(conn)
    player = resource_state["player"]
    ensure_survivor_state_columns(conn)
    survivor_count = conn.execute(
        """
        SELECT COUNT(*) AS count
        FROM survivors
        WHERE owned = 1
          AND status != 'left'
        """
    ).fetchone()["count"]

    trigger_reason = (
        get_resource_pressure_reason(player)
        or get_team_state_pressure_reason(conn)
        or get_low_efficiency_pressure_reason(conn)
    )
    action_count = get_completed_duty_count(conn)
    purchased = has_purchased_offer_for_trigger(conn, trigger_reason)
    suppression = get_offer_suppression_status(
        conn,
        trigger_reason,
        action_count,
        player,
        run_state
    )
    active = (
        survivor_count >= 1
        and not purchased
        and not suppression["is_suppressed"]
        and trigger_reason is not None
    )

    return {
        "active": active,
        "trigger_reason": trigger_reason if active else None,
        "raw_trigger_reason": trigger_reason,
        "player": player,
        "survivor_count": survivor_count,
        "action_count": action_count,
        "purchased": purchased,
        "close_suppressed": suppression["is_suppressed"],
        "run_state": run_state,
        **suppression
    }


def log_offer_event(conn, event_type, context):
    ensure_offer_log_columns(conn)
    player = context["player"]
    action_count = context.get("action_count")
    if action_count is None:
        action_count = get_completed_duty_count(conn)

    conn.execute(
        """
        INSERT INTO offer_logs (
            offer_id,
            event_type,
            trigger_reason,
            food_before,
            power_before,
            materials_before,
            premium_currency_before,
            survivor_count,
            action_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            EMERGENCY_OFFER_ID,
            event_type,
            context["raw_trigger_reason"],
            player["food"],
            player["power"],
            player["materials"],
            player["premium_currency"],
            context["survivor_count"],
            action_count
        )
    )


def clamp_state_value(value):
    return max(0, min(100, value))


def apply_emergency_offer_survivor_recovery(conn):
    ensure_survivor_state_columns(conn)
    rows = conn.execute(
        """
        SELECT id, fatigue, health
        FROM survivors
        WHERE owned = 1
          AND status != 'left'
        """
    ).fetchall()

    for row in rows:
        updated_fatigue = clamp_state_value(
            row["fatigue"] - EMERGENCY_OFFER_FATIGUE_RECOVERY
        )
        updated_health = clamp_state_value(
            row["health"] + EMERGENCY_OFFER_HEALTH_RECOVERY
        )
        conn.execute(
            """
            UPDATE survivors
            SET fatigue = ?,
                health = ?
            WHERE id = ?
            """,
            (updated_fatigue, updated_health, row["id"])
        )

    return {
        "affected_survivor_count": len(rows),
        "fatigue_change": -EMERGENCY_OFFER_FATIGUE_RECOVERY,
        "health_change": EMERGENCY_OFFER_HEALTH_RECOVERY
    }


def reduce_positive_change(value, multiplier):
    if value <= 0:
        return value
    return max(0, int(value * multiplier))


def get_resource_change_key(resource_name):
    return f"{resource_name}_change"


def apply_player_resource_changes(conn, changes):
    resource_state = normalize_player_resources(conn)
    player = resource_state["player"]
    updated = {}
    actual_changes = {}
    shortfall = {}

    for resource_name in PLAYER_RESOURCE_KEYS:
        change_key = get_resource_change_key(resource_name)
        requested_change = changes.get(change_key, 0)
        current_value = player[resource_name]
        raw_next_value = current_value + requested_change
        updated_value = clamp_resource_value(raw_next_value)

        updated[resource_name] = updated_value
        actual_changes[change_key] = updated_value - current_value
        shortfall[resource_name] = max(0, -raw_next_value)

    conn.execute(
        """
        UPDATE player
        SET food = ?,
            power = ?,
            materials = ?
        WHERE id = 1
        """,
        (
            updated["food"],
            updated["power"],
            updated["materials"]
        )
    )

    return {
        "actual_changes": actual_changes,
        "shortfall": shortfall,
        "updated": updated,
        "repaired_deficit": resource_state["repaired_deficit"]
    }


def get_int_delta(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def apply_event_resource_delta(conn, resource_delta):
    if not isinstance(resource_delta, dict):
        resource_delta = {}

    player = normalize_player_resources(conn)["player"]
    update_values = {}
    actual_changes = {}

    for resource_name in (
        "food",
        "power",
        "materials",
        "premium_currency"
    ):
        requested_delta = get_int_delta(resource_delta.get(resource_name, 0))
        current_value = player[resource_name]
        if resource_name == "premium_currency":
            next_value = max(0, current_value + requested_delta)
        else:
            next_value = clamp_resource_value(current_value + requested_delta)

        update_values[resource_name] = next_value
        actual_changes[get_resource_change_key(resource_name)] = (
            next_value - current_value
        )

    conn.execute(
        """
        UPDATE player
        SET food = ?,
            power = ?,
            materials = ?,
            premium_currency = ?
        WHERE id = 1
        """,
        (
            update_values["food"],
            update_values["power"],
            update_values["materials"],
            update_values["premium_currency"]
        )
    )

    return actual_changes


def get_target_survivor_for_event(conn, event_payload):
    target = event_payload.get("target_survivor") or {}
    target_id = target.get("id")
    if not target_id:
        return None

    ensure_survivor_state_columns(conn)
    return conn.execute(
        """
        SELECT id, name, rarity, role, mood, fatigue, health,
               status, available_on_day, leave_reason
        FROM survivors
        WHERE id = ?
          AND owned = 1
        """,
        (target_id,)
    ).fetchone()


def apply_survivor_numeric_delta(row, effect):
    fatigue_delta = get_int_delta(effect.get("fatigue_delta", 0))
    health_delta = get_int_delta(effect.get("health_delta", 0))
    return {
        "fatigue": clamp_state_value(row["fatigue"] + fatigue_delta),
        "health": clamp_state_value(row["health"] + health_delta),
        "fatigue_change": fatigue_delta,
        "health_change": health_delta
    }


def apply_event_survivor_effect(conn, effect, event_payload, current_day):
    if not isinstance(effect, dict):
        return None

    status_effect = effect.get("survivor_status")
    if not status_effect:
        return None

    target = get_target_survivor_for_event(conn, event_payload)
    if not target or target["status"] == SURVIVOR_STATUS_LEFT:
        return {
            "applied": False,
            "message": "目标幸存者已经不可用，人员影响未生效。"
        }

    state_delta = apply_survivor_numeric_delta(target, effect)

    if status_effect == SURVIVOR_STATUS_INJURED:
        recovery_days = max(1, get_int_delta(effect.get("recovery_days", 1)))
        available_on_day = current_day + recovery_days
        conn.execute(
            """
            UPDATE survivors
            SET fatigue = ?,
                health = ?,
                status = 'injured',
                available_on_day = ?,
                leave_reason = ''
            WHERE id = ?
            """,
            (
                state_delta["fatigue"],
                state_delta["health"],
                available_on_day,
                target["id"]
            )
        )
        return {
            "applied": True,
            "status": SURVIVOR_STATUS_INJURED,
            "survivor_id": target["id"],
            "survivor_name": target["name"],
            "available_on_day": available_on_day,
            "fatigue_change": state_delta["fatigue_change"],
            "health_change": state_delta["health_change"],
            "message": f"{target['name']}重伤停工，将在第 {available_on_day} 天后恢复。"
        }

    if status_effect == SURVIVOR_STATUS_LEFT:
        leave_reason = effect.get("leave_reason") or "离开避难所"
        conn.execute(
            """
            UPDATE survivors
            SET fatigue = ?,
                health = ?,
                status = 'left',
                available_on_day = ?,
                leave_reason = ?
            WHERE id = ?
            """,
            (
                state_delta["fatigue"],
                state_delta["health"],
                current_day,
                leave_reason,
                target["id"]
            )
        )
        return {
            "applied": True,
            "status": SURVIVOR_STATUS_LEFT,
            "survivor_id": target["id"],
            "survivor_name": target["name"],
            "available_on_day": current_day,
            "leave_reason": leave_reason,
            "fatigue_change": state_delta["fatigue_change"],
            "health_change": state_delta["health_change"],
            "message": f"{target['name']}已离队：{leave_reason}。"
        }

    return None


def apply_event_choice_effects(conn, run_state, event_def, event_payload, choice):
    effects = choice.get("effects") or {}
    resource_changes = apply_event_resource_delta(
        conn,
        effects.get("resource_delta", {})
    )
    survivor_effect = apply_event_survivor_effect(
        conn,
        effects.get("survivor", {}),
        event_payload,
        run_state["current_day"]
    )
    result_text = format_event_text(
        choice.get("result_text", "事件已处理。"),
        event_payload
    )

    return {
        "event_id": event_def["id"],
        "choice_id": choice.get("id"),
        "title": format_event_text(event_def.get("title", ""), event_payload),
        "result_text": result_text,
        "resource_changes": resource_changes,
        "survivor_effect": survivor_effect
    }


def apply_duty_operating_cost(changes, duty_type):
    costs = DUTY_OPERATING_COSTS.get(duty_type, {})
    adjusted = dict(changes)

    for resource_name, amount in costs.items():
        adjusted[get_resource_change_key(resource_name)] -= amount

    return adjusted, costs


def format_resource_cost_text(costs):
    labels = {
        "food": "食物",
        "power": "电力",
        "materials": "材料"
    }
    parts = []

    for resource_name in ("food", "power", "materials"):
        amount = costs.get(resource_name, 0)
        if amount > 0:
            parts.append(f"{labels[resource_name]} -{amount}")

    return "，".join(parts)


def get_completed_duty_count(conn):
    return conn.execute(
        """
        SELECT COUNT(*) AS count
        FROM duty_logs
        WHERE duty_type != 'rest'
        """
    ).fetchone()["count"]


def apply_shelter_upkeep(conn):
    player = normalize_player_resources(conn)["player"]

    paid = {}
    shortfall = {}

    for resource_name, cost in SHELTER_UPKEEP_COSTS.items():
        available = max(0, player[resource_name])
        paid_amount = min(available, cost)
        paid[resource_name] = paid_amount
        shortfall[resource_name] = cost - paid_amount

    conn.execute(
        """
        UPDATE player
        SET food = food - ?,
            power = power - ?,
            materials = materials - ?
        WHERE id = 1
        """,
        (paid["food"], paid["power"], paid["materials"])
    )

    fully_paid = sum(shortfall.values()) == 0
    team_penalty = {
        "applied": False,
        "affected_survivor_count": 0,
        "fatigue_change": 0,
        "health_change": 0
    }

    if not fully_paid:
        ensure_survivor_state_columns(conn)
        rows = conn.execute(
            """
            SELECT id, fatigue, health
            FROM survivors
            WHERE owned = 1
              AND status != 'left'
            """
        ).fetchall()

        for row in rows:
            conn.execute(
                """
                UPDATE survivors
                SET fatigue = ?,
                    health = ?
                WHERE id = ?
                """,
                (
                    clamp_state_value(
                        row["fatigue"] + SHELTER_UPKEEP_FATIGUE_PENALTY
                    ),
                    clamp_state_value(
                        row["health"] - SHELTER_UPKEEP_HEALTH_PENALTY
                    ),
                    row["id"]
                )
            )

        team_penalty = {
            "applied": True,
            "affected_survivor_count": len(rows),
            "fatigue_change": SHELTER_UPKEEP_FATIGUE_PENALTY,
            "health_change": -SHELTER_UPKEEP_HEALTH_PENALTY
        }

    return {
        "triggered": True,
        "cost": SHELTER_UPKEEP_COSTS,
        "paid": paid,
        "shortfall": shortfall,
        "fully_paid": fully_paid,
        "team_penalty": team_penalty
    }


def build_shelter_upkeep_text(upkeep):
    if not upkeep or not upkeep.get("triggered"):
        return ""

    paid_text = format_resource_cost_text(upkeep["paid"])
    if upkeep["fully_paid"]:
        return f"避难所例行维护完成，维护成本：{paid_text}。"

    shortfall_text = format_resource_cost_text(upkeep["shortfall"])
    return (
        f"避难所例行维护未能足额支付，缺口：{shortfall_text}，"
        "全员疲劳上升，健康小幅下降。"
    )


def apply_power_shortage_penalty(conn):
    ensure_survivor_state_columns(conn)
    rows = conn.execute(
        """
        SELECT id, fatigue
        FROM survivors
        WHERE owned = 1
          AND status != 'left'
        """
    ).fetchall()

    for row in rows:
        conn.execute(
            """
            UPDATE survivors
            SET fatigue = ?
            WHERE id = ?
            """,
            (
                clamp_state_value(
                    row["fatigue"] + POWER_SHORTAGE_FATIGUE_PENALTY
                ),
                row["id"]
            )
        )

    return {
        "applied": len(rows) > 0,
        "affected_survivor_count": len(rows),
        "fatigue_change": POWER_SHORTAGE_FATIGUE_PENALTY,
        "health_change": 0
    }


def build_power_shortage_text(power_shortfall):
    if power_shortfall <= 0:
        return ""

    return (
        f"电力不足，缺口 {power_shortfall} 点，"
        "避难所转入低功耗运行，全员疲劳上升。"
    )


def apply_survivor_state_penalty(changes, survivor):
    name = survivor["name"]
    fatigue = survivor["fatigue"]
    health = survivor["health"]
    multiplier = 1.0
    warnings = []

    if fatigue >= 80:
        multiplier *= 0.75
        warnings.append(f"{name}已经非常疲惫，收益受到影响。")

    if health <= 30:
        multiplier *= 0.75
        warnings.append(f"{name}健康状况偏低，收益受到影响。")

    if multiplier >= 1.0:
        return changes, warnings

    adjusted = {
        "food_change": reduce_positive_change(changes["food_change"], multiplier),
        "power_change": reduce_positive_change(changes["power_change"], multiplier),
        "materials_change": reduce_positive_change(changes["materials_change"], multiplier)
    }
    return adjusted, warnings


def resolve_survivor_state_change(survivor, duty_type):
    fatigue_gain = FATIGUE_INCREASE_BY_DUTY[duty_type]
    health_loss = 0
    warnings = []

    if duty_type == "scavenge" and random.random() < 0.20:
        health_loss = random.randint(5, 12)
    elif duty_type == "guard" and random.random() < 0.10:
        health_loss = random.randint(3, 8)

    if health_loss > 0:
        warnings.append(f"{survivor['name']}状态不稳，本次行动受伤，健康下降。")

    updated_fatigue = clamp_state_value(survivor["fatigue"] + fatigue_gain)
    updated_health = clamp_state_value(survivor["health"] - health_loss)

    return {
        "fatigue_change": fatigue_gain,
        "health_change": -health_loss,
        "fatigue": updated_fatigue,
        "health": updated_health,
        "warnings": warnings
    }


def resolve_high_risk_survivor_consequence(survivor, duty_type, survivor_state, current_day):
    if duty_type not in HIGH_RISK_DUTIES:
        return None

    poor_health = survivor["health"] <= 35
    severe_health = survivor["health"] <= 20
    severe_fatigue = survivor["fatigue"] >= 85

    if severe_health and severe_fatigue:
        return {
            "status": SURVIVOR_STATUS_LEFT,
            "available_on_day": current_day,
            "leave_reason": "带伤高风险值勤后选择离开避难所",
            "message": f"{survivor['name']}带伤完成高风险值勤后离队。"
        }

    if poor_health or severe_fatigue:
        available_on_day = current_day + HIGH_RISK_INJURY_RECOVERY_DAYS
        return {
            "status": SURVIVOR_STATUS_INJURED,
            "available_on_day": available_on_day,
            "leave_reason": "",
            "message": (
                f"{survivor['name']}原本状态已经很差，高风险值勤后重伤停工，"
                f"恢复日为第 {available_on_day} 天。"
            )
        }

    return None


def build_survivor_result(rarity, picked):
    result = {
        "name": picked["name"],
        "rarity": rarity,
        "role": picked["role"],
        "mood": picked["mood"],
        "fatigue": 0,
        "health": 100,
        "status": SURVIVOR_STATUS_ACTIVE,
        "available_on_day": 1,
        "leave_reason": ""
    }
    result.update(build_survivor_personality(result["mood"], result["role"]))
    result.update(build_survivor_state_tags(result["fatigue"], result["health"]))
    result["gacha_intro_line"] = build_gacha_intro_line(result)
    return result


def build_named_survivor_result(rarity, survivor_name):
    candidates = SURVIVOR_POOL.get(rarity, [])
    picked = None

    for candidate in candidates:
        if candidate["name"] == survivor_name:
            picked = candidate
            break

    if not picked and candidates:
        picked = candidates[0]

    if not picked:
        return None

    return build_survivor_result(rarity, picked)


def get_local_demo_gacha_result(conn):
    if not DEMO_MODE_ENABLED or not is_local_dev_request():
        return None

    draw_count = conn.execute(
        "SELECT COUNT(*) AS count FROM gacha_logs"
    ).fetchone()["count"]

    if draw_count >= len(LOCAL_DEMO_GACHA_SEQUENCE):
        return None

    scripted_draw = LOCAL_DEMO_GACHA_SEQUENCE[draw_count]
    return build_named_survivor_result(
        scripted_draw["rarity"],
        scripted_draw["name"]
    )


def roll_survivor():
    rarity = random.choices(
        ["SSR", "SR", "R"],
        weights=[5, 20, 75],
        k=1
    )[0]
    picked = random.choice(SURVIVOR_POOL[rarity])
    return build_survivor_result(rarity, picked)


def build_state_aware_duty_result(survivor, duty_type, changes, text_builder):
    adjusted_changes, output_warnings = apply_survivor_state_penalty(changes, survivor)
    final_changes, operating_cost = apply_duty_operating_cost(
        adjusted_changes,
        duty_type
    )
    state_change = resolve_survivor_state_change(survivor, duty_type)
    result_sentence = text_builder(adjusted_changes)
    result_text = build_duty_result_text(
        survivor,
        duty_type,
        result_sentence,
        output_warnings,
        state_change
    )
    operating_cost_text = format_resource_cost_text(operating_cost)
    if operating_cost_text:
        result_text = f"{result_text} 本次值勤运转成本：{operating_cost_text}。"

    return {
        "food_change": final_changes["food_change"],
        "power_change": final_changes["power_change"],
        "materials_change": final_changes["materials_change"],
        "result_text": result_text,
        "operating_cost": operating_cost,
        "survivor_state": {
            "fatigue_change": state_change["fatigue_change"],
            "health_change": state_change["health_change"],
            "fatigue": state_change["fatigue"],
            "health": state_change["health"]
        }
    }


def resolve_duty_result(survivor, duty_type):
    name = survivor["name"]
    rarity = survivor["rarity"]

    bonus = 0
    if rarity == "SSR":
        bonus = 2
    elif rarity == "SR":
        bonus = 1

    if duty_type == "scavenge":
        changes = {
            "food_change": random.randint(0, 2),
            "power_change": 0,
            "materials_change": random.randint(4, 8) + bonus
        }
        return build_state_aware_duty_result(
            survivor,
            duty_type,
            changes,
            lambda result: (
                f"{name}外出搜集，带回了 {result['materials_change']} 份材料"
                f"和 {result['food_change']} 份食物。"
            )
        )

    if duty_type == "generate_power":
        changes = {
            "food_change": 0,
            "power_change": random.randint(5, 10) + bonus,
            "materials_change": -random.randint(1, 3)
        }
        return build_state_aware_duty_result(
            survivor,
            duty_type,
            changes,
            lambda result: (
                f"{name}维护发电设备，避难所恢复了 {result['power_change']} 点电力，"
                f"消耗 {-result['materials_change']} 份材料。"
            )
        )

    if duty_type == "cook":
        changes = {
            "food_change": random.randint(4, 9) + bonus,
            "power_change": 0,
            "materials_change": -random.randint(1, 3)
        }
        return build_state_aware_duty_result(
            survivor,
            duty_type,
            changes,
            lambda result: (
                f"{name}整理库存并完成炊事，产出了 {result['food_change']} 份食物，"
                f"消耗 {-result['materials_change']} 份材料。"
            )
        )

    if duty_type == "guard":
        changes = {
            "food_change": 0,
            "power_change": -random.randint(1, 3),
            "materials_change": 0
        }
        return build_state_aware_duty_result(
            survivor,
            duty_type,
            changes,
            lambda result: (
                f"{name}完成夜间巡逻，避难所今晚没有发生额外损失，"
                f"值班消耗 {-result['power_change']} 点电力。"
            )
        )

    changes = {
        "food_change": 0,
        "power_change": 0,
        "materials_change": 0
    }
    return build_state_aware_duty_result(
        survivor,
        duty_type,
        changes,
        lambda result: f"{name}执行了未知任务。"
    )


@app.before_request
def require_initialized_for_gameplay():
    allowed_paths = {
        "/api/status",
        "/api/init/status",
        "/api/init",
        "/api/dev/reset-init",
        "/api/dev/demo-mode"
    }

    if request.method == "OPTIONS":
        return None

    if not request.path.startswith("/api/") or request.path in allowed_paths:
        return None

    conn = get_db_connection()
    player = get_player_init_profile(conn)
    conn.commit()
    conn.close()

    if player["initialized"]:
        return None

    return jsonify({
        "status": "error",
        "message": "请先完成避难所初始化。",
        "initialized": False
    }), 403


@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({
        "status": "ok",
        "message": "Wasteland Shelter backend is running"
    })


@app.route("/api/init/status", methods=["GET"])
def init_status():
    conn = get_db_connection()
    player = get_player_init_profile(conn)
    conn.commit()
    conn.close()

    return jsonify(build_init_status_payload(player))


@app.route("/api/init", methods=["POST"])
def initialize_game():
    payload = request.get_json(silent=True) or {}
    init_data, validation_error = validate_init_payload(payload)

    if validation_error:
        return jsonify(validation_error), 400

    conn = get_db_connection()
    player = get_player_init_profile(conn)

    if player["initialized"]:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "避难所已经完成初始化。"
        }), 400

    shelter_code = init_data["shelter_code"]
    commander_name = init_data["commander_name"]
    difficulty = init_data["difficulty"]
    resources = DIFFICULTY_STARTING_RESOURCES[difficulty]
    conn.execute(
        """
        UPDATE player
        SET food = ?,
            power = ?,
            materials = ?,
            premium_currency = ?,
            initialized = 1,
            shelter_code = ?,
            commander_name = ?,
            difficulty = ?
        WHERE id = 1
        """,
        (
            resources["food"],
            resources["power"],
            resources["materials"],
            resources["premium_currency"],
            shelter_code,
            commander_name,
            difficulty
        )
    )
    create_current_run(conn, difficulty, count_as_new_run=True)
    run_state = ensure_current_run_ready(conn)
    conn.commit()

    updated_player = conn.execute(
        """
        SELECT food, power, materials, premium_currency,
               initialized, shelter_code, commander_name, difficulty
        FROM player
        WHERE id = 1
        """
    ).fetchone()
    conn.close()

    init_payload = build_init_status_payload(updated_player)
    init_payload.update({
        "message": "避难所控制权已接入。",
        "resources": build_resource_payload(updated_player),
        "run_state": serialize_run_state(run_state)
    })
    return jsonify(init_payload)


@app.route("/api/dev/reset-init", methods=["POST"])
def dev_reset_init():
    if not is_local_dev_request():
        return reject_non_local_dev_request()

    conn = get_db_connection()
    deleted_counts = reset_current_run_state(conn)
    conn.commit()
    conn.close()

    return jsonify({
        "status": "ok",
        "message": "本地调试用新开局已重置。",
        "initialized": False,
        "deleted": deleted_counts
    })


@app.route("/api/dev/demo-mode", methods=["GET", "POST"])
def dev_demo_mode():
    global DEMO_MODE_ENABLED

    if not is_local_dev_request():
        return reject_non_local_dev_request()

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        DEMO_MODE_ENABLED = bool(payload.get("enabled"))

    return jsonify({
        "status": "ok",
        "enabled": DEMO_MODE_ENABLED,
        "scripted_sequence": LOCAL_DEMO_GACHA_SEQUENCE
    })


@app.route("/api/resources", methods=["GET"])
def resources():
    conn = get_db_connection()
    run_state = ensure_current_run_ready(conn)
    resource_state = normalize_player_resources(conn)
    conn.commit()
    conn.close()

    payload = build_resource_payload(
        resource_state["player"],
        resource_state["repaired_deficit"]["power"]
    )
    payload["run_state"] = serialize_run_state(run_state)
    return jsonify(payload)


@app.route("/api/event/resolve", methods=["POST"])
def resolve_event():
    payload = request.get_json(silent=True) or {}
    choice_id = payload.get("choice_id")

    if not choice_id:
        return jsonify({
            "status": "error",
            "message": "参数错误，需要 choice_id"
        }), 400

    conn = get_db_connection()
    run_state = ensure_current_run_ready(conn)

    if not run_state or run_state["game_status"] != "active":
        conn.close()
        return jsonify({
            "status": "error",
            "message": get_run_inactive_message(run_state),
            "run_state": serialize_run_state(run_state)
        }), 400

    if not run_state["pending_event_id"]:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "当前没有待处理事件。",
            "run_state": serialize_run_state(run_state)
        }), 400

    event_def = get_event_definition(run_state["pending_event_id"])
    event_payload = parse_compact_json_object(run_state["pending_event_payload"])
    if not event_def:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "事件配置缺失，请刷新后重试。",
            "run_state": serialize_run_state(run_state)
        }), 400

    choice = None
    for candidate in event_def.get("choices", []):
        if candidate.get("id") == choice_id:
            choice = candidate
            break

    if not choice:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "事件选择不存在。",
            "run_state": serialize_run_state(run_state)
        }), 400

    result = apply_event_choice_effects(
        conn,
        run_state,
        event_def,
        event_payload,
        choice
    )
    resolved_payload = dict(event_payload)
    resolved_payload.update({
        "status": EVENT_PAYLOAD_STATUS_RESOLVED,
        "resolved_choice_id": choice_id
    })
    conn.execute(
        """
        UPDATE run_state
        SET pending_event_id = NULL,
            pending_event_payload = ?
        WHERE id = ?
        """,
        (
            dumps_compact_json(resolved_payload),
            CURRENT_RUN_ID
        )
    )
    run_state = read_current_run(conn)
    resource_state = normalize_player_resources(conn)
    conn.commit()
    conn.close()

    return jsonify({
        "status": "ok",
        "message": "事件已处理。",
        "result": result,
        "resources": build_resource_payload(
            resource_state["player"],
            resource_state["repaired_deficit"]["power"]
        ),
        "run_state": serialize_run_state(run_state)
    })


@app.route("/api/gacha", methods=["POST"])
def gacha():
    conn = get_db_connection()
    _, action_response, action_status = reject_if_actions_exhausted(conn)
    if action_response is not None:
        conn.close()
        return action_response, action_status

    player = conn.execute(
        "SELECT premium_currency FROM player WHERE id = 1"
    ).fetchone()

    if player["premium_currency"] < 1:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "premium_currency 不足"
        }), 400

    scripted_result = get_local_demo_gacha_result(conn)
    result = scripted_result or roll_survivor()
    duplicate_survivor_exists = survivor_name_exists(conn, result["name"])

    conn.execute(
        "UPDATE player SET premium_currency = premium_currency - 1 WHERE id = 1"
    )

    compensation = None

    if duplicate_survivor_exists:
        compensation = {
            "resource": "materials",
            "amount": GACHA_DUPLICATE_MATERIAL_COMPENSATION
        }
        conn.execute(
            "UPDATE player SET materials = materials + ? WHERE id = 1",
            (GACHA_DUPLICATE_MATERIAL_COMPENSATION,)
        )
    else:
        conn.execute(
            """
            INSERT INTO survivors (
                name, rarity, role, mood, fatigue, health,
                status, available_on_day, leave_reason, owned
            )
            VALUES (?, ?, ?, ?, 0, 100, 'active', 1, '', 1)
            """,
            (result["name"], result["rarity"], result["role"], result["mood"])
        )

    conn.execute(
        """
        INSERT INTO gacha_logs (survivor_name, rarity, role)
        VALUES (?, ?, ?)
        """,
        (result["name"], result["rarity"], result["role"])
    )

    run_state, day_transition = consume_action_and_maybe_settle(conn)
    if not run_state:
        conn.rollback()
        run_state = ensure_current_run_exists(conn)
        conn.close()
        return jsonify({
            "status": "error",
            "message": ACTION_EXHAUSTED_MESSAGE,
            "run_state": serialize_run_state(run_state)
        }), 400

    conn.commit()

    updated_player = conn.execute(
        "SELECT materials, premium_currency FROM player WHERE id = 1"
    ).fetchone()

    conn.close()

    response_payload = {
        "status": "ok",
        "message": "Duplicate survivor converted to compensation"
        if duplicate_survivor_exists else "Gacha success",
        "duplicate": duplicate_survivor_exists,
        "compensation": compensation,
        "demo_scripted": scripted_result is not None,
        "survivor": result,
        "materials": updated_player["materials"],
        "premium_currency_left": updated_player["premium_currency"],
        "run_state": serialize_run_state(run_state)
    }
    if day_transition:
        response_payload["day_transition"] = day_transition

    return jsonify(response_payload)


@app.route("/api/survivors", methods=["GET"])
def survivors():
    conn = get_db_connection()
    run_state = ensure_current_run_ready(conn)
    rows = conn.execute(
        """
        SELECT id, name, rarity, role, mood, fatigue, health,
               status, available_on_day, leave_reason
        FROM survivors
        ORDER BY id DESC
        """
    ).fetchall()
    conn.commit()
    conn.close()

    current_day = run_state["current_day"] if run_state else None
    data = [serialize_survivor(row, current_day) for row in rows]

    return jsonify(data)


@app.route("/api/duty", methods=["POST"])
def duty():
    payload = request.get_json(silent=True) or {}
    survivor_id = payload.get("survivor_id")
    duty_type = payload.get("duty_type")

    if not survivor_id or duty_type not in DUTY_TYPES:
        return jsonify({
            "status": "error",
            "message": "参数错误，需要 survivor_id 和合法的 duty_type"
        }), 400

    conn = get_db_connection()

    run_state, action_response, action_status = reject_if_actions_exhausted(conn)
    if action_response is not None:
        conn.close()
        return action_response, action_status

    survivor = conn.execute(
        """
        SELECT id, name, rarity, role, mood, fatigue, health,
               status, available_on_day, leave_reason
        FROM survivors
        WHERE id = ?
        """,
        (survivor_id,)
    ).fetchone()

    if not survivor:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "survivor 不存在"
        }), 404

    if survivor["status"] != SURVIVOR_STATUS_ACTIVE:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "该幸存者当前不可值勤。",
            "survivor": serialize_survivor(
                survivor,
                run_state["current_day"] if run_state else None
            ),
            "run_state": serialize_run_state(run_state)
        }), 400

    if survivor["health"] <= 10 and duty_type in HIGH_RISK_DUTIES:
        conn.close()
        return jsonify({
            "status": "error",
            "message": f"{survivor['name']}健康过低，无法执行外出搜集或夜间守卫。",
            "survivor": serialize_survivor(
                survivor,
                run_state["current_day"] if run_state else None
            ),
            "run_state": serialize_run_state(run_state)
        }), 400

    result = resolve_duty_result(survivor, duty_type)
    survivor_state = result["survivor_state"]
    consequence = resolve_high_risk_survivor_consequence(
        survivor,
        duty_type,
        survivor_state,
        run_state["current_day"] if run_state else 1
    )
    next_status = SURVIVOR_STATUS_ACTIVE
    next_available_on_day = survivor["available_on_day"]
    next_leave_reason = ""

    if consequence:
        next_status = consequence["status"]
        next_available_on_day = consequence["available_on_day"]
        next_leave_reason = consequence.get("leave_reason", "")
        result["survivor_consequence"] = consequence
        result["result_text"] = (
            f"{result['result_text']} {consequence['message']}"
        )

    survivor_state["status"] = next_status
    survivor_state["available_on_day"] = next_available_on_day
    survivor_state["leave_reason"] = next_leave_reason

    conn.execute(
        """
        UPDATE survivors
        SET fatigue = ?,
            health = ?,
            status = ?,
            available_on_day = ?,
            leave_reason = ?
        WHERE id = ?
        """,
        (
            survivor_state["fatigue"],
            survivor_state["health"],
            next_status,
            next_available_on_day,
            next_leave_reason,
            survivor["id"]
        )
    )

    resource_update = apply_player_resource_changes(conn, result)
    for resource_name in PLAYER_RESOURCE_KEYS:
        result[get_resource_change_key(resource_name)] = (
            resource_update["actual_changes"][get_resource_change_key(resource_name)]
        )

    upkeep = None
    direct_power_shortfall = resource_update["shortfall"]["power"]
    total_power_shortfall = direct_power_shortfall
    power_shortage_penalty = {
        "applied": False,
        "affected_survivor_count": 0,
        "fatigue_change": 0,
        "health_change": 0
    }
    if direct_power_shortfall > 0:
        power_shortage_penalty = apply_power_shortage_penalty(conn)
        if next_status != SURVIVOR_STATUS_LEFT:
            survivor_state["fatigue_change"] += (
                power_shortage_penalty["fatigue_change"]
            )
            survivor_state["fatigue"] = clamp_state_value(
                survivor_state["fatigue"]
                + power_shortage_penalty["fatigue_change"]
            )

        power_shortage_text = build_power_shortage_text(direct_power_shortfall)
        if power_shortage_text:
            result["result_text"] = (
                f"{result['result_text']} {power_shortage_text}"
            )

    result["upkeep"] = upkeep
    result["resource_shortfall"] = resource_update["shortfall"]
    result["power_shortage"] = {
        "active": total_power_shortfall > 0,
        "shortfall": total_power_shortfall,
        "team_penalty": power_shortage_penalty
    }

    conn.execute(
        """
        INSERT INTO duty_logs (
            survivor_name,
            duty_type,
            result_text,
            food_change,
            power_change,
            materials_change
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            survivor["name"],
            duty_type,
            result["result_text"],
            result["food_change"],
            result["power_change"],
            result["materials_change"]
        )
    )

    run_state, day_transition = consume_action_and_maybe_settle(conn)
    if not run_state:
        conn.rollback()
        run_state = ensure_current_run_exists(conn)
        conn.close()
        return jsonify({
            "status": "error",
            "message": ACTION_EXHAUSTED_MESSAGE,
            "run_state": serialize_run_state(run_state)
        }), 400

    conn.commit()

    updated_player = conn.execute(
        "SELECT food, power, materials, premium_currency FROM player WHERE id = 1"
    ).fetchone()
    updated_survivor = conn.execute(
        """
        SELECT id, name, rarity, role, mood, fatigue, health,
               status, available_on_day, leave_reason
        FROM survivors
        WHERE id = ?
        """,
        (survivor["id"],)
    ).fetchone()

    conn.close()

    response_payload = {
        "status": "ok",
        "message": "Duty success",
        "survivor": serialize_survivor(
            updated_survivor,
            run_state["current_day"] if run_state else None
        ),
        "duty_type": duty_type,
        "result": result,
        "resources": build_resource_payload(updated_player),
        "run_state": serialize_run_state(run_state)
    }
    if day_transition:
        response_payload["day_transition"] = day_transition

    return jsonify(response_payload)


@app.route("/api/rest", methods=["POST"])
def rest_survivor():
    payload = request.get_json(silent=True) or {}
    survivor_id = payload.get("survivor_id")

    if not survivor_id:
        return jsonify({
            "status": "error",
            "message": "参数错误，需要 survivor_id"
        }), 400

    conn = get_db_connection()

    run_state, action_response, action_status = reject_if_actions_exhausted(conn)
    if action_response is not None:
        conn.close()
        return action_response, action_status

    survivor = conn.execute(
        """
        SELECT id, name, rarity, role, mood, fatigue, health,
               status, available_on_day, leave_reason
        FROM survivors
        WHERE id = ?
        """,
        (survivor_id,)
    ).fetchone()

    if not survivor:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "survivor 不存在"
        }), 404

    if survivor["status"] != SURVIVOR_STATUS_ACTIVE:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "该幸存者当前不可休整。",
            "survivor": serialize_survivor(
                survivor,
                run_state["current_day"] if run_state else None
            ),
            "run_state": serialize_run_state(run_state)
        }), 400

    updated_fatigue = clamp_state_value(survivor["fatigue"] - 25)
    updated_health = clamp_state_value(survivor["health"] + 10)
    fatigue_change = updated_fatigue - survivor["fatigue"]
    health_change = updated_health - survivor["health"]
    result_text = (
        f"{survivor['name']}完成休整，疲劳降低，健康有所恢复。"
    )

    conn.execute(
        """
        UPDATE survivors
        SET fatigue = ?,
            health = ?
        WHERE id = ?
        """,
        (
            updated_fatigue,
            updated_health,
            survivor["id"]
        )
    )

    conn.execute(
        """
        INSERT INTO duty_logs (
            survivor_name,
            duty_type,
            result_text,
            food_change,
            power_change,
            materials_change
        )
        VALUES (?, ?, ?, 0, 0, 0)
        """,
        (
            survivor["name"],
            "rest",
            result_text
        )
    )

    run_state, day_transition = consume_action_and_maybe_settle(conn)
    if not run_state:
        conn.rollback()
        run_state = ensure_current_run_exists(conn)
        conn.close()
        return jsonify({
            "status": "error",
            "message": ACTION_EXHAUSTED_MESSAGE,
            "run_state": serialize_run_state(run_state)
        }), 400

    conn.commit()
    updated_survivor = conn.execute(
        """
        SELECT id, name, rarity, role, mood, fatigue, health,
               status, available_on_day, leave_reason
        FROM survivors
        WHERE id = ?
        """,
        (survivor["id"],)
    ).fetchone()
    conn.close()

    response_payload = {
        "status": "ok",
        "message": "Rest success",
        "survivor": serialize_survivor(
            updated_survivor,
            run_state["current_day"] if run_state else None
        ),
        "duty_type": "rest",
        "result": {
            "food_change": 0,
            "power_change": 0,
            "materials_change": 0,
            "result_text": result_text,
            "survivor_state": {
                "fatigue_change": fatigue_change,
                "health_change": health_change,
                "fatigue": updated_fatigue,
                "health": updated_health
            }
        },
        "run_state": serialize_run_state(run_state)
    }
    if day_transition:
        response_payload["day_transition"] = day_transition

    return jsonify(response_payload)


@app.route("/api/duty-logs", methods=["GET"])
def duty_logs():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT id, survivor_name, duty_type, result_text,
               food_change, power_change, materials_change, created_at
        FROM duty_logs
        ORDER BY id DESC
        LIMIT 20
        """
    ).fetchall()
    conn.close()

    data = []
    for row in rows:
        data.append({
            "id": row["id"],
            "survivor_name": row["survivor_name"],
            "duty_type": row["duty_type"],
            "result_text": row["result_text"],
            "food_change": row["food_change"],
            "power_change": row["power_change"],
            "materials_change": row["materials_change"],
            "created_at": row["created_at"]
        })

    return jsonify(data)


@app.route("/api/gacha-logs", methods=["GET"])
def gacha_logs():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT id, survivor_name, rarity, role, created_at
        FROM (
            SELECT id, survivor_name, rarity, role, created_at
            FROM gacha_logs
            ORDER BY id DESC
            LIMIT 20
        )
        ORDER BY id ASC
        """
    ).fetchall()
    conn.close()

    data = []
    seen_survivor_names = set()
    for row in rows:
        duplicate = row["survivor_name"] in seen_survivor_names
        seen_survivor_names.add(row["survivor_name"])
        data.append({
            "id": row["id"],
            "survivor_name": row["survivor_name"],
            "rarity": row["rarity"],
            "role": row["role"],
            "duplicate": duplicate,
            "compensation": {
                "resource": "materials",
                "amount": GACHA_DUPLICATE_MATERIAL_COMPENSATION
            } if duplicate else None,
            "created_at": row["created_at"]
        })

    return jsonify(list(reversed(data)))


@app.route("/api/emergency-offer/state", methods=["GET"])
def emergency_offer_state():
    conn = get_db_connection()
    context = get_emergency_offer_context(conn)
    conn.commit()
    conn.close()

    return jsonify({
        "status": "ok",
        "active": context["active"],
        "trigger_reason": context["trigger_reason"],
        "suppressed": context["close_suppressed"],
        "is_suppressed": context["is_suppressed"],
        "day_suppressed": context["day_suppressed"],
        "suppress_until_day": context["suppress_until_day"],
        "suppress_remaining_days": context["suppress_remaining_days"],
        "suppress_remaining_actions": context["suppress_remaining_actions"],
        "severe_pressure_override": context["severe_pressure_override"],
        "offer": build_emergency_offer(context["raw_trigger_reason"])
    })


@app.route("/api/emergency-offer/expose", methods=["POST"])
def emergency_offer_expose():
    conn = get_db_connection()
    context = get_emergency_offer_context(conn)
    log_offer_event(conn, "exposed", context)
    conn.commit()
    conn.close()

    return jsonify({
        "status": "ok",
        "message": "Offer exposure logged",
        "active": context["active"],
        "trigger_reason": context["trigger_reason"]
    })


@app.route("/api/emergency-offer/close", methods=["POST"])
def emergency_offer_close():
    conn = get_db_connection()
    context = get_emergency_offer_context(conn)
    log_offer_event(conn, "closed", context)
    run_state = context.get("run_state")
    suppress_until_day = 0
    if run_state:
        suppress_until_day = set_offer_suppression_window(
            conn,
            run_state["current_day"]
        )
    conn.commit()
    conn.close()

    return jsonify({
        "status": "ok",
        "message": "Offer close logged",
        "active": context["active"],
        "trigger_reason": context["trigger_reason"],
        "suppress_until_day": suppress_until_day,
        "suppress_remaining_days": EMERGENCY_OFFER_SUPPRESS_DAYS_AFTER_CLOSE + 1
        if suppress_until_day
        else 0,
        "suppress_remaining_actions": EMERGENCY_OFFER_SUPPRESS_ACTION_WINDOW
    })


@app.route("/api/emergency-offer/purchase", methods=["POST"])
def emergency_offer_purchase():
    conn = get_db_connection()
    context = get_emergency_offer_context(conn)

    if not context["active"]:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "offer 不可用",
            "active": False,
            "trigger_reason": None,
            "offer": build_emergency_offer(context["raw_trigger_reason"])
        }), 400

    log_offer_event(conn, "purchased", context)

    offer = build_emergency_offer(context["raw_trigger_reason"])
    rewards = offer["rewards"]
    conn.execute(
        """
        UPDATE player
        SET food = food + ?,
            power = power + ?,
            materials = materials + ?,
            premium_currency = premium_currency + ?
        WHERE id = 1
        """,
        (
            rewards["food"],
            rewards["power"],
            rewards["materials"],
            rewards["premium_currency"]
        )
    )
    recovery_effect = apply_emergency_offer_survivor_recovery(conn)

    conn.commit()

    updated_player = conn.execute(
        "SELECT food, power, materials, premium_currency FROM player WHERE id = 1"
    ).fetchone()

    conn.close()

    return jsonify({
        "status": "ok",
        "message": (
            "战备补给已入库："
            f"食物 +{rewards['food']} / 电力 +{rewards['power']} / "
            f"材料 +{rewards['materials']} / 招募券 +{rewards['premium_currency']}；"
            f"全员疲劳 -{EMERGENCY_OFFER_FATIGUE_RECOVERY}，"
            f"健康 +{EMERGENCY_OFFER_HEALTH_RECOVERY}。"
        ),
        "offer": offer,
        "trigger_reason": context["trigger_reason"],
        "recovery_effect": recovery_effect,
        "resources": build_resource_payload(updated_player)
    })


@app.route("/api/emergency-offer/logs", methods=["GET"])
def emergency_offer_logs():
    conn = get_db_connection()
    ensure_offer_log_columns(conn)
    rows = conn.execute(
        """
        SELECT id, offer_id, event_type, trigger_reason,
               food_before, power_before, materials_before,
               premium_currency_before, survivor_count, action_count,
               created_at
        FROM offer_logs
        ORDER BY id DESC
        LIMIT 20
        """
    ).fetchall()
    conn.close()

    data = []
    for row in rows:
        data.append({
            "id": row["id"],
            "offer_id": row["offer_id"],
            "event_type": row["event_type"],
            "trigger_reason": row["trigger_reason"],
            "food_before": row["food_before"],
            "power_before": row["power_before"],
            "materials_before": row["materials_before"],
            "premium_currency_before": row["premium_currency_before"],
            "survivor_count": row["survivor_count"],
            "action_count": row["action_count"],
            "created_at": row["created_at"]
        })

    return jsonify(data)


# Local development only. Do not expose this debug endpoint in production.
@app.route("/api/debug/reset-emergency-offer", methods=["POST"])
def debug_reset_emergency_offer():
    if not is_local_dev_request():
        return reject_non_local_dev_request()

    conn = get_db_connection()
    cursor = conn.execute(
        """
        DELETE FROM offer_logs
        WHERE offer_id = ?
        """,
        (EMERGENCY_OFFER_ID,)
    )
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()

    return jsonify({
        "status": "ok",
        "message": "Emergency offer history reset for local development.",
        "deleted_count": deleted_count
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
