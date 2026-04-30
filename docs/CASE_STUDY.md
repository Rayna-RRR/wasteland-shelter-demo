# Wasteland Shelter Duty Manager - Case Study

## 1. Project Overview

Project name: Wasteland Shelter Duty Manager / 废土避难所值勤管理器

Role: Personal portfolio project

Target role relevance: game operations / R&D-support operations internship

Tech stack:

- Frontend: WeChat Mini Program
- Backend: Python 3.9 + Flask + flask-cors
- Database: SQLite
- Browser preview: HTML / CSS / JavaScript in `web-demo/`

This project is a lightweight portfolio prototype, not a complete commercial game. The main implementation is the WeChat Mini Program + Flask + SQLite version. The Web Demo is only a low-friction browser preview for reviewers who may not have WeChat Developer Tools or a local backend environment.

Reference docs:

- [README.md](../README.md)
- [OPS_REVIEW.md](OPS_REVIEW.md)
- [BALANCE_THRESHOLDS.md](BALANCE_THRESHOLDS.md)
- [RANDOM_EVENTS.md](RANDOM_EVENTS.md)
- [WEB_DEMO_NOTES.md](WEB_DEMO_NOTES.md)

[Screenshot: Home page]

## 2. Problem I wanted to solve

I did not want this resume project to be only a static dashboard.

For a game operations or R&D-support operations application, I wanted the project to show a small but runnable system loop:

- rules
- player actions
- resource pressure
- survivor state pressure
- random event choices
- simulated pressure-based emergency offer design
- logs for review

The goal was to show that I can think beyond UI screens and connect player actions with system outcomes.

## 3. Core Design

The core loop is:

```text
Recruit survivors
-> Assign duty
-> Resources change
-> Fatigue / health change
-> Random event may block actions until resolved
-> Emergency offer may be triggered
-> Logs are recorded for review
```

In the current prototype:

- Recruit survivors: the player pulls survivors from a small gacha pool.
- Assign duty: survivors can be assigned to scavenging, power generation, cooking, or guarding.
- Resources change: food, power, materials, and recruit currency change after actions.
- Fatigue / health change: repeated duty increases fatigue, and risky work may reduce health.
- Random event: unresolved events can block actions until the player makes a choice.
- Emergency offer: resource or team pressure can trigger a rescue-style offer.
- Logs: gacha, duty, and offer actions are recorded for later review.

The system is intentionally small, but the important part is that each action changes the next decision.

[Screenshot: Recruit result]

[Screenshot: Duty assignment]

## 4. Random Event Design

Random events are designed to create pressure and choice, not only flavor text.

In the current backend logic:

- A pending event can block gacha and duty actions until it is resolved.
- Event choices can change resources.
- Some event choices can affect survivor state, such as injured or left.
- Some events require a target survivor.
- Some events only become valid when a survivor is already in poor condition.

This makes events part of the management loop. The player cannot ignore shelter problems and continue clicking actions forever.

The current event pool is demo-level. It is enough to show categories and consequences, but it still needs more content and more test samples before it could be considered balanced.

More detail: [RANDOM_EVENTS.md](RANDOM_EVENTS.md)

[Screenshot: Random event]

## 5. Simulated Emergency Offer Design

The emergency offer is a pressure-based rescue package.

It is not a real payment system. The current price label is only a presentation placeholder for showing how an emergency support prompt could connect to game pressure.

The offer records three behavior states:

- `exposed`: the offer was shown to the player.
- `closed`: the player dismissed or postponed the offer.
- `purchased`: the player chose to activate the offer.

The design reason is simple: an offer-like prompt is more meaningful when it is connected to player pressure.

Compared with a static shop button, a pressure-based offer is easier to review from an operations perspective:

- Why did the offer appear?
- Was the player under resource pressure?
- Was the team under fatigue or health pressure?
- Did the player close it or activate it?
- Did suppression prevent repeated popups?

Close suppression matters because the same offer should not interrupt the player every time they return to the home page. If pressure becomes severe, the offer can still return as rescue support.

More detail: [BALANCE_THRESHOLDS.md](BALANCE_THRESHOLDS.md) and [OPS_REVIEW.md](OPS_REVIEW.md)

[Screenshot: Emergency offer]

## 6. Logging and Review

Logs are included so the system can be reviewed after actions happen.

Gacha logs help review:

- who was recruited
- rarity and role
- duplicate survivor handling

Duty logs help review:

- which survivor was assigned
- which duty was performed
- resource changes
- result text and state impact

Offer logs help review:

- whether the emergency offer was exposed
- whether the player closed it
- whether the player activated it
- trigger reason and resource state at that time

For a game operations / R&D-support operations portfolio, this is important because it shows behavior tracking and outcome review, not only interface display.

[Screenshot: Logs]

## 7. What I implemented

Mini Program pages:

- Home page for resources, run state, events, emergency offer, and team overview.
- Gacha page for survivor recruitment.
- Duty page for survivor selection, duty assignment, and result feedback.
- Logs page for reviewing gacha, duty, and offer records.

Flask APIs:

- status and initialization APIs
- resource API
- gacha API
- survivor API
- duty API
- random event resolve API
- emergency offer state / expose / close / purchase APIs
- logs APIs

SQLite storage:

- player resources
- survivor state
- gacha logs
- duty logs
- offer logs
- run state

Browser preview:

- `web-demo/` provides a static browser-friendly preview of the loop.
- It does not connect to the Flask backend.
- It does not replace the WeChat Mini Program.

Documentation and helper scripts:

- `README.md` for project overview and setup.
- `docs/OPS_REVIEW.md` for operations and product review framing.
- `docs/BALANCE_THRESHOLDS.md` for current threshold documentation.
- `docs/RANDOM_EVENTS.md` for event configuration notes.
- `docs/WEB_DEMO_NOTES.md` for browser preview notes.
- `scripts/smoke_test_backend.py` for a lightweight backend smoke test.
- `scripts/create_clean_zip.sh` for creating a safer portfolio archive.

[Screenshot: Web Demo]

## 8. What I learned

System loop matters more than feature count.

A small project becomes more useful when each feature affects another feature. Recruit, duty, resources, fatigue, health, event, offer, and logs are more meaningful together than as separate screens.

Offer-like prompts should be connected to player pressure.

The emergency offer is more explainable when it appears because the player is under resource or team pressure. This is more useful than a static shop button for an operations case study.

Random events should create choices, not only flavor text.

Events are more valuable when they affect resources or survivor state. The current event pool is small, but it already shows how event choices can create tradeoffs.

Logs make operations thinking visible.

Without logs, the project only shows what is currently on screen. With logs, it becomes possible to review player behavior and system outcomes.

Deterministic rule layer should remain clear even if AI tools are used during development.

This project keeps the core gameplay loop deterministic and local. Optional LLM narrative generation can be a future enhancement, but it should not control core resource settlement or block the main loop.

## 9. Current limitations

Current limitations are intentional and should be stated clearly:

- Balance is demo-level and needs more test samples.
- There is no real payment system.
- There is no production multi-user backend.
- The Web Demo is a static preview and does not connect to Flask / SQLite.
- Optional LLM enhancement is not part of the core runtime.
- There is no production-ready AI or LLM agent.
- Event pool and content volume are still small.
- Analytics are currently log-based, not a full dashboard.

These limitations are acceptable for the project goal because the purpose is to demonstrate a working loop and operations thinking, not to claim production readiness.

## 10. Next steps

Possible next steps:

- Tune thresholds for food, power, materials, fatigue, health, and emergency offer timing.
- Improve analytics summary, such as lowest resource point, number of duties, event choices, and offer responses per run.
- Add more event categories, such as weather, disease, equipment aging, internal conflict, and outside trade.
- Improve screenshots and recording path for portfolio review.
- Add event logs for clearer review of choices and consequences.
- Keep the smoke test updated as backend endpoints evolve.
- Add optional narrative enhancement with local template fallback.

The priority should remain:

1. Keep the core loop stable.
2. Make behavior and outcomes easier to review.
3. Expand content only after the system remains understandable.
