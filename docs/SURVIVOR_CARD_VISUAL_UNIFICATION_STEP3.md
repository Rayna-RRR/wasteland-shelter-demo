# 幸存者卡片视觉统一 Step 3

## 本次标准化内容

本步骤只做前端视觉一致性收口，不改后端逻辑、不改数据库、不新增玩法系统。

统一范围：

- 首页“当前成员”预览
- 招募页“招募结果”卡片
- 值勤页“派遣名单”
- 值勤页“派遣确认”
- 值勤页“值勤结果”

统一后的幸存者展示层级：

- 头像 / 文字 fallback 放在最左侧
- 姓名使用最高可读层级
- 稀有度和职业使用次级标签
- 特质只在字段存在时显示
- 当前状态、疲劳、健康作为状态信息展示
- 长名字、长职业、长状态标签会尽量换行或截断，避免撑破卡片

## 新增或复用的共享样式

共享样式集中在：

```text
miniprogram/app.wxss
```

主要共享类：

- `survivor-card`
- `survivor-card--ssr / --sr / --r`
- `survivor-card--home / --featured / --selected / --unavailable`
- `survivor-identity-row`
- `survivor-identity-main`
- `survivor-display-name`
- `survivor-tag-row`
- `survivor-tag`
- `survivor-rarity-tag`
- `survivor-role-tag`
- `survivor-status-tag`
- `survivor-trait-line`
- `trait-callout`
- `survivor-vitals-row`
- `survivor-vital`
- `state-panel`

头像相关样式沿用 Step 1 的：

- `survivor-portrait`
- `survivor-portrait--home`
- `survivor-portrait--compact`
- `survivor-portrait--featured`
- `survivor-portrait--recruit`
- `survivor-portrait-fallback`

## 仍保留的页面专属样式

以下内容仍留在页面 wxss 中：

- 首页：当前成员区块的卡片间距
- 招募页：招募控制台、信号动画、重复补偿面板、招募结果卡片背景
- 值勤页：派遣风险提示、派遣任务卡、值勤结果反馈区、补给提示

这些样式和具体页面流程绑定，不适合放进全局。

## 手动视觉检查清单

1. 首页
   - 当前成员卡片应显示头像占位、姓名、稀有度、职业、状态、特质、疲劳和健康。
   - 长名字或长状态不应撑破卡片。

2. 招募页
   - 招募结果里的头像、姓名、稀有度、职业和状态标签应与其他页面风格一致。
   - 没有头像资源时应显示文字 fallback。

3. 值勤页
   - 派遣名单和派遣确认应使用同一套姓名、标签、状态视觉层级。
   - 选中态仍然清楚，点击区域仍然足够大。
   - 疲劳和健康应像状态信息，不应抢过姓名层级。

4. 值勤结果
   - 角色、任务、结果文本、资源变化、疲劳/健康变化应清晰分区。
   - 缺少特质或档案字段时，不应出现空白坏文本。
