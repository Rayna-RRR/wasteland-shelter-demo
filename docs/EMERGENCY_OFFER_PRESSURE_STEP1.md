# 应急补给压力触发第 1 步

## 旧触发问题

旧版应急补给已经有资源、队伍、近期行动效率三类判断，但触发原因比较笼统：

- 食物、电力、材料使用 `food_pressure`、`power_pressure`、`materials_pressure` 等名称，后续前端展示和日志分析不够直接。
- 队伍状态统一写成 `team_state_pressure`，无法区分疲劳压力和健康压力。
- 低效行动写成 `low_efficiency_pressure`，但没有明确要求行动次数已经足够高，容易看起来像随机弹出的商店提示。
- 多项资源预警依赖较宽的 warning 线，容易在压力还不明显时出现。

旧阈值大致为：

- 资源 critical：食物 `<= 60`、电力 `<= 60`、材料 `<= 25`。
- 多资源 warning：食物 `<= 75`、电力 `<= 75`、材料 `<= 35`，两项命中即触发。
- 队伍压力：单人健康 `<= 30`，或多名幸存者疲劳 `>= 70` / 健康 `<= 60`。
- 行动效率：最近 3 条非休整值勤日志中，2 条总资源变化 `<= 2` 即触发。

## 新触发分类

第 2 天第 1 步改为先判断实际压力来源，再决定补给是否出现：

- 资源压力：资源真的偏低时触发。
- 幸存者队伍压力：多个可出勤幸存者疲劳过高或健康偏低时触发。
- 行动压力：非休整值勤次数达到一定数量后，最近多次行动产出偏低时触发。
- 多线压力：资源、队伍、行动中同时出现多个压力信号时触发。

本步骤没有新增资源历史表，也没有使用趋势判断。

新阈值为：

- 资源低压：食物 `<= 45`、电力 `<= 45`、材料 `<= 15`。
- 队伍疲劳压力：至少 2 名可出勤幸存者疲劳 `>= 80`，或疲劳 `>= 75` 的可出勤幸存者达到 2 名。
- 队伍健康压力：至少 2 名可出勤幸存者健康 `<= 45`，或健康 `<= 50` 的可出勤幸存者达到 2 名。
- 行动压力：至少完成 6 次非休整值勤，并且最近 4 条非休整值勤日志中有 3 条总资源变化 `<= 2`。
- 严重抑制覆盖：食物 `<= 25`、电力 `<= 25`、材料 `<= 6`，或出现严重幸存者状态压力。

## 触发原因含义

- `resource_food_low`：食物低于应急补给触发线。
- `resource_power_low`：电力低于应急补给触发线。
- `resource_materials_low`：材料低于应急补给触发线。
- `survivor_fatigue_pressure`：多个可出勤幸存者疲劳偏高。
- `survivor_health_pressure`：多个可出勤幸存者健康偏低。
- `severe_multi_pressure`：至少两类压力信号同时出现，或多项资源同时偏低。
- `action_pressure`：已完成足够多次非休整值勤，并且最近多次值勤产出偏低。

旧触发原因名称仍保留展示兼容：

- `food_pressure`
- `power_shortage`
- `power_pressure`
- `materials_pressure`
- `combined_resource_pressure`
- `team_state_pressure`
- `low_efficiency_pressure`
- `shelter_pressure`

## 抑制行为

- 用户关闭补给后，后端仍会写入 `closed` 日志。
- 关闭后仍保留按天抑制和按行动次数抑制，避免补给立刻重复出现。
- 如果出现严重压力，`severe_pressure_override` 可以让补给绕过普通关闭抑制。
- 购买行为保持不变：仍写入 `purchased` 日志，并发放原有补给奖励。

## 手动测试清单

1. 编译检查：

```bash
python -m py_compile backend/app.py backend/init_db.py
```

2. 检查应急补给状态接口：

```bash
curl -s http://127.0.0.1:5001/api/emergency-offer/state
```

3. 检查关闭接口是否写入 `closed` 日志并返回抑制信息：

```bash
curl -s -X POST http://127.0.0.1:5001/api/emergency-offer/close
```

4. 检查购买接口在补给激活时是否仍按原逻辑发放奖励：

```bash
curl -s -X POST http://127.0.0.1:5001/api/emergency-offer/purchase
```

5. 检查日志接口是否仍返回 `exposed`、`closed`、`purchased` 和 `trigger_reason`：

```bash
curl -s http://127.0.0.1:5001/api/emergency-offer/logs
```

6. 检查格式和空白问题：

```bash
git diff --check
```
