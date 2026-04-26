# 角色头像接入 Step 1

## 目标

本步骤只建立前端头像映射层，让角色卡片先具备“头像位”和稳定 fallback。

当前不改后端、不改数据库、不影响招募和值勤结算。

## 已接入位置

- 首页：`pages/home/home` 的“当前成员”
- 招募页：`pages/gacha/gacha` 的招募结果卡片
- 值勤页：`pages/duty/duty` 的当前选择、值勤结果、幸存者列表

## 映射文件

头像集中维护在：

```text
miniprogram/utils/portrait-map.js
```

每个角色都有一条配置：

```js
"周萤": { path: "", fallbackText: "萤" }
```

- `path`：真实头像资源路径，暂时留空，避免请求不存在的图片。
- `fallbackText`：没有头像图时展示的文字占位。

## 后续如何补图

建议后续把图片放在：

```text
miniprogram/assets/portraits/
```

然后把对应角色改成：

```js
"周萤": {
  path: "/assets/portraits/zhou-ying.png",
  fallbackText: "萤"
}
```

只要 `path` 为空，小程序会展示文字 fallback；填入路径后，会自动展示图片。

## 注意事项

- 不要在业务页面里散落写死头像路径，统一改 `portrait-map.js`。
- 新增角色时，先补映射；没有图也可以先只写 fallback。
- 本步骤没有数据库迁移影响。
