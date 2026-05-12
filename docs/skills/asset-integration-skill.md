# 素材接入说明

## 目标

本说明用于接入已经生成好的视觉或音频素材，例如角色头像、首页背景、值勤图标、应急补给图片、轻量背景音乐或音效。

接入素材时保持玩法逻辑、后端结算、数据库结构和核心交互流程稳定。素材用于提升游戏感、可读性和作品集呈现。

## 适用场景

适用于以下任务：

- 接入角色头像
- 接入默认幸存者头像
- 接入首页背景图
- 接入值勤图标
- 接入应急补给图片
- 接入轻量背景音乐
- 接入音效
- 接入作品集截图用视觉素材

常见请求示例：

- “我已经生成了角色头像，把它们接进项目。”
- “图片已经放到 assets 目录，请安全接入。”
- “加首页背景图。”
- “接入值勤图标。”
- “加轻量音效。”
- “检查素材路径和兜底展示。”

## 范围边界

本说明用于素材接入。以下任务应拆成单独需求：

- 生成图片
- 生成音乐
- 整体重设计界面
- 修改后端玩法逻辑
- 修改招募概率
- 修改值勤结算
- 修改资源计算
- 修改应急补给触发逻辑
- 修改数据库结构
- 增加新玩法系统
- 增加大模型或智能代理运行时功能

如果用户请求包含玩法改动，先明确拆分素材任务和玩法任务。

## 项目背景

这是一个微信小程序 + Flask + SQLite 的废土避难所管理演示项目。

作品集目标是让演示原型具备轻量避难所管理游戏感，同时保持系统逻辑清楚、可检查、可复盘。

核心循环：

```text
招募幸存者 -> 分配值勤 -> 改变资源和幸存者状态 -> 触发压力 / 补给逻辑 -> 记录日志
```

素材应服务于这条循环。

## 素材目录约定

使用以下目录：

```text
miniprogram/assets/images/characters/
miniprogram/assets/images/backgrounds/
miniprogram/assets/images/icons/
miniprogram/assets/images/items/
miniprogram/assets/audio/bgm/
miniprogram/assets/audio/sfx/
```

素材集中放在素材目录中。文件名使用小写英文和下划线。

推荐命名：

```text
default_survivor.png

zhou_ying.png
lin_qi.png
qin_shuo.png
chen_ye.png
xia_mo.png
luo_an.png

shelter_home.png

duty_scavenge.png
duty_power.png
duty_cook.png
duty_guard.png

emergency_supply.png

shelter_ambient.mp3
gacha_result.mp3
duty_complete.mp3
warning_offer.mp3
soft_click.mp3
```

## 角色头像规则

角色头像放在：

```text
miniprogram/assets/images/characters/
```

建议保留默认兜底头像：

```text
miniprogram/assets/images/characters/default_survivor.png
```

头像路径集中维护在：

```text
miniprogram/utils/portrait-map.js
```

预期行为：

- 幸存者有头像映射时，展示对应头像。
- 幸存者没有头像映射时，展示默认头像。
- 默认头像缺失时，展示现有文字兜底。
- 单个头像缺失时，首页、招募页和值勤页保持可用。

## 头像质量建议

推荐规格：

```text
尺寸：512 × 512 px
格式：PNG 或 WebP
风格：统一的半身或头像构图
背景：简洁、低干扰
文件大小：建议每张 100-300 KB
```

头像使用位置：

- 首页幸存者卡片
- 招募结果卡片
- 值勤幸存者选择卡片
- 值勤当前选择区域
- 值勤结果区域

头像在小卡片尺寸下仍需保持可读。

## 图片路径规则

优先使用小程序安全的项目绝对路径：

```text
/assets/images/characters/zhou_ying.png
/assets/images/characters/default_survivor.png
/assets/images/backgrounds/shelter_home.png
/assets/images/icons/duty_guard.png
/assets/images/items/emergency_supply.png
```

修改前先查看项目中已经可用的图片引用。

## 背景图规则

首页背景图用于增强氛围，同时保持文字和资源数字清晰。

要求：

- 文字保持可读。
- 重要资源数字后面避免高对比复杂背景。
- 需要时使用遮罩。
- 本轮素材接入不做整页重设计。
- 大图不铺到所有页面。

推荐使用：

```text
miniprogram/assets/images/backgrounds/shelter_home.png
```

适合使用位置：

- 首页氛围背景
- 后续可考虑招募结果背景

日志页默认保持轻量背景。

## 值勤图标规则

值勤图标用于让任务选择更容易理解。

推荐文件：

```text
miniprogram/assets/images/icons/duty_scavenge.png
miniprogram/assets/images/icons/duty_power.png
miniprogram/assets/images/icons/duty_cook.png
miniprogram/assets/images/icons/duty_guard.png
```

值勤图标保持可选。图标缺失时，页面仍展示任务文字标签。

值勤类型 key 和接口参数保持与后端兼容。

## 应急补给图片规则

应急补给图片用于支持压力触发补给的展示。

推荐文件：

```text
miniprogram/assets/images/items/emergency_supply.png
```

图片只接入应急补给卡片。本轮素材接入不创建完整商店页，不新增商业化系统，不修改补给触发逻辑。

## 音频规则

音频保持可选、轻量。

推荐目录：

```text
miniprogram/assets/audio/bgm/
miniprogram/assets/audio/sfx/
```

推荐文件：

```text
miniprogram/assets/audio/bgm/shelter_ambient.mp3
miniprogram/assets/audio/sfx/gacha_result.mp3
miniprogram/assets/audio/sfx/duty_complete.mp3
miniprogram/assets/audio/sfx/warning_offer.mp3
miniprogram/assets/audio/sfx/soft_click.mp3
```

规则：

- 音效优先由用户操作触发。
- 背景音乐保持低音量，并提供关闭方式。
- 音频加载失败时，玩法流程继续可用。
- 音频文件缺失时，页面继续可用。
- 日志页默认不接入音频。
- 音频代码尽量集中维护。

## 接入流程

### 第 1 步：检查现有结构

接入前先查看相关文件。

角色头像：

```text
miniprogram/utils/portrait-map.js
miniprogram/pages/home/
miniprogram/pages/gacha/
miniprogram/pages/duty/
miniprogram/app.wxss
```

背景图：

```text
miniprogram/pages/home/
miniprogram/app.wxss
```

值勤图标：

```text
miniprogram/pages/duty/
```

应急补给图片：

```text
miniprogram/pages/home/
miniprogram/pages/logs/
```

音频：

```text
miniprogram/app.js
miniprogram/pages/gacha/
miniprogram/pages/duty/
```

### 第 2 步：确认素材文件

检查内容：

- 文件存在
- 文件名符合目录约定
- 路径符合项目约定
- 需要兜底图时已准备默认素材
- 文件大小合理
- 没有意外加入重复或未使用的大文件

### 第 3 步：更新集中映射或工具

角色头像更新：

```text
miniprogram/utils/portrait-map.js
```

保留现有结构。值勤图标或音频需要集中维护时，可以新增轻量映射文件，例如：

```text
miniprogram/utils/asset-map.js
miniprogram/utils/audio-map.js
```

一行改动无需新增抽象。

### 第 4 步：保留兜底能力

素材缺失时应用仍需可用：

- 头像缺失时使用默认头像或文字兜底。
- 音频缺失时跳过播放。
- 图标缺失时保留文字标签。

### 第 5 步：保持玩法稳定

素材接入不修改以下后端文件：

```text
backend/app.py
backend/init_db.py
backend/data/
```

接口参数、值勤结算、招募概率、资源逻辑、幸存者状态逻辑和应急补给逻辑保持不变。

前端字段缺失时，在界面层做兜底处理。

### 第 6 步：验证

运行 JS 语法检查：

```bash
node --check miniprogram/utils/portrait-map.js
git diff --check
```

如果页面 JS 文件有改动：

```bash
node --check miniprogram/pages/home/home.js
node --check miniprogram/pages/gacha/gacha.js
node --check miniprogram/pages/duty/duty.js
```

确认后端文件未被误改：

```bash
git diff --name-only | grep '^backend/' || true
```

微信开发者工具手动检查：

1. 打开首页。
2. 确认幸存者卡片展示头像或文字兜底。
3. 执行招募。
4. 确认招募结果展示头像或文字兜底。
5. 打开值勤页。
6. 确认幸存者列表和选中幸存者展示头像或文字兜底。
7. 如果接入了值勤图标，确认图标缺失时文字标签仍显示。
8. 如果接入了应急补给图片，确认补给卡片流程保持正常。
9. 如果接入了音频，确认音频失败时玩法流程继续可用。
10. 确认素材缺失时页面不会崩溃。

## 输出格式

使用本说明时，输出中文摘要：

```text
1. 本次接入了哪些素材
2. 改了哪些文件
3. 哪些页面已经接入
4. 兜底展示如何工作
5. 怎么手动测试
6. 是否有本地文件需要保留
7. 下一步建议
```

## Git 提交提醒

以下本地生成文件保留在本地：

```text
backend/data/game.db
backend/data/backups/
.DS_Store
__pycache__/
*.pyc
```

如果这些文件出现在 `git status` 中，先提醒用户再暂存。

使用明确的 `git add` 命令。批量暂存前先检查工作区。
