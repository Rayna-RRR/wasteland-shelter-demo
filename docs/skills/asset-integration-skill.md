# Asset Integration Skill

## Purpose

Use this skill when adding generated visual or audio assets to the Wasteland Shelter Mini Program demo.

The goal is to integrate assets safely while keeping gameplay logic, backend settlement, database schema, and core interaction flow unchanged.

Assets should improve game feel, readability, and portfolio presentation. They should not hide weak logic or create unnecessary scope expansion.

## When to Use

Use this skill when integrating:

- character portraits
- default survivor portrait
- home background image
- duty icons
- emergency supply image
- light background music
- sound effects
- generated visual assets for portfolio screenshots

Typical user requests include:

- “I have generated character portraits. Connect them to the project.”
- “I placed images under assets. Please wire them safely.”
- “Add the home background image.”
- “Connect duty icons.”
- “Add light sound effects.”
- “Check asset paths and fallback behavior.”

## When Not to Use

Do not use this skill for:

- generating images
- generating music
- redesigning the whole UI
- changing backend game logic
- changing gacha probability
- changing duty settlement
- changing resource calculation
- changing emergency offer logic
- changing database schema
- adding new gameplay systems
- adding LLM or Agent runtime features

If the requested task requires gameplay changes, stop and ask for a separate gameplay task.

## Project Context

This is a WeChat Mini Program + Flask + SQLite wasteland shelter management demo.

The portfolio goal is to make the demo feel like a light shelter management game prototype while keeping the system logic clear and reviewable.

The core loop is:

Recruit survivors -> assign duty -> change resources and survivor states -> trigger pressure / offer logic -> record logs.

Assets should support this loop visually.

## Asset Folder Convention

Use these folders:

```text
miniprogram/assets/images/characters/
miniprogram/assets/images/backgrounds/
miniprogram/assets/images/icons/
miniprogram/assets/images/items/
miniprogram/assets/audio/bgm/
miniprogram/assets/audio/sfx/
```

Do not scatter assets across page folders.

Do not use Chinese filenames.

Use lowercase English names with underscores.

Recommended names:

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

## Character Portrait Rules

Character portraits must be placed under:

```text
miniprogram/assets/images/characters/
```

A default fallback portrait should exist:

```text
miniprogram/assets/images/characters/default_survivor.png
```

Portrait paths must be centralized through:

```text
miniprogram/utils/portrait-map.js
```

Do not hardcode character portrait paths inside individual pages unless the existing project structure already requires it.

Expected behavior:

- If a survivor has a mapped portrait, show that portrait.
- If a survivor does not have a mapped portrait, show the default survivor portrait.
- If the default portrait is missing, fall back to the existing text fallback.
- Missing individual portraits must not crash Home, Gacha, or Duty pages.

## Character Portrait Quality Guideline

Recommended portrait specs:

```text
Size: 512 × 512 px
Format: PNG or WebP
Style: consistent bust / half-body portrait
Background: simple and low-distraction
File size: preferably 100–300 KB per image
```

Portraits are used in:

- Home survivor cards
- Gacha result card
- Duty survivor selection cards
- Duty selected survivor area
- Duty result area if applicable

The portrait should remain readable at small card size.

## Image Path Rules for WeChat Mini Program

Prefer Mini Program-safe absolute project paths:

```text
/assets/images/characters/zhou_ying.png
/assets/images/characters/default_survivor.png
/assets/images/backgrounds/shelter_home.png
/assets/images/icons/duty_guard.png
/assets/images/items/emergency_supply.png
```

Avoid deep relative paths like:

```text
../../../assets/images/characters/zhou_ying.png
```

unless the current project structure clearly requires relative paths.

When in doubt, inspect existing working image references first.

## Background Image Rules

Home background images should improve atmosphere without hurting readability.

Requirements:

- Keep text readable.
- Avoid high-contrast busy images behind important resource numbers.
- Use overlays if needed.
- Do not redesign the entire page.
- Do not add large images to every page.

Recommended usage:

```text
miniprogram/assets/images/backgrounds/shelter_home.png
```

Use background images mainly for:

- Home page atmosphere
- Maybe gacha result background later

Do not add background images to Logs page unless explicitly requested.

## Duty Icon Rules

Duty icons should make task selection easier to understand.

Recommended files:

```text
miniprogram/assets/images/icons/duty_scavenge.png
miniprogram/assets/images/icons/duty_power.png
miniprogram/assets/images/icons/duty_cook.png
miniprogram/assets/images/icons/duty_guard.png
```

Duty icons should be optional.

If an icon is missing, the page should still show the duty text label.

Do not change duty type keys or API payloads.

Existing duty keys must remain compatible with backend logic.

## Emergency Supply Image Rules

The emergency supply image should support the simulated emergency offer / pressure design.

Recommended file:

```text
miniprogram/assets/images/items/emergency_supply.png
```

Use it in the emergency offer card only.

Do not create a full shop page.

Do not add new monetization systems.

Do not modify offer trigger logic unless the user explicitly requests a gameplay task.

## Audio Rules

Audio should be optional and lightweight.

Recommended folders:

```text
miniprogram/assets/audio/bgm/
miniprogram/assets/audio/sfx/
```

Recommended files:

```text
miniprogram/assets/audio/bgm/shelter_ambient.mp3
miniprogram/assets/audio/sfx/gacha_result.mp3
miniprogram/assets/audio/sfx/duty_complete.mp3
miniprogram/assets/audio/sfx/warning_offer.mp3
miniprogram/assets/audio/sfx/soft_click.mp3
```

Rules:

- Do not autoplay loud music.
- Prefer user-triggered sound effects.
- BGM should be low-volume and easy to disable.
- Audio failure must not block gameplay.
- Missing audio files must not crash the page.
- Do not add audio to Logs page unless explicitly requested.
- Keep audio code centralized if practical.

## Integration Process

### Step 1: Inspect Existing Structure

Before editing, inspect relevant files.

For portraits:

```text
miniprogram/utils/portrait-map.js
miniprogram/pages/home/
miniprogram/pages/gacha/
miniprogram/pages/duty/
miniprogram/app.wxss
```

For background:

```text
miniprogram/pages/home/
miniprogram/app.wxss
```

For duty icons:

```text
miniprogram/pages/duty/
```

For emergency supply image:

```text
miniprogram/pages/home/
miniprogram/pages/logs/
or the existing emergency offer component/page if present
```

For audio:

```text
miniprogram/app.js
miniprogram/pages/gacha/
miniprogram/pages/duty/
any existing utility files
```

### Step 2: Confirm Asset Files

List the relevant asset folder.

Check:

- files exist
- filenames are English
- paths match project convention
- default fallback exists where needed
- file sizes are reasonable
- no duplicate or unused large files are added accidentally

### Step 3: Update Central Mapping or Utility

For portraits, update:

```text
miniprogram/utils/portrait-map.js
```

Preserve the current structure.

Do not rewrite the whole utility unless necessary.

For duty icons or audio, create a centralized mapping file only if it keeps the code cleaner.

Possible utility names:

```text
miniprogram/utils/asset-map.js
miniprogram/utils/audio-map.js
```

Do not create unnecessary abstraction for a one-line change.

### Step 4: Keep Fallback Safe

Never assume every asset exists.

Never assume every survivor has a portrait.

Never assume audio is available.

The app must still work with missing assets.

### Step 5: Avoid Gameplay Changes

Do not modify:

```text
backend/app.py
backend/init_db.py
backend/data/
```

Do not change API payloads.

Do not change duty settlement, gacha probability, resource logic, survivor state logic, or emergency offer logic.

If a frontend field is missing, handle it gracefully in the UI.

### Step 6: Validate

Run syntax checks for changed JS files.

Minimum checks:

```bash
node --check miniprogram/utils/portrait-map.js
git diff --check
```

If page JS files are changed:

```bash
node --check miniprogram/pages/home/home.js
node --check miniprogram/pages/gacha/gacha.js
node --check miniprogram/pages/duty/duty.js
```

Confirm no backend files were modified:

```bash
git diff --name-only | grep '^backend/' || true
```

Manual test in WeChat DevTools:

1. Open Home page.
2. Confirm survivor cards show portraits or fallback.
3. Run Gacha.
4. Confirm gacha result shows portrait or fallback.
5. Open Duty page.
6. Confirm survivor list and selected survivor show portrait or fallback.
7. If duty icons were added, confirm labels still show when icons are missing.
8. If emergency image was added, confirm offer card still works without changing trigger logic.
9. If audio was added, confirm audio failure does not block gameplay.
10. Confirm no page crashes when assets are missing.

## Output Format

When using this skill, return in Chinese:

```text
1. 本次接入了哪些素材
2. 改了哪些文件
3. 哪些页面已经接入
4. fallback 如何工作
5. 怎么手动测试
6. 是否有不该提交的文件
7. 下一步建议
```

## Git Safety Rules

Do not commit generated runtime files:

```text
backend/data/game.db
backend/data/backups/
.DS_Store
__pycache__/
*.pyc
```

If these appear in git status, warn the user before staging.

Use explicit git add commands.

Avoid:

```bash
git add .
```

unless the working tree has already been reviewed.

Recommended final check:

```bash
git status --short
git diff --cached --name-only
```

## Commit Guidance

For character portraits:

```bash
git add miniprogram/assets/images/characters/ miniprogram/utils/portrait-map.js
```

For background image:

```bash
git add miniprogram/assets/images/backgrounds/ miniprogram/pages/home/ miniprogram/app.wxss
```

For duty icons:

```bash
git add miniprogram/assets/images/icons/ miniprogram/pages/duty/
```

For audio:

```bash
git add miniprogram/assets/audio/ miniprogram/pages/gacha/ miniprogram/pages/duty/
```

Always inspect staged files before committing.

Suggested commit messages:

```text
Add survivor portrait assets
Connect home background asset
Add duty icon assets
Add light result sound effects
```
