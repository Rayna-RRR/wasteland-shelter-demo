# Web Demo 说明

## 为什么需要 Web Demo

主项目是微信小程序 + Flask + SQLite 原型。Web Demo 的作用是降低作品集评审门槛，让没有微信开发者工具或本地后端环境的人，也能在浏览器里快速看到核心循环和视觉方向。

它不是替代主项目，也不是新的游戏版本。README 的“快速预览”指向的是这个轻量浏览器预览。

它面向的第一目标是帮助面试官快速理解：

```text
招募 -> 值勤 -> 资源 / 状态变化 -> 随机事件 -> 应急补给 -> 日志
```

## Web Demo 包含什么

`web-demo/` 是一个轻量静态页面，包含：

- 静态资源状态
- 幸存者招募预览
- 值勤派遣预览
- 资源变化展示
- 疲劳 / 健康变化展示
- 随机事件预览
- 应急补给预览
- 简化日志记录
- Web Demo 与主小程序实现的区别提示
- “60 秒查看路径”和核心循环提示

页面复用了现有素材：

- 幸存者头像
- 值勤图标
- `shelter_home.png`
- `emergency_supply.png`
- 随机事件插图

## Web Demo 不包含什么

Web Demo 不包含：

- Flask API 连接
- SQLite 数据读写
- 微信小程序运行环境
- 后端真实结算逻辑
- 数据库结构迁移
- LLM 功能
- 新商业化系统
- 完整游戏进度系统
- 真实支付
- 生产级 AI / LLM 运行时

所有状态都在 `web-demo/app.js` 里静态模拟，刷新页面会回到初始预览状态。

## 与小程序主实现的差异

小程序主实现负责真实原型流程：

- 开局登记流程
- 招募接口
- 值勤接口
- 资源和幸存者状态结算
- 随机事件 / 应急补给状态
- SQLite 日志

Web Demo 只提供浏览器预览：

- 用静态数组模拟幸存者、值勤和事件
- 用前端状态模拟资源和日志
- 使用已有素材保持视觉一致
- 不影响任何后端或小程序玩法逻辑

## 本地预览方式

直接打开：

```bash
open web-demo/index.html
```

如果浏览器限制本地资源读取，可以用简单静态服务打开仓库根目录，例如：

```bash
python3 -m http.server 8080
```

然后访问：

```text
http://localhost:8080/web-demo/
```

建议 60 秒查看路径：

1. 点击“招募幸存者”。
2. 选择幸存者和值勤任务，点击“派遣值勤”。
3. 查看值勤结果里的资源、疲劳和健康变化。
4. 查看“事件 / 补给”面板。
5. 处理事件或补给后查看“日志”。

## GitHub Pages 部署说明

后续可以在 GitHub 仓库设置中启用 Pages：

1. 进入 GitHub repository settings。
2. 打开 Pages。
3. Source 选择 `Deploy from a branch`。
4. Branch 选择 `main` 或展示用分支。
5. Folder 选择 `/root`。
6. 保存后访问：

```text
https://Rayna-RRR.github.io/wasteland-shelter-demo/web-demo/
```

部署前需要确认 `web-demo/` 和 `miniprogram/assets/images/` 都已经提交，因为 Web Demo 通过相对路径复用这些素材。

如果 GitHub 用户名或仓库名不同，访问路径应替换为：

```text
https://<your-github-username>.github.io/<repo-name>/web-demo/
```

## README 对齐说明

README 应明确区分：

- Web Demo：静态、浏览器友好、静态模拟状态、快速预览。
- Mini Program：主实现，连接 Flask + SQLite，包含实际项目逻辑。

如果后续 Web Demo 行为改变，需要同步更新 README 的“快速预览”和本说明文档。
