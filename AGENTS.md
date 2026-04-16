# Wasteland Shelter Duty Manager - Project Guide

## Project Goal
This is a 3-day WeChat Mini Program demo project.

Theme:
**Wasteland Shelter Duty Manager**

Core gameplay loop:
1. Pull survivors from gacha
2. Assign survivors to duties such as scavenging, power generation, cooking, and guarding
3. Resolve resource changes
4. Store gacha logs and duty logs in SQLite
5. Later, connect a cheap Chinese LLM only for optional special-event text generation

## Current Stack
- Backend: Python 3.9 + Flask + flask-cors
- Database: sqlite3 from Python standard library
- Frontend: native WeChat Mini Program
- Editor: VS Code + Codex
- OS: macOS

## What Already Exists
Backend code is under `backend/`.

Currently available and working endpoints:
- GET /api/status
- GET /api/resources
- POST /api/gacha
- GET /api/survivors
- POST /api/duty
- GET /api/duty-logs

## Your Role
You are a collaborative coding agent for this repository.

Your job is to help extend the project safely and incrementally.
Do not over-engineer.
Do not rewrite working code unless necessary.

## Hard Constraints
1. Do not refactor the working backend flow unless there is a clear bug
2. Do not introduce heavy frameworks
3. For the frontend, use native WeChat Mini Program structure first
4. Do not use Taro, uni-app, TypeScript, React, or any large abstraction layer
5. All user-facing UI text should stay in Simplified Chinese
6. Prioritize “make it run first, optimize later”
7. Every command must be copy-paste friendly
8. The user is a beginner with terminal workflows, so explanations should be clear
9. After every change, provide a simple validation method
10. If database schema changes are needed, explain the migration impact first

## Coding Principles
- MVP first
- Keep the code simple, readable, and easy to debug
- Preserve stable JSON field names when possible
- Prioritize the full loop: gacha -> duty -> resource update -> logs
- LLM integration must remain optional and must not block the core gameplay loop

## Frontend Goal
Create a native WeChat Mini Program frontend with at least these pages:
1. Home page: show shelter resources
2. Gacha page: perform single pull and show result
3. Duty page: show survivor list and allow duty assignment
4. Logs page: show gacha logs and duty logs

## LLM Constraint
A cheap Chinese model may be added later, but for now:
- Do not put model calls into core game logic
- Only leave an optional extension point
- Default to local templates for event text

## How To Work
Before making changes:
1. Read the existing repository structure
2. Inspect the key backend files first
3. Summarize the current state
4. Focus on one small goal at a time

After making changes:
1. List which files were changed
2. Explain what was changed
3. Give validation steps
4. Keep the next step small and clear

## Response Format Requirement

For every meaningful response, you must provide a bilingual workflow in this structure.

### Section 1 - 中文说明
Use Simplified Chinese.
Explain briefly:
1. 你准备做什么
2. 为什么这样做
3. 这一步会改哪些文件
4. 如何验证

### Section 2 - Implementation
Use English.
Describe:
1. What you changed
2. Which files were modified
3. What commands should be run
4. What result is expected

### Section 3 - 变更摘要（中文）
Use Simplified Chinese.
List:
1. 修改了哪些文件
2. 每个文件改了什么
3. 有没有新增依赖
4. 有没有风险点或注意事项

### Section 4 - Validation
Use English for commands, but explain expected outcomes in Chinese.
Always provide copy-paste-friendly commands when relevant.

## Behavior Constraints for Responses
1. Even if the implementation is written in English, always explain the task result in Chinese first
2. When editing code, always list changed files explicitly
3. When creating new files, explain why each file is needed
4. When suggesting commands, explain in Chinese what each command does
5. If a task is complex, summarize the plan in Chinese before making changes
6. Do not only output code; always include explanation
7. Keep explanations concise but clear