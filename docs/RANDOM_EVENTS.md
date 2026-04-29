# 随机事件配置说明

本文档说明《废土避难所值勤管理器》当前随机事件系统的配置位置、触发方式、选项效果和设计意图，方便作品集展示和后续维护。

当前事件系统是 demo 级实现，重点是展示“资源压力 + 人员状态 + 玩家选择”的闭环，不是完整商业化事件池。

## 配置位置

事件定义文件：

```text
backend/data/event_definitions.json
```

后端读取和处理逻辑主要在：

```text
backend/app.py
```

相关函数包括：

- `load_event_definitions()`
- `get_event_definition()`
- `choose_daily_event()`
- `ensure_daily_event_for_run()`
- `build_pending_event_view()`
- `apply_event_choice_effects()`
- `apply_event_resource_delta()`
- `apply_event_survivor_effect()`
- `POST /api/event/resolve`

## 事件配置结构

每个事件通常包含：

| 字段 | 含义 |
| --- | --- |
| `id` | 事件唯一 ID |
| `title` | 事件标题 |
| `description` | 事件描述，可使用 `{target}` 占位符 |
| `requires_survivor` | 是否需要一个幸存者目标 |
| `requires_poor_condition` | 是否只在存在低状态幸存者时有效 |
| `target_selector` | 目标选择规则 |
| `choices` | 玩家可选方案 |

每个 `choice` 通常包含：

| 字段 | 含义 |
| --- | --- |
| `id` | 选项 ID，前端提交给 `/api/event/resolve` |
| `label` | 选项按钮文案 |
| `description` | 选项效果说明 |
| `result_text` | 选择后的结果文本 |
| `effects.resource_delta` | 对资源的变化 |
| `effects.survivor` | 对目标幸存者的状态变化 |

## 事件如何被激活

当前逻辑在 `backend/app.py` 中：

1. 后端读取当前 `run_state`。
2. 如果当前轮次是 active，会调用 `ensure_daily_event_for_run()`。
3. 如果当天仍有行动次数，并且当天还没有处理过事件，则尝试生成一个 pending event。
4. `choose_daily_event()` 会读取 `event_definitions.json`，筛出当天有效事件。
5. 有效事件按当前天数轮换选择：`valid_events[(current_day - 1) % len(valid_events)]`。
6. 选中的事件会写入 `run_state.pending_event_id` 和 `run_state.pending_event_payload`。
7. 只要存在 pending event，招募和值勤行动会被阻止，玩家必须先处理事件。

这不是纯随机抽取，而是“每日事件池轮换 + 条件过滤”的轻量实现。这样更适合 demo：结果可预测，便于录屏、测试和复盘。

## 目标幸存者选择

如果事件配置了 `requires_survivor: true`，后端会从 active 幸存者中挑选目标。

当前支持的 `target_selector`：

| 选择器 | 当前逻辑 |
| --- | --- |
| `random_active` | 用事件 ID 和当前天数生成稳定索引，从 active 幸存者中选一名 |
| `lowest_health_active` | 选择健康最低的 active 幸存者 |
| `highest_fatigue_active` | 选择疲劳最高的 active 幸存者 |

如果事件配置了 `requires_poor_condition: true`，目标池会先过滤为低状态幸存者：

```text
health <= 45 或 fatigue >= 80
```

如果找不到符合条件的目标，该事件当天不会进入有效事件池。

## 选项效果如何生效

事件通过：

```text
POST /api/event/resolve
```

提交：

```json
{
  "choice_id": "example_choice_id"
}
```

后端会：

1. 校验当前是否存在 pending event。
2. 按 `choice_id` 找到事件选项。
3. 应用资源变化。
4. 如果存在幸存者效果，则应用到目标幸存者。
5. 清空 `pending_event_id`。
6. 把 `pending_event_payload.status` 标记为 `resolved`，并记录 `resolved_choice_id`。

资源变化字段：

```json
"resource_delta": {
  "food": -5,
  "power": 2,
  "materials": 0,
  "premium_currency": 0
}
```

幸存者变化字段：

```json
"survivor": {
  "survivor_status": "injured",
  "recovery_days": 1,
  "fatigue_delta": 8,
  "health_delta": -6
}
```

当前支持的幸存者状态结果：

- `injured`：重伤停工，指定恢复天数。
- `left`：离开避难所，不再参与后续值勤。

## 当前事件分类

### 资源交换

这类事件让玩家在几种资源之间做取舍。

| 事件 | 核心选择 |
| --- | --- |
| `filter_clog_v1` 滤水器堵塞 | 材料换食物，或食物换电力 |
| `battery_cache_v1` 备用电芯 | 材料换电力，或电力换材料 |
| `caravan_trade_v1` 路过商队 | 食物换材料，或材料换电力 |

设计作用：让资源不是单纯增加，而是在短缺项和消耗项之间产生判断。

### 避难所压力

这类事件强调设施、通道、滤水、电力等避难所运行压力。

| 事件 | 压力来源 |
| --- | --- |
| `filter_clog_v1` 滤水器堵塞 | 过滤系统故障，需要消耗资源处理 |
| `battery_cache_v1` 备用电芯 | 电力机会出现，但需要材料处理 |
| `collapsed_tunnel_v1` 塌陷通道 | 外部通道风险和材料机会并存 |

设计作用：把“避难所设施状态”转化为可选择的资源结果。

### 队伍风险

这类事件和幸存者状态绑定，会影响疲劳、健康、停工或离队。

| 事件 | 队伍风险 |
| --- | --- |
| `collapsed_tunnel_v1` 塌陷通道 | 派目标探路可获得材料，但目标重伤停工 |
| `sickbay_shortage_v1` 医疗舱短缺 | 延后处理会让目标重伤停工 |
| `gate_argument_v1` 边门争执 | 高压排班可能导致目标离队 |
| `escort_request_v1` 护送请求 | 接受护送会让目标离队 |

设计作用：让幸存者不是静态卡牌，而是会被事件和玩家选择改变状态的队伍成员。

### 恢复 / 支持

当前事件池里没有直接恢复疲劳或健康的事件，但有“避免更差后果”的支持型选择。

| 事件 | 支持方式 |
| --- | --- |
| `sickbay_shortage_v1` 医疗舱短缺 | 消耗食物和电力，避免目标停工 |
| `gate_argument_v1` 边门争执 | 消耗食物，避免目标离队 |
| `escort_request_v1` 护送请求 | 拒绝护送，保住人员 |

设计作用：提供“付出资源保人”的选项，让资源和队伍状态发生连接。

### 不可逆后果

当前存在不可逆后果：幸存者离队。

| 事件 | 选项 | 后果 |
| --- | --- | --- |
| `gate_argument_v1` 边门争执 | `push_shift` 继续压排班 | 目标离队 |
| `escort_request_v1` 护送请求 | `accept_escort` 接受护送 | 目标离队 |

设计作用：让高压决策有长期后果，避免所有事件都只是短期资源加减。

## 当前事件清单

| 事件 ID | 标题 | 分类 | 主要效果 |
| --- | --- | --- | --- |
| `filter_clog_v1` | 滤水器堵塞 | 资源交换 / 避难所压力 | 材料、食物、电力之间转换 |
| `battery_cache_v1` | 备用电芯 | 资源交换 / 避难所压力 | 电力和材料之间转换 |
| `caravan_trade_v1` | 路过商队 | 资源交换 | 食物、材料、电力之间转换 |
| `collapsed_tunnel_v1` | 塌陷通道 | 队伍风险 / 避难所压力 | 材料收益，或目标重伤停工 |
| `sickbay_shortage_v1` | 医疗舱短缺 | 队伍风险 / 支持 | 消耗资源避免停工，或目标重伤停工 |
| `gate_argument_v1` | 边门争执 | 队伍风险 / 不可逆后果 | 消耗食物避免离队，或获得材料但目标离队 |
| `escort_request_v1` | 护送请求 | 队伍风险 / 不可逆后果 | 损失电力保人，或获得电力但目标离队 |

## 设计意图

- 事件应该制造压力和选择，而不是只提供气氛文本。
- 每个事件至少应该连接到资源、疲劳、健康、停工、离队或日志复盘中的一个。
- 事件选项应该尽量有明确代价：补资源可能损失人员状态，保人员可能消耗资源。
- 事件应该打断纯机械的“招募 -> 值勤 -> 结算”循环，让玩家回到首页做一次策略判断。
- 事件文本要服务于系统反馈：玩家应该能从文案中理解为什么这次选择会带来对应结果。

## 当前限制

- 事件池很小，目前只有 7 个事件。
- 当前选择逻辑是按天数轮换有效事件，不是真正的权重随机。
- 数值平衡是 demo 级别，事件收益和惩罚还需要更多实测样本。
- 事件没有单独事件日志表；当前主要通过 run state、结果返回和前端展示承接。
- 支持型事件主要是“避免损失”，还缺少明确恢复疲劳或健康的正向事件。
- 事件插图目前由前端映射维护，事件 JSON 本身没有配置图片字段。
- 事件没有按难度、天数阶段、资源状态或队伍状态设置权重。

## 未来扩展

- 增加更多事件类别：天气、疾病、内部争执、外部交易、设备老化、探索线索等。
- 为事件增加按天数、难度、资源压力、队伍状态变化的权重。
- 增加事件日志，记录事件 ID、选择、资源变化、幸存者变化和发生天数，便于运营复盘。
- 给事件 JSON 增加可选插图字段，让事件图文配置更集中。
- 增加恢复 / 支持类事件，例如短时休整、医疗补给、士气恢复。
- 增加事件冷却，避免同类事件短时间重复出现。
- 后续如果接入 LLM，只用于生成可选事件文案，不应影响核心数值结算。

## 手动检查建议

1. 启动后端并完成初始化。
2. 进入首页，确认当天是否出现待处理事件。
3. 如果出现事件，检查事件标题、描述、选项和预期资源变化是否一致。
4. 选择一个资源交换选项，确认资源变化正确。
5. 选择一个涉及目标幸存者的事件，确认 `{target}` 被替换为幸存者名字。
6. 选择重伤或离队选项，确认幸存者状态发生变化。
7. 处理完事件后，确认招募和值勤行动恢复可用。
8. 推进到下一天，确认同一天不会重复生成已处理事件。

