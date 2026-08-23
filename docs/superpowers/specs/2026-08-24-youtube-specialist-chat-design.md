# YouTube specialist floating chat

Date: 2026-08-24

## Goal

A single floating chat widget on every page (landing, login, dashboard) that behaves like Buddy, an in-app YouTube specialist — not a generic support bot.

## Architecture

- Client widget mounted in the root layout.
- `POST /api/chat` with `{ messages, pathname }`.
- Reply order: OpenAI (`OPENAI_API_KEY`) → Gemini (`GEMINI_API_KEY`) → simulated specialist.
- Live failures fall back to the simulated specialist.
- Conversation stored in `sessionStorage` for the tab only.

## Persona

Name: **Buddy**. Voice: concise YouTube operator (hooks, packaging, CTR, retention, RPM, faceless workflow). Does not pretend to publish videos. Points to the right screen. Page-aware (marketing vs workspace vs current dashboard route).

## UI

- Bottom-right circular launcher (accent red, online pip). Unread dot until first open.
- Dark glass panel, suggested chips by page, typing indicator, Enter to send, Escape to close.
- Analytics “Customize” chip sits above the launcher so they do not overlap.

## Errors

Invalid payloads return 400. Provider errors fall back to the simulated specialist. Client network failure shows a short retry line in the thread.
