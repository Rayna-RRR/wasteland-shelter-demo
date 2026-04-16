from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
import random

app = Flask(__name__)
app.json.ensure_ascii = False
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "game.db")

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

MOOD_PERSONALITY_LABELS = {
    "cold": "冷静克制",
    "alert": "高度警觉",
    "steady": "稳扎稳打",
    "calm": "沉着温和",
    "reckless": "冒险冲动",
    "normal": "朴素可靠",
    "tired": "疲惫坚守",
    "gentle": "温和照料",
    "silent": "沉默寡言"
}

ROLE_SIGNATURE_FOCUS = {
    "维修员": "电缆和滤芯",
    "守卫": "闸门和夜哨",
    "采集员": "废墟路线",
    "医生": "药箱和伤员",
    "搜寻员": "未知房间",
    "杂务员": "漏风的角落",
    "发电员": "发电机余温",
    "炊事员": "锅底和粮袋",
    "搬运工": "沉重物资"
}

MOOD_SIGNATURE_PATTERNS = {
    "cold": "话不多，但会把{focus}记在袖口。",
    "alert": "睡前总会再确认一次{focus}。",
    "steady": "相信清点、绳结和{focus}比运气可靠。",
    "calm": "混乱时先稳住呼吸，再处理{focus}。",
    "reckless": "常说废墟不会等人，转身就冲向{focus}。",
    "normal": "不抢风头，只把今天的{focus}做完。",
    "tired": "眼下有黑影，还是会守着{focus}不松手。",
    "gentle": "会把最后一点温度留给{focus}。",
    "silent": "很少开口，只用行动盯住{focus}。"
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
FATIGUE_INCREASE_BY_DUTY = {
    "scavenge": 18,
    "generate_power": 14,
    "cook": 10,
    "guard": 12
}
HIGH_RISK_DUTIES = ["scavenge", "guard"]
EMERGENCY_OFFER_FATIGUE_RECOVERY = 15
EMERGENCY_OFFER_HEALTH_RECOVERY = 5

EMERGENCY_OFFER_ID = "emergency_supply_v1"
EMERGENCY_OFFER = {
    "offer_id": EMERGENCY_OFFER_ID,
    "title": "战备应急补给协议",
    "subtitle": "避难所监测到补给压力，限时开放一次战备补给。",
    "price_label": "¥6",
    "rewards": {
        "premium_currency": 3,
        "food": 40,
        "power": 40,
        "materials": 25
    }
}


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


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


def build_survivor_personality(mood, role):
    mood_label = MOOD_PERSONALITY_LABELS.get(mood, "沉着可靠")
    focus = ROLE_SIGNATURE_FOCUS.get(role, f"{role}的职责")
    signature_pattern = MOOD_SIGNATURE_PATTERNS.get(
        mood,
        "把{focus}当成今天必须守住的事。"
    )

    return {
        "personality_label": f"{mood_label}的{role}",
        "signature_line": signature_pattern.format(focus=focus)
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
        survivor["role"]
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
        f"{personality['personality_label']}接手{duty_focus}，"
        f"{condition_phrase}，{outcome_phrase}。"
    )

    return f"{result_sentence} {flavor_sentence}"


def get_emergency_trigger_reason(player, action_count):
    if player["food"] <= 95:
        return "food_pressure"
    if player["power"] <= 95:
        return "power_pressure"
    if player["materials"] <= 45:
        return "materials_pressure"
    if action_count >= 3:
        return "shelter_pressure"
    return None


def get_emergency_offer_context(conn):
    player = conn.execute(
        "SELECT food, power, materials, premium_currency FROM player WHERE id = 1"
    ).fetchone()
    survivor_count = conn.execute(
        "SELECT COUNT(*) AS count FROM survivors WHERE owned = 1"
    ).fetchone()["count"]
    gacha_count = conn.execute(
        "SELECT COUNT(*) AS count FROM gacha_logs"
    ).fetchone()["count"]
    duty_count = conn.execute(
        "SELECT COUNT(*) AS count FROM duty_logs"
    ).fetchone()["count"]
    purchased = conn.execute(
        """
        SELECT id
        FROM offer_logs
        WHERE offer_id = ? AND event_type = 'purchased'
        LIMIT 1
        """,
        (EMERGENCY_OFFER_ID,)
    ).fetchone() is not None

    action_count = gacha_count + duty_count
    trigger_reason = get_emergency_trigger_reason(player, action_count)
    active = survivor_count >= 1 and not purchased and trigger_reason is not None

    return {
        "active": active,
        "trigger_reason": trigger_reason if active else None,
        "raw_trigger_reason": trigger_reason,
        "player": player,
        "survivor_count": survivor_count,
        "purchased": purchased
    }


def log_offer_event(conn, event_type, context):
    player = context["player"]
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
            survivor_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            EMERGENCY_OFFER_ID,
            event_type,
            context["raw_trigger_reason"],
            player["food"],
            player["power"],
            player["materials"],
            player["premium_currency"],
            context["survivor_count"]
        )
    )


def clamp_state_value(value):
    return max(0, min(100, value))


def apply_emergency_offer_survivor_recovery(conn):
    rows = conn.execute(
        """
        SELECT id, fatigue, health
        FROM survivors
        WHERE owned = 1
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


def roll_survivor():
    rarity = random.choices(
        ["SSR", "SR", "R"],
        weights=[5, 20, 75],
        k=1
    )[0]
    picked = random.choice(SURVIVOR_POOL[rarity])
    result = {
        "name": picked["name"],
        "rarity": rarity,
        "role": picked["role"],
        "mood": picked["mood"],
        "fatigue": 0,
        "health": 100
    }
    result.update(build_survivor_personality(result["mood"], result["role"]))
    result.update(build_survivor_state_tags(result["fatigue"], result["health"]))
    result["gacha_intro_line"] = build_gacha_intro_line(result)
    return result


def build_state_aware_duty_result(survivor, duty_type, changes, text_builder):
    adjusted_changes, output_warnings = apply_survivor_state_penalty(changes, survivor)
    state_change = resolve_survivor_state_change(survivor, duty_type)
    result_sentence = text_builder(adjusted_changes)
    result_text = build_duty_result_text(
        survivor,
        duty_type,
        result_sentence,
        output_warnings,
        state_change
    )

    return {
        "food_change": adjusted_changes["food_change"],
        "power_change": adjusted_changes["power_change"],
        "materials_change": adjusted_changes["materials_change"],
        "result_text": result_text,
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
            "materials_change": -random.randint(0, 2)
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


@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({
        "status": "ok",
        "message": "Wasteland Shelter backend is running"
    })


@app.route("/api/resources", methods=["GET"])
def resources():
    conn = get_db_connection()
    player = conn.execute(
        "SELECT food, power, materials, premium_currency FROM player WHERE id = 1"
    ).fetchone()
    conn.close()

    return jsonify({
        "food": player["food"],
        "power": player["power"],
        "materials": player["materials"],
        "premium_currency": player["premium_currency"]
    })


@app.route("/api/gacha", methods=["POST"])
def gacha():
    conn = get_db_connection()
    player = conn.execute(
        "SELECT premium_currency FROM player WHERE id = 1"
    ).fetchone()

    if player["premium_currency"] < 1:
        conn.close()
        return jsonify({
            "status": "error",
            "message": "premium_currency 不足"
        }), 400

    result = roll_survivor()
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
            INSERT INTO survivors (name, rarity, role, mood, fatigue, health, owned)
            VALUES (?, ?, ?, ?, 0, 100, 1)
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

    conn.commit()

    updated_player = conn.execute(
        "SELECT materials, premium_currency FROM player WHERE id = 1"
    ).fetchone()

    conn.close()

    return jsonify({
        "status": "ok",
        "message": "Duplicate survivor converted to compensation"
        if duplicate_survivor_exists else "Gacha success",
        "duplicate": duplicate_survivor_exists,
        "compensation": compensation,
        "survivor": result,
        "materials": updated_player["materials"],
        "premium_currency_left": updated_player["premium_currency"]
    })


@app.route("/api/survivors", methods=["GET"])
def survivors():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT id, name, rarity, role, mood, fatigue, health
        FROM survivors
        ORDER BY id DESC
        """
    ).fetchall()
    conn.close()

    data = []
    for row in rows:
        personality = build_survivor_personality(row["mood"], row["role"])
        state_tags = build_survivor_state_tags(row["fatigue"], row["health"])
        data.append({
            "id": row["id"],
            "name": row["name"],
            "rarity": row["rarity"],
            "role": row["role"],
            "mood": row["mood"],
            "fatigue": row["fatigue"],
            "health": row["health"],
            "personality_label": personality["personality_label"],
            "signature_line": personality["signature_line"],
            "current_state_tag": state_tags["current_state_tag"],
            "injured_tag": state_tags["injured_tag"]
        })

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

    survivor = conn.execute(
        """
        SELECT id, name, rarity, role, mood, fatigue, health
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

    if survivor["health"] <= 10 and duty_type in HIGH_RISK_DUTIES:
        personality = build_survivor_personality(survivor["mood"], survivor["role"])
        state_tags = build_survivor_state_tags(survivor["fatigue"], survivor["health"])
        conn.close()
        return jsonify({
            "status": "error",
            "message": f"{survivor['name']}健康过低，无法执行外出搜集或夜间守卫。",
            "survivor": {
                "id": survivor["id"],
                "name": survivor["name"],
                "rarity": survivor["rarity"],
                "role": survivor["role"],
                "mood": survivor["mood"],
                "fatigue": survivor["fatigue"],
                "health": survivor["health"],
                "personality_label": personality["personality_label"],
                "signature_line": personality["signature_line"],
                "current_state_tag": state_tags["current_state_tag"],
                "injured_tag": state_tags["injured_tag"]
            }
        }), 400

    result = resolve_duty_result(survivor, duty_type)
    survivor_state = result["survivor_state"]

    conn.execute(
        """
        UPDATE survivors
        SET fatigue = ?,
            health = ?
        WHERE id = ?
        """,
        (
            survivor_state["fatigue"],
            survivor_state["health"],
            survivor["id"]
        )
    )

    conn.execute(
        """
        UPDATE player
        SET food = food + ?,
            power = power + ?,
            materials = materials + ?
        WHERE id = 1
        """,
        (
            result["food_change"],
            result["power_change"],
            result["materials_change"]
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

    conn.commit()

    updated_player = conn.execute(
        "SELECT food, power, materials, premium_currency FROM player WHERE id = 1"
    ).fetchone()

    conn.close()

    personality = build_survivor_personality(survivor["mood"], survivor["role"])
    state_tags = build_survivor_state_tags(
        survivor_state["fatigue"],
        survivor_state["health"]
    )

    return jsonify({
        "status": "ok",
        "message": "Duty success",
        "survivor": {
            "id": survivor["id"],
            "name": survivor["name"],
            "rarity": survivor["rarity"],
            "role": survivor["role"],
            "mood": survivor["mood"],
            "fatigue": survivor_state["fatigue"],
            "health": survivor_state["health"],
            "personality_label": personality["personality_label"],
            "signature_line": personality["signature_line"],
            "current_state_tag": state_tags["current_state_tag"],
            "injured_tag": state_tags["injured_tag"]
        },
        "duty_type": duty_type,
        "result": result,
        "resources": {
            "food": updated_player["food"],
            "power": updated_player["power"],
            "materials": updated_player["materials"],
            "premium_currency": updated_player["premium_currency"]
        }
    })


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

    survivor = conn.execute(
        """
        SELECT id, name, rarity, role, mood, fatigue, health
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

    conn.commit()
    conn.close()

    personality = build_survivor_personality(survivor["mood"], survivor["role"])
    state_tags = build_survivor_state_tags(updated_fatigue, updated_health)

    return jsonify({
        "status": "ok",
        "message": "Rest success",
        "survivor": {
            "id": survivor["id"],
            "name": survivor["name"],
            "rarity": survivor["rarity"],
            "role": survivor["role"],
            "mood": survivor["mood"],
            "fatigue": updated_fatigue,
            "health": updated_health,
            "personality_label": personality["personality_label"],
            "signature_line": personality["signature_line"],
            "current_state_tag": state_tags["current_state_tag"],
            "injured_tag": state_tags["injured_tag"]
        },
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
        }
    })


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
        FROM gacha_logs
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
            "rarity": row["rarity"],
            "role": row["role"],
            "created_at": row["created_at"]
        })

    return jsonify(data)


@app.route("/api/emergency-offer/state", methods=["GET"])
def emergency_offer_state():
    conn = get_db_connection()
    context = get_emergency_offer_context(conn)
    conn.close()

    return jsonify({
        "status": "ok",
        "active": context["active"],
        "trigger_reason": context["trigger_reason"],
        "offer": EMERGENCY_OFFER
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
    conn.commit()
    conn.close()

    return jsonify({
        "status": "ok",
        "message": "Offer close logged",
        "active": context["active"],
        "trigger_reason": context["trigger_reason"]
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
            "offer": EMERGENCY_OFFER
        }), 400

    log_offer_event(conn, "purchased", context)

    rewards = EMERGENCY_OFFER["rewards"]
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
        "message": "战备补给已送达，全员状态略有恢复。",
        "offer": EMERGENCY_OFFER,
        "trigger_reason": context["trigger_reason"],
        "recovery_effect": recovery_effect,
        "resources": {
            "food": updated_player["food"],
            "power": updated_player["power"],
            "materials": updated_player["materials"],
            "premium_currency": updated_player["premium_currency"]
        }
    })


@app.route("/api/emergency-offer/logs", methods=["GET"])
def emergency_offer_logs():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT id, offer_id, event_type, trigger_reason,
               food_before, power_before, materials_before,
               premium_currency_before, survivor_count, created_at
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
            "created_at": row["created_at"]
        })

    return jsonify(data)


# Local development only. Do not expose this debug endpoint in production.
@app.route("/api/debug/reset-emergency-offer", methods=["POST"])
def debug_reset_emergency_offer():
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
