# Web Demo Notes

## 为什么需要 Web Demo

主项目是微信小程序 + Flask + SQLite 原型。Web Demo 的作用是降低作品集评审门槛，让没有微信开发者工具或本地后端环境的人，也能在浏览器里快速看到核心循环和视觉方向。

它不是替代主项目，也不是新的游戏版本。

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

页面复用了现有素材：

- 幸存者头像
- duty icons
- `shelter_home.png`
- `emergency_supply.png`
- random event illustrations

## Web Demo 不包含什么

Web Demo 不包含：

- Flask API 连接
- SQLite 数据读写
- 微信小程序运行环境
- 后端真实结算逻辑
- 数据库 schema 迁移
- LLM 功能
- 新商业化系统
- 完整游戏进度系统

所有状态都在 `web-demo/app.js` 里静态模拟，刷新页面会回到初始预览状态。

## 与小程序主实现的差异

小程序主实现负责真实原型流程：

- onboarding
- 招募接口
- 值勤接口
- 资源和幸存者状态结算
- 随机事件 / 应急补给状态
- SQLite 日志

Web Demo 只提供浏览器预览：

- 用静态数组模拟幸存者、值勤和事件
- 用前端状态模拟资源和日志
- 使用已有素材保持视觉一致
- 不影响任何后端或小程序 gameplay 逻辑

## 本地预览方式

直接打开：

```text
web-demo/index.html
```

如果浏览器限制本地资源读取，可以用简单静态服务打开仓库根目录，例如：

```bash
python3 -m http.server 8080
```

然后访问：

```text
http://localhost:8080/web-demo/
```

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
