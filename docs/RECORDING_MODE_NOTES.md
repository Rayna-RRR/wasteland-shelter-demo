# 录制模式说明

## 录制模式做什么

录制模式会通过本地开发接口准备一套可复现的截图状态，用于作品集截图和录屏。

它会重置当前本地运行数据，并写入：

- 第 3 天的运行状态
- 4 名幸存者，包含 SSR / SR / R
- 较合理但有压力的资源状态
- 多条招募日志和值勤日志
- 一个待处理事件
- 轻度疲劳压力
- 可触发的应急补给状态，并写入一次补给开放记录

## 本地限定

录制模式只通过 `/api/dev/demo-mode` 的本地调试入口使用。

接口仍受本地开发校验限制：

- 请求必须来自 `localhost`、`127.0.0.1` 或本机地址
- 后端需要处于 debug / development / testing 状态，或显式设置 `WASTELAND_ENABLE_DEV_TOOLS=1`

它不应该出现在生产 UI，也不代表正式玩法功能。

## 不代表生产玩法

录制模式直接写入本地 SQLite 数据，用来快速搭建展示状态。

它不会修改：

- 正常招募概率
- 值勤结算逻辑
- 应急补给触发逻辑
- 数据库 schema

录制状态只是本地截图夹具，不应作为生产玩法或数值平衡依据。

## 使用方式

先启动本地后端：

```bash
python backend/app.py
```

如果后端不是 debug 模式，可以显式启用本地调试工具：

```bash
WASTELAND_ENABLE_DEV_TOOLS=1 python backend/app.py
```

然后在仓库根目录执行：

```bash
curl -X POST http://localhost:5001/api/dev/demo-mode \
  -H "Content-Type: application/json" \
  -d '{"recording_seed": true}'
```

成功后，可以打开微信开发者工具查看：

- 首页资源、幸存者和事件卡
- 招募日志
- 值勤派遣列表
- 值勤日志与结果文案
- 应急补给卡和补给日志
- 日志页聚合记录

录制状态会带一个待处理事件。如果需要继续录制新的招募或值勤操作，先在首页处理事件，再进行后续操作。

## 不要提交的文件

录制模式会改写本地数据库内容。以下文件或目录不要提交：

- `backend/data/game.db`
- `backend/data/backups/`
- `.DS_Store`
- `__pycache__/`
- `backend/__pycache__/`

提交前建议检查：

```bash
git status --short
```
