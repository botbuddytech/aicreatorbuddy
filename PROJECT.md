# AI Creator Buddy

Single source of truth for the product as it exists in this repository. Written from the codebase and the documentation that is actually checked in. Last reviewed against the working tree on 5 October 2026 (commit `331d47a`, plus the uncommitted create-pipeline and agent work in the tree).

**`Project Context.md` is not in the repository root** (or anywhere else in this project). This file does not reconstruct a missing brief. Where marketing copy, demo data, and running code disagree, the code wins, and the disagreement is called out.

The stock [README.md](README.md) is the create-next-app starter. It does not describe this product. Next.js agent notes live in [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md).

## Table of contents

1. [How to read this document](#how-to-read-this-document)
2. [Product overview](#product-overview)
3. [What is real, mocked, or marketing](#what-is-real-mocked-or-marketing)
4. [Project directory](#project-directory)
5. [Technical architecture](#technical-architecture)
6. [Key decisions, assumptions, constraints, dependencies](#key-decisions-assumptions-constraints-dependencies)
7. [UI and UX](#ui-and-ux)
8. [Functional workflows](#functional-workflows)
9. [Page-wise documentation](#page-wise-documentation)
10. [Database and data flow](#database-and-data-flow)
11. [Build plan and existing documentation](#build-plan-and-existing-documentation)
12. [Integrations and environment](#integrations-and-environment)
13. [Security and performance](#security-and-performance)
14. [Current development status](#current-development-status)
15. [Future scope](#future-scope)
16. [Development guidelines](#development-guidelines)
17. [Glossary](#glossary)

## How to read this document

| Label | Meaning |
| --- | --- |
| Confirmed | Present in source, schema, routes, or a checked-in spec. |
| Marketing copy | Strings in `src/lib/content.ts` and related landing components. Not evidence that the feature ships or that the numbers are real. |
| Demo data | Hard-coded objects in `src/lib/dashboardContent.ts`, `src/lib/channelAnalyticsContent.ts`, `src/lib/monetizationContent.ts`, and `src/lib/mockAi.ts`. |
| Unfinished in code | A TODO, a “coming soon” control, a route with no caller, or a save that tells the user it is not persisted. |
| Proposed | A reasonable next step inferred from those gaps. Not a committed roadmap. |

There is no billing implementation, no role enum, and no written product roadmap file.

## Product overview

### Vision (marketing copy)

From `src/lib/content.ts` and `src/lib/seo.ts`:

- Product name: **AI Creator Buddy**.
- Tagline: **Faceless video, many channels.**
- Headline: from script to published video, across every channel you run.
- Public description: generate faceless YouTube videos with AI voice, scenes, and SEO tagging, preview every step, and publish across channels from one workspace.
- Canonical site fallback: `https://aicreatorbuddy.app` (`src/lib/seo.ts`).

### Business objectives

Confirmed only as product copy, not as operating metrics or contracts:

- Sell a multi-channel YouTube workspace on top of a faceless creation pipeline.
- Display three plans in the landing pricing section (`src/lib/content.ts`): Starter $20, Growth $100, Scale $300 per month.
- Starter is described as bring-your-own-keys. Growth and Scale describe included generation minutes, channel limits, and (on Scale) team seats and white-label reports.

No checkout, subscription, invoice, or plan-enforcement code exists. The seeded demo profile’s plan string is `"Studio"`, which is not one of the three landing plans.

Landing stats (“10,000+ creators”, “1.2M+ views managed”, testimonials naming Maya Chen, Jordan Blake, and Priya Nair) are marketing copy. Do not treat them as business facts.

### Target audience (marketing copy)

- Solo faceless YouTube creators.
- Creators running several brand channels.
- Agencies that want one workspace per client channel.

### Core problems (marketing copy)

`painPoints` in `src/lib/content.ts`:

- Manually splitting scripts into scenes.
- Writing a prompt per visual.
- Juggling voice, scenes, and captions across tools.
- Switching YouTube dashboards to publish and track channels.

### Value proposition (marketing copy vs product)

Marketing promise: one pipeline — ChatGPT script, ElevenLabs voice, Seedance visuals, Remotion edit, VidIQ SEO, YouTube publish — with edit and preview before anything goes live.

What the app actually does today:

- Authenticated workspace for YouTube channel connect, sync, and email sharing.
- An eight-step create flow (intro, title, thumbnail, script, timeline, description, render, editor) that persists a video session.
- Real generation for some steps (Cursor Agent CLI in development, the local Cursor SDK for the create-step agent, vidIQ titles, thumbnail images, and thumbnail scores, ElevenLabs preview, Remotion browser export, YouTube transcript fetch).
- Simulated generation and simulated analytics, library, and scheduler for the rest. ChatGPT and Gemini pickers still do not call those APIs. vidIQ has no low-effort content check.

### Key features

| Feature | Status |
| --- | --- |
| Marketing site | Confirmed. `/` |
| Email/password accounts and optional Google login | Confirmed |
| YouTube channel OAuth, sync, active channel, email share | Confirmed |
| Create-video pipeline with local draft plus server session | Confirmed |
| Cursor title, score, script, thumbnail prompts, visual prompts, low-effort check | Confirmed in development only (`/api/local/*` returns 404 outside development) |
| vidIQ OAuth, title generate, title score, thumbnail image, thumbnail score | Confirmed. Thumbnail image is `vidiq_generate_thumbnail` (22 credits) then a job poll. Thumbnail score is `vidiq_score_thumbnail` (5 credits) |
| ElevenLabs voices and speech preview via a shared server key | Confirmed |
| Custom thumbnail and scene-clip upload to Supabase Storage | Confirmed. Agent-generated thumbnails are copied into the same bucket |
| Remotion preview and in-browser MP4 export | Confirmed (WebCodecs browsers) |
| Buddy floating chat | Confirmed. Live model if keys exist, otherwise a simulated specialist |
| Create-step agent panel | Confirmed in development. Local Cursor SDK (`@cursor/sdk`), not the Cloud Agents API. Changes auto-apply |
| Integrations page for provider credentials and usage | Confirmed |
| Overview, monetization, library, scheduler | Confirmed UI, **demo data** |
| Profile settings save | UI only. Message: preferences are not persisted |
| YouTube publish / upload | Scope is requested. No upload call exists |
| Seedance video generation | Catalog entry and key probe message only |
| ChatGPT / Gemini as create-step generators | Shown in the picker. Generate opens a “missing provider” state instead of calling those APIs |
| Paid plans, team roles, white-label reports | Marketing copy only |

## What is real, mocked, or marketing

The landing FAQ (`src/lib/content.ts`) still says the demo mocks integrations, connect buttons, and publish, and that the login is `demo@aicreatorbuddy.app` / `demo1234`. That FAQ is **stale relative to the app**:

- YouTube OAuth, vidIQ OAuth, encrypted API keys, ElevenLabs, and Supabase uploads are real.
- The demo user is still real: `prisma/seed.ts` upserts that email and password from `demoAuth` in `src/lib/dashboardContent.ts`.
- Publish to YouTube is still not implemented.
- Overview charts, library rows, scheduler calendar, monetization numbers, and notification items are still hard-coded.

`src/lib/chat/persona.ts` also tells Buddy that the demo mocks most integrations and that publish does not hit a real YouTube account. Treat that as the chat persona’s instructions, not as a full description of the current backend.

## Project directory

```
aicreatorbuddy/
  prisma/schema.prisma          Postgres models
  prisma/migrations/            Applied schema history
  prisma/seed.ts                Demo user
  prisma.config.ts              Datasource URL (DIRECT_URL, else DATABASE_URL)
  src/app/                      App Router pages and route handlers
  src/components/               Landing, dashboard, create, chat, agent, ui
  src/features/                 Provider-shaped modules (cursor, vidiq, elevenlabs, suggestions, predictive text)
  src/lib/                      Auth, db, session, youtube, storage, integrations, chat, mocks
  src/remotion/                 Faceless composition and player props
  src/generated/prisma/         Generated client (gitignored)
  config/README.md              How to set the local Cursor CLI path
  config/cursor-cli.local.json  Gitignored machine config
  docs/superpowers/specs/       One product spec (Buddy chat)
  public/icons/providers/       Provider marks
  scripts/test-db.ts            Database connectivity script
  railway.json                  Railway build, migrate, start
  nixpacks.toml                 Build command
```

Application code is grouped by surface (`components/create`, `components/dashboard`) and by provider (`features/*`), with shared domain types in `src/lib`.

## Technical architecture

### Tech stack (confirmed from `package.json`)

| Layer | Choice |
| --- | --- |
| App | Next.js 16.3.2 App Router, React 19.2.8, TypeScript 5 |
| Style | Tailwind CSS 4 (`@tailwindcss/postcss`), `src/app/globals.css` |
| Auth | Auth.js / NextAuth v5 beta (`next-auth` 5.0.0-beta.32), `@auth/prisma-adapter` |
| Database | PostgreSQL through Prisma 7 and `@prisma/adapter-pg` |
| Passwords | `bcryptjs` cost 12 |
| YouTube | `googleapis`, unofficial `youtube-transcript` plus an Innertube player fetch |
| vidIQ | MCP over Streamable HTTP (`@modelcontextprotocol/sdk`) at `https://mcp.vidiq.com/mcp` |
| Create agent | `@cursor/sdk` local agent (`local.cwd`). Inference is still hosted. Billed to `CURSOR_API_KEY` |
| Voice | `@elevenlabs/elevenlabs-js` |
| Render | `remotion` 4 and `@remotion/player`, `@remotion/media`, `@remotion/web-renderer` |
| Storage | `@supabase/supabase-js` Storage (service role, server only) |
| Client state | Zustand (agent panel), React context (video project), `localStorage`, IndexedDB |
| Motion | `framer-motion` on marketing sections; CSS animations elsewhere |
| Route progress | `nextjs-toploader` |
| Tests | Node’s built-in test runner via `node --import tsx --test` |
| Lint | ESLint 9 with `eslint-config-next` |
| Node | `>=22.13.0` (required by `@cursor/sdk`) |

No Edge runtime is set on routes. API handlers that spawn the Cursor CLI or call providers use the Node.js runtime.

### System architecture

```
Browser
  Landing, login, dashboard shell, create workspace, Buddy chat
        |
        |  localStorage draft (yb_video_projects)
        |  IndexedDB clips (yb_clips) until uploaded
        v
Next.js server (Railway in production)
  Auth.js JWT session
  Route handlers and server actions
        |
        +-- Postgres (Supabase pooler) via Prisma
        +-- Supabase Storage: thumbnails, scene-clips
        +-- Google OAuth + YouTube Data API
        +-- vidIQ MCP OAuth
        +-- ElevenLabs HTTP API (shared env key)
        +-- OpenAI / Gemini only for Buddy chat when keys exist
        +-- Cursor Agent CLI on the machine running the dev server
        +-- Google suggest proxy for topic autocomplete
```

There is no background worker, queue, or cron in the repo. YouTube sync and generation run inside the request that triggers them. Cursor generation is single-flight: `generationInProgress` in `runCursorAgent.ts` rejects a second run with HTTP 429.

### Authentication

- Session strategy is JWT. The Prisma adapter still stores `User`, `Account`, `Session`, and `VerificationToken`.
- Credentials provider: normalized email plus bcrypt password. Users without `passwordHash` cannot use the password form.
- Google provider is registered only when both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set (`src/lib/auth/google.ts`). Otherwise the button is disabled and labeled “coming soon”.
- Google linking uses `allowDangerousEmailAccountLinking: true`.
- Sign-in event calls `linkPendingShares` so a channel invite sent to an email attaches when that person later has an account.
- Dashboard layout (`src/app/dashboard/layout.tsx`) redirects to `/login` when `auth()` has no user.
- `requireUser()` throws `UNAUTHORIZED` for server actions and APIs. There is no `middleware.ts`.
- Login accepts a `next` query only when it is a same-origin path (`/...`, not `//...`).

Signup (`src/app/signup/actions.ts`): name required, email shape check, password at least 8 characters, confirmation must match, unique email, then credential sign-in to `/dashboard`.

### Authorization

There is no application role (owner, editor, admin) in the schema. `demoProfile.role` is the string `"Owner"` for the settings page mock.

Channel access (`src/lib/youtube/access.ts`):

- **Owner:** `YoutubeChannel.userId` matches the session user. Can share, revoke, and disconnect.
- **Member:** a `ChannelShare` row matches the user id or normalized email. Can use the channel. Cannot manage the connection.

Video sessions are scoped to `VideoSession.userId`. A sync that names a `channelId` calls `requireChannelAccess`. Other users get 404, not 403, for sessions they do not own.

### Create-session model

A project id is the `VideoSession.id`.

1. The browser keeps the working `VideoProject` in `localStorage` (`yb_video_projects`, store version 2) and debounces writes.
2. Clip bytes stay in IndexedDB (`src/lib/clipStore.ts`) because localStorage cannot hold video files. Uploaded clips can also be stored in Supabase.
3. On open, the client GETs `/api/create/sessions/:id`. If server step documents are newer, they replace the local project (`shouldPreferServerDocuments` in the provider).
4. Mutations sync a snapshot to `POST /api/create/sessions/:id/sync`. Older snapshots are ignored when the server already has step documents and a later `lastActiveAt`.
5. Overlapping writes retry Prisma `P2034` (`src/lib/session/writeRetry.ts`).
6. Permanent delete writes `DeletedVideoSession` and later requests return 410.

Step documents live on `VideoSessionStep.payload` with `schemaVersion`. Version 0 is the older metrics-only row. Builders are `src/lib/session/stepPayload.ts` and `src/lib/session/snapshot.ts`.

Mark approved persists summary, title, thumbnail, script, timeline, description, and render (`MARK_APPROVE_STEPS` in `src/lib/session/laterStepCommit.ts`). The editor waits for “Confirm edit”.

### APIs

All JSON mutations that were inspected require a logged-in user unless noted. Many also require a same-origin `Origin` header.

| Route | Methods | Role |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | Auth.js | Login, session, Google callback |
| `/api/youtube/connect` | GET | Start Google OAuth |
| `/api/youtube/callback` | GET | Store encrypted channel tokens and sync |
| `/api/vidiq/connect` | GET | Start vidIQ MCP OAuth (dynamic client registration) |
| `/api/vidiq/callback` | GET | Store vidIQ tokens |
| `/api/vidiq/disconnect` | POST | Revoke vidIQ connection |
| `/api/vidiq/test` | POST | Probe the connection |
| `/api/vidiq/titles/generate` | POST | `vidiq_generate_titles` |
| `/api/vidiq/titles/score` | POST | `vidiq_score_title` |
| `/api/vidiq/thumbnails/prompts` | POST | Asks vidIQ for thumbnail *text* prompts via `vidiq_generate_titles`. No UI caller was found |
| `/api/vidiq/thumbnails/image` | POST | `vidiq_generate_thumbnail`, poll `vidiq_job_poll`, store the file in Supabase, return its public URL |
| `/api/vidiq/thumbnails/score` | POST | Download each thumbnail and send it to `vidiq_score_thumbnail` as a data URI |
| `/api/elevenlabs/voices` | GET | List voices |
| `/api/elevenlabs/preview` | POST | Synthesize a short MP3 preview |
| `/api/create/sessions/:id` | GET, DELETE | Load step documents, or permanently delete |
| `/api/create/sessions/:id/sync` | POST | Upsert session, steps, scenes, assets, references, checks |
| `/api/create/sessions/:id/events` | POST | Append telemetry events |
| `/api/create/sessions/:id/references` | POST, DELETE | Fetch or remove a reference transcript |
| `/api/create/sessions/:id/thumbnails/image` | POST | Upload a thumbnail image (max 5 MB) |
| `/api/create/sessions/:id/scenes/:sceneId/clip` | POST, DELETE | Upload or remove a scene clip (max 100 MB) |
| `/api/cursor-prompts` | GET, PATCH | Per-user Cursor prompt overrides and defaults |
| `/api/local/cursor-titles` | POST | Dev-only title generation |
| `/api/local/cursor-title-scores` | POST | Dev-only title scoring |
| `/api/local/cursor-script` | POST | Dev-only script generation |
| `/api/local/cursor-script-score` | POST | Dev-only script score |
| `/api/local/cursor-script-low-effort` | POST | Dev-only low-effort check |
| `/api/local/cursor-thumbnail-prompts` | POST | Dev-only thumbnail prompts |
| `/api/local/cursor-visual-prompts` | POST | Dev-only scene visual prompts |
| `/api/agent/chat` | POST | Dev-only local Cursor SDK chat. SSE. `maxDuration` 300 |
| `/api/chat` | POST | Buddy. No auth check in the route |
| `/api/suggest` | GET | Topic autocomplete proxy |

YouTube channel list, video page, share, and active-channel changes are server actions under `src/app/dashboard/channels/` and related lib modules, not a public REST resource.

Integration key save, remove, enable, and refresh are server actions in `src/app/dashboard/integrations/actions.ts`.

### Database schema

Source: [prisma/schema.prisma](prisma/schema.prisma). Migrations are in `prisma/migrations/`.

| Model | Purpose |
| --- | --- |
| `User` | Account. Optional `passwordHash`, optional `activeChannelId` |
| `Account`, `Session`, `VerificationToken` | Auth.js |
| `YoutubeChannel` | One Google token set per connected channel. Stats and uploads playlist id |
| `ChannelShare` | Invite by lowercase email. Optional `userId` once accepted |
| `YoutubeVideo` | Synced public video metadata and counts |
| `VideoSession` | Create project header, counters, cost rollup, status |
| `VideoSessionStep` | Per-step state, metrics `data`, document `payload` |
| `VideoSessionEvent` | Client telemetry, idempotent on `clientEventId` |
| `VideoSessionApiCall` | Estimated cost rows, idempotent on `clientCallId` |
| `VideoSessionAsset` | Clip, image, voiceover, thumbnail, stock metadata |
| `VideoSessionScene` | Ordered scene timing and flags |
| `VideoSessionExport` | Render attempt status |
| `VideoSessionCheck` | Score or low-effort result keyed by source hash |
| `VideoSessionReference` | Reference URL, transcript, segments, metadata |
| `DeletedVideoSession` | Tombstone so a deleted id cannot be recreated by a late sync |
| `CursorPromptSettings` | One row per user. Custom prompts and saved defaults |
| `UserIntegration` | Per-user provider connection, encrypted secret, quota fields |
| `IntegrationUsage` | Provider call log and estimated USD |
| `McpClientRegistration` | vidIQ dynamic OAuth client id per redirect URI |

Enums worth knowing: `CreateStep` (SUMMARY through EDITOR), `StepState`, `VideoSessionStatus`, `IntegrationProvider` (YOUTUBE, VIDIQ, CHATGPT, GEMINI, ELEVENLABS, SEEDANCE, REMOTION), `ChannelConnectionStatus`.

`CURSOR` is not an `IntegrationProvider`. Cursor runs as a local CLI, configured outside the integrations table.

### Infrastructure and deployment

Confirmed from `railway.json`, `nixpacks.toml`, `package.json`, and `.env.example`:

- Production host targeted by the repo is **Railway**, not a Vercel project file. `railway.json` uses Nixpacks, `npm run build`, pre-deploy `npx prisma migrate deploy`, `npm run start`, health check `/`.
- `postinstall` and `build` run `prisma generate` so the client exists before `next build`.
- `AUTH_TRUST_HOST=true` is required on Railway.
- Database: Supabase Postgres. `DATABASE_URL` is the transaction pooler (port 6543, `pgbouncer=true`). `DIRECT_URL` is the session pooler (port 5432) for migrations.
- `prisma.config.ts` falls back to a localhost URL so `prisma generate` can run in an image build before Railway injects the real URL.
- Site URL resolution order (`src/lib/seo.ts`): `NEXT_PUBLIC_SITE_URL`, then `VERCEL_PROJECT_PRODUCTION_URL`, then `RAILWAY_PUBLIC_DOMAIN`, else `https://aicreatorbuddy.app`.
- Supabase Storage buckets expected: `thumbnails` (public) and `scene-clips` (public). Object keys are `{sessionId}/{thumbnailId}.ext` and `{sessionId}/{sceneId}/{clipId}.ext`.

No Dockerfile, `vercel.ts`, or CI workflow is in the repo.

## Key decisions, assumptions, constraints, dependencies

### Decisions visible in code

- Redirect URIs for YouTube and vidIQ are derived from the request origin, not an env var, so localhost and production share one code path. Each origin must be registered with the provider.
- OAuth and API-key secrets are encrypted at rest with AES-256-GCM (`src/lib/crypto.ts`). The key is `TOKEN_ENCRYPTION_KEY` (32 bytes, base64).
- YouTube tokens are per channel because Google binds the refresh token to the account or brand channel chosen on the consent screen.
- YouTube consent uses `prompt: "select_account consent"` and `access_type: "offline"` so a refresh token is returned.
- Create drafts are local-first, then reconciled with server documents, so a refresh does not depend on the network for the latest keystrokes.
- Cursor prompts are user-editable and stored on `CursorPromptSettings`, with code defaults in `src/features/cursor-title-generator/prompt.ts`.
- Cursor CLI path and model live in gitignored `config/cursor-cli.local.json`, not in `.env`, because `.env` is committed. See [config/README.md](config/README.md).
- Remotion is transpiled by Next (`next.config.ts`) and exports in the browser via WebCodecs. The server does not render video.
- ElevenLabs uses one server key (`sharedEnv: true`). Users cannot paste their own key on the integrations page.
- ChatGPT and Gemini keys can be saved and probed, but the create steps do not call those keys. Buddy chat uses `OPENAI_API_KEY` and `GEMINI_API_KEY`, which are separate server env vars.
- `.gitignore` states that `.env` is committed on purpose for this single-maintainer project, and that platform env vars still override it.

### Assumptions

- One workspace per user. `VideoSession.workspaceId` defaults to `"default"` and is not a tenant table.
- “Selected channel” (`User.activeChannelId`) is the channel new videos are aimed at. Overview and monetization pages do not query that channel’s analytics API.
- Estimated dollars on create steps (`src/lib/apiCost.ts`) are local formulas, not provider invoices. Cursor and vidIQ title fires in the title step record `usd: 0`.
- Public Storage URLs are acceptable for thumbnails and scene clips. The code calls `getPublicUrl`. vidIQ’s thumbnail scorer rejects the Supabase host, so scoring downloads the object and sends a `data:image/...;base64,...` URI.

### Constraints

- Cursor CLI generation cannot run on Railway as implemented: it spawns a local `agent` binary and is disabled when `NODE_ENV !== "development"`. The create-step agent uses `@cursor/sdk` with `CURSOR_API_KEY` and is also development-only.
- One-shot Cursor CLI calls share one process lock. The SDK agent is a separate in-memory pool (`src/features/cursor-sdk-agent/server/pool.ts`).
- Script generation timeout is 180 seconds. Other Cursor calls time out at 90 seconds.
- Thumbnail uploads: JPEG, PNG, WebP, GIF, under 5 MB.
- Scene clips: MP4, WebM, QuickTime, or those image types, under 100 MB.
- Reference transcripts cap at 200,000 characters and 5,000 segments. At most 5 reference videos (`MAX_REFERENCES`).
- Shorts duration snaps between 15 seconds and 5 minutes. Long-form minimum is 5 minutes.
- Buddy chat accepts at most 24 messages, 4,000 characters each, and waits 20 seconds per provider.
- Google’s suggest endpoint used by `/api/suggest` is unofficial. The predictive-text readme says not to depend on it in production. See [src/features/predictive-text/README.md](src/features/predictive-text/README.md).
- Remotion web export needs WebCodecs (the code comment names Chrome 94+, Firefox 130+, Safari 26+).

### Dependencies

External systems the running app expects when a feature is used: Supabase Postgres, Supabase Storage, Google Cloud OAuth client, YouTube Data API key (for transcript title fallback paths that use `YOUTUBE_API_KEY`), vidIQ MCP, ElevenLabs, and a logged-in Cursor Agent CLI on developer machines. OpenAI and Gemini are optional and only affect Buddy.

## UI and UX

### Design system

Dark theme only. `color-scheme: dark` on `html`. Tokens are CSS variables in `src/app/globals.css`, mapped into Tailwind via `@theme inline`.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#0b0d12` | Page |
| `--foreground` | `#f4f6f8` | Text |
| `--muted` | `#9aa4b2` | Secondary text |
| `--surface` / `--surface-soft` | `#12151c` / `#171b24` | Cards, fields |
| `--border` | `#242a35` | Hairlines |
| `--accent` / `--accent-dark` | `#ff3b4e` / `#e11d2e` | Primary actions |
| `--accent-soft` | `#3a141a` | Accent wash |
| `--success` | `#22c55e` | Positive deltas |
| `--dashboard` / `--dashboard-panel` | `#0e1117` / `#171c26` | App shell |
| `--chart-blue` / `--chart-purple` / `--chart-amber` | `#3b82f6` / `#a855f7` / `#f59e0b` | Charts |
| `--footer-bg` | `#05070a` | Footer |
| `--glow` | `rgba(255, 59, 78, 0.22)` | Hero atmosphere |

The top loader uses `#ff0000`, which is slightly different from `--accent`.

Typography:

- Display: **Sora** 500–700, CSS variable `--font-display`, class `font-display`.
- Body: **DM Sans** 400–700, `--font-body`, applied as `font-sans`.
- Loaded with `next/font` in `src/app/layout.tsx`.

Surfaces:

- `.atmosphere` — radial red glow over a vertical gradient, used on `body`.
- `.glass-card`, `.glass-panel`, `.glass-field` — translucent marketing and form surfaces.
- Noise overlay at 5% opacity on `body::before`.
- Dashboard cards more often use solid `bg-surface` and `border-border` than glass.

Shape: controls are `rounded-xl`. Primary buttons are accent fill, white text, hover `--accent-dark`. Secondary buttons are bordered and translucent (`src/components/ui/Button.tsx`, `ActionButton`).

### Reusable components

`src/components/ui/`: `Button` (link), `ActionButton` (button with loading), `Input`, `Textarea`, `Select`, `Field`, `Badge`, `Tabs`, `Modal`, `ConfirmModal`, `EmptyState`, `Skeleton`, `SectionHeading`, `BrandMark`, `Reveal`, `RouteFade`, and skeletons for sidebar, dashboard, video grid, and player.

Create-specific: `OptionCard`, `GenerateBar`, `ProviderPicker`, `StepNavigator`, `StepDock`, `StepApprove`, `StepFixModal`, `ManualTitleModal`, `PriorStepGlimpse`, `ProjectNameHeading`.

Dashboard widgets under `channel-analytics/widgets/` (`StatGrid`, `Panel`, `TrendLineChart`, `SimpleTable`, and others) are shared with the monetization pages.

### Layout patterns

- Marketing: sticky nav, long single page with anchor sections, footer.
- Dashboard: fixed left sidebar (16rem, collapses to 4rem at `lg`), fixed top bar, scrollable content. Mobile (`< lg`) hides the sidebar off-canvas behind a scrim. Escape closes it.
- Create project: same shell, step navigator, sticky step dock, optional agent panel from the right (340–720px, default 420). The top bar’s right edge tracks `--agent-panel-width`.
- Buddy: fixed bottom-right launcher, `z-index` 80. Modals use `z-index` 90. Top loader uses 99999.

### Responsive behavior

Breakpoints follow Tailwind defaults. Grids step from one column to `sm:grid-cols-2` and `xl:grid-cols-4` on stat rows. The create dock shortens “Mark approved” to “Approve” below `sm`. Sidebar collapse is stored in `localStorage` key `yb_sidebar_collapsed`.

### Accessibility (what the code does)

- Landing has a skip link to `#main-content`.
- Search, date range, and several icon buttons have `sr-only` labels or `aria-label`.
- Mobile nav sets `aria-expanded`. Open mobile nav sets `body` overflow hidden. Escape closes it and the notification menu.
- `prefers-reduced-motion: reduce` disables page-fade and modal entrance animations. Not every animation is covered.
- Focus styles are accent borders and rings on fields (`focus:border-accent`, `focus:ring-accent/25`).
- No documented WCAG target, no automated a11y suite, and many clickable cards are plain links or buttons without a fuller keyboard model.

### Motion

`page-fade-in` (240ms), modal backdrop and panel scales, a preview pop, and a pulse dot. Marketing sections use `framer-motion` through `Reveal`. Dashboard route changes use `RouteFade`.

## Functional workflows

### Account

1. Sign up or log in. Optional Google if env keys exist.
2. Land on `/dashboard`.
3. Seeded demo account exists after `npm run db:seed`.

### Connect a channel

1. `/dashboard/channels` → Add channel → `/api/youtube/connect`.
2. Google consent. Scopes: `openid`, `userinfo.email`, `youtube.readonly`, `youtube.upload`.
3. Callback stores encrypted access and refresh tokens, channel id, uploads playlist, and runs a sync of channel stats and playlist videos (`src/lib/youtube/api.ts` lists channels, playlist items, and videos).
4. Owner can invite an email. The invitee sees the channel after login. Owner can revoke.
5. User picks an active channel on the overview. Create reads that selection.

`youtube.upload` is requested. `src/lib/youtube/api.ts` never calls `videos.insert`.

### Create a video

Steps in `STEPS` (`src/lib/videoProject.ts`):

| Step | User does | Generation that actually runs |
| --- | --- | --- |
| Video intro | Topic, Shorts or long-form, educational or entertainment, duration, up to 5 YouTube references | Transcript fetch via `/api/create/sessions/:id/references`. Topic field uses predictive text |
| Title | Pick Cursor, vidIQ, ChatGPT, Gemini, or type titles. Score with vidIQ or Cursor | Cursor (dev) and vidIQ are live. ChatGPT and Gemini set a missing-provider modal. Manual titles are local |
| Thumbnail | Cursor prompts, upload an image, or ask the agent to generate images. **Analyze with vidIQ** scores each image | Cursor prompts (dev). Upload and agent images go to the `thumbnails` bucket at `{sessionId}/{thumbnailId}.ext` and are stored as `customUrl`. Scoring is live `vidiq_score_thumbnail` (needs a selected title and a reference YouTube id). The old VidIQ lab and A/B mock ranking are gone. ChatGPT and Gemini still open a missing-provider modal |
| Script | Cursor, upload `.txt` / `.md`, or ask the agent to write the script. Low-effort check | `generateScript` uses the Cursor script prompt and writes `fullScript`. **Check low-effort with Cursor** and the agent tool `checkScriptLowEffort` use the low-effort prompt. A clean script may return no findings, which is a pass. vidIQ does not offer this check |
| Timeline | Split the saved script into labeled sections, edit beats, upload a clip, preview ElevenLabs | Split is local (`scenesFromScript`). Visual prompts are Cursor (dev). ElevenLabs preview is live when the server key and integration gate allow it. Browser speech is a separate voice picker |
| Description | Generate copy and tags, then edit | `mockGenerate` in `src/lib/mockAi.ts` |
| Render | Readiness checklist, Remotion MP4 download, low-effort check | Real browser export when scenes exist |
| Editor | Opens after `renderedAt`. Trim, filters, transitions, overlays, music picker, captions | Music and stock lists are `mockMusicTracks` and `mockStockClips`. Confirm edit persists editor settings |

Providers shown on steps still include ChatGPT and Gemini (`TEXT_PROVIDERS`). Choosing them does not call the saved user API keys.

Script sections must already be labeled for `scenesFromScript` to return scenes. An empty or unstructured script does not split.

### Buddy

Mounted on every page from the root layout. `POST /api/chat` with `{ messages, pathname }`. Order: OpenAI (`gpt-4o-mini` unless `OPENAI_CHAT_MODEL`), then Gemini (`gemini-2.0-flash` unless `GEMINI_CHAT_MODEL`), then `mockSpecialistReply`. The thread is `sessionStorage` for the tab. Spec: [docs/superpowers/specs/2026-08-24-youtube-specialist-chat-design.md](docs/superpowers/specs/2026-08-24-youtube-specialist-chat-design.md).

### Create agent panel

On `/dashboard/create` and `/dashboard/create/[projectId]`. Threads persist in this browser’s `localStorage` (`acb_agent_threads_${videoId}`), not in the database. The index page uses video id `create-index` and hands the thread to the new project. The panel stays open across navigation until the user closes it.

`POST /api/agent/chat` runs a **local** Cursor SDK agent (`Agent.create` / `Agent.resume`, `tools: ["mcp"]` plus custom project tools). It returns 404 outside development. It does not call `POST https://api.cursor.com/v1/agents`. The model preference is `composer-2.5` when `Cursor.models.list()` includes it. Instructions are in the user prompt. `settingSources` is empty.

The panel has no Ask/Agent switch and no Auto-apply checkbox. Mode is always `agent`, and project changes apply as soon as the `change` event arrives. While a tool runs, the transcript shows a spinner and `Calling {label}…`. Step, topic, and channel context is still sent with the next message. The “Included with the next message” chips are not shown. `@` can still attach title, script, thumbnail, brief, or timeline.

Custom tools live in `src/features/cursor-sdk-agent/server/tools.ts`. Generation and scoring default to Cursor unless the user names ChatGPT, Gemini, or vidIQ. Thumbnail images and thumbnail scores are vidIQ. The low-effort check is Cursor. SDK tool events arrive as MCP name `mcp`; the real name is `args.toolName`.

| Tool | What it writes |
| --- | --- |
| `setBrief`, `setProjectName`, `setApproxLength` | Topic, workspace name, duration |
| `addReference`, `fetchReferenceTranscript` | YouTube reference and its transcript |
| `generateTitles`, `scoreTitles`, `applyTitle` | Titles and scores |
| `generateScript`, `scoreScript`, `editScript`, `checkScriptLowEffort` | Script, script score, low-effort report |
| `generateThumbnailPrompt`, `generateThumbnailImages`, `scoreThumbnails` | Prompt text, one Supabase image per prompt, vidIQ score per image |
| `generateVisualPrompts`, `updateTimeline`, `writeDescription` | Scene prompts, scenes, description |
| `navigateToStep`, `markStepApproved` | Step focus and approval |

`generateThumbnailImages` calls the same generator as the per-card VidIQ button. `scoreThumbnails` calls the same scorer as **Analyze with vidIQ**. Both need the video open. Scoring also needs a title and a reference YouTube id. Approval that is missing a title, thumbnail, or script opens one notice (`StepFixModal` in `VideoProjectProvider`). Closing it releases the page scroll lock.

### Permissions

| Action | Who |
| --- | --- |
| Read or mutate own video session | Session user |
| Attach a session to a channel | Owner or share member |
| Share, revoke, disconnect a channel | Owner only |
| Save ChatGPT, Gemini, or Seedance keys | Any logged-in user, for their own row |
| Change ElevenLabs key | Nobody in the UI. Server env only |
| Disconnect YouTube from the integrations page | Blocked. Message says to use Channels |
| Use Cursor routes | Logged-in user, same origin, development only |

### Automations

None on a schedule. The only automatic behaviors are: share linking on sign-in, debounced draft save, snapshot sync, write-conflict retry, and transcript fetch when the user asks for it.

### Feature dependencies

- Timeline split depends on a script with labeled sections.
- Editor depends on a successful render (`renderedAt`).
- Render depends on at least one scene.
- One-shot Cursor steps depend on a local CLI and `agent login`. The create agent depends on `CURSOR_API_KEY` and Node `>=22.13`.
- vidIQ steps depend on a connected account and credits. Recorded costs in `src/lib/vidiq/client.ts`: title score and title generate 5, thumbnail score 5, thumbnail generate 22, job poll 0. In development, if the logged-in user has no vidIQ OAuth token, calls fall back to the bearer token in `~/.cursor/mcp.json`. That token is not copied into the repo. The integrations page can show that fallback as connected and refresh `vidiq_balance` (remaining credits versus the plan cap).
- ElevenLabs preview depends on `ELEVEN_LABS_API_KEY` and `authorizeElevenLabs`.
- Thumbnail and clip URLs depend on Supabase buckets.
- New videos are associated with the active channel chosen on the overview.

## Page-wise documentation

Dashboard pages sit behind the login redirect. They share `DashboardShell`: sidebar, top nav, active-channel badge. Top search submits to `/dashboard/library?q=`. The notification bell shows three hard-coded items.

### `/` — Marketing home

- **Purpose:** Explain the product and show pricing.
- **Components:** `Navbar`, `Hero`, `ResultsStrip`, `Features`, `BuiltWith`, `HowItWorks`, `PainPoints`, `PipelineTools`, `MultiChannelStrip`, `Testimonials`, `Pricing`, `FAQ`, `BottomCTA`, `Footer`. JSON-LD from `getLandingJsonLd`.
- **Data:** `src/lib/content.ts`. Session only changes the navbar (logged-in vs not).
- **Navigation:** In-page anchors and `/login`. Footer links for Status, API, About, Careers, Privacy, GDPR, Refund, and Terms have no `href`.

### `/login`, `/signup`

- **Purpose:** Credentials and optional Google.
- **Components:** `LoginForm`, `SignupForm`.
- **Data:** Server actions and Auth.js. Google button state from env.
- **Navigation:** Each links to the other. Success goes to `next` or `/dashboard`.

### `/dashboard` — Overview

- **Purpose:** Pick the active channel, then show a performance overview.
- **Components:** `ActiveChannelPicker` (live channels), `OverviewDashboard` (static stats, charts, recent uploads, scheduled table).
- **Data:** `listChannels` from Postgres. Stats from `overviewPrimaryStats` and related constants. Refresh waits 700ms and does not refetch. Export is a button with no handler in the snippet that renders it.
- **Navigation:** Upload links to `/dashboard/create`.

### `/dashboard/channels` — YouTube connections

- **Purpose:** Connect, inspect, and share channels.
- **Components:** `ChannelsView`, `ChannelCard`, `ChannelVideosPanel`, `ShareChannelModal`.
- **Data:** Live `YoutubeChannel` and `YoutubeVideo` rows. Query `connected` or `error` becomes a banner, then the URL is replaced.
- **Interactions:** Add channel (OAuth), open a channel to page videos, share by email, disconnect (owner).

`ChannelAnalyticsPanel` (`src/components/dashboard/channel-analytics/`) renders `getChannelAnalytics`, which fabricates series. **No page imports that panel.** It is unused UI on top of demo data.

### `/dashboard/analytics` — Monetization

Layout loads the active channel for labeling, then `MonetizationProvider` builds numbers with `getMonetizationData` (synthetic, seeded from the channel record plus a range).

| Route | Section |
| --- | --- |
| `/dashboard/analytics` | Revenue overview |
| `/dashboard/analytics/rpm-cpm` | RPM / CPM |
| `/dashboard/analytics/top-videos` | Top earning videos |
| `/dashboard/analytics/ad-formats` | Ad format mix |

Ranges are 7d, 28d, 90d. Changing range recomputes local data. It does not call YouTube Analytics.

### `/dashboard/create` — Project index

- **Purpose:** List local drafts and start one.
- **Components:** `CreateIndexClient`.
- **Data:** `localStorage` projects, plus channel list for context.
- **Interactions:** New project navigates to `/dashboard/create/[projectId]`. Delete calls the session DELETE API and drops the local draft. Copy in the UI says deletion removes server events, titles, scripts, transcripts, scenes, assets, checks, and export metadata.

### `/dashboard/create/[projectId]` — Pipeline

- **Purpose:** The eight-step editor described above.
- **Components:** `CreateProjectClient`, `AgentLayout`, `CreateVideoWorkspace`, step components, `VideoPreviewModal`.
- **Data:** Local project, server documents, Supabase URLs, provider APIs.
- **Navigation:** Step navigator and dock. Back to the index. Agent toggle.

### `/dashboard/library`

- **Purpose:** Browse a content library.
- **Components:** `VideoLibraryView`, `PlaylistLibraryView`, `LibraryToolbar`.
- **Data:** `libraryVideos` and playlist constants in `dashboardContent.ts`. Channel filter options are the four fake `workspaceChannels`, not connected YouTube channels.
- **Routes:** `/dashboard/library` (all), `/drafts`, `/scheduled`, `/playlists` (optional `status` query). Search query filters the static list.

### `/dashboard/scheduler`

- **Purpose:** Show a planning UI.
- **Data:** `calendarStatCards`, `calendarEvents`, `upcomingUploads`, `bestTimeBars`, `activityHeatmap`, `aiInsights` — all static.
- **Routes:** Calendar (`/dashboard/scheduler`), Upcoming Uploads, Best Time To Post.
- **Unfinished in code:** Best Time cards for timeline, AI recommendations, and post history are titled “coming soon”. “Schedule Video” links to `/dashboard/create` and does not create a scheduled publish.

### `/dashboard/integrations`

- **Purpose:** Connect providers and inspect status.
- **Components:** `IntegrationsClient`, `IntegrationCard`, `IntegrationUsageModal`.
- **Data:** `UserIntegration` plus `IntegrationUsage`, merged with `INTEGRATION_CATALOG`. ElevenLabs quota is read from the shared key when refreshing.
- **Interactions:** OAuth for YouTube (link out) and vidIQ. Paste key for ChatGPT (`sk-`), Gemini (`AIza`), and Seedance (saved, not probed). Remotion is `NONE` (no credential). Enable, disable, remove.

The large `Integration` fixtures in `dashboardContent.ts` are the older demo shape. The page itself loads `listUserIntegrations`.

### `/dashboard/settings`

- **Purpose:** Profile form.
- **Data:** Session name and email. Timezone, default channel, and email alerts initialize from `demoProfile` and `workspaceChannels`.
- **Save:** After 600ms, the message is “Saved — preferences are not persisted yet.”
- **Nav:** Not in `navItems`. It is the account block at the bottom of the sidebar.

## Database and data flow

### Entities and relationships

```
User 1—* YoutubeChannel 1—* YoutubeVideo
User 1—* ChannelShare (as member or inviter)
YoutubeChannel 1—* ChannelShare
User 1—* VideoSession 1—* steps, events, apiCalls, assets, scenes, exports, checks, references
User 1—1 CursorPromptSettings
User 1—* UserIntegration 1—* IntegrationUsage
User *—1 YoutubeChannel (activeChannel, SetNull on delete)
VideoSession *—1 YoutubeChannel (SetNull)
```

Deleting a user cascades owned channels, sessions, shares, and integrations. Deleting a channel cascades its videos and shares and nulls session and active-channel pointers.

### Lifecycle of a video

1. Client creates an id and an empty `VideoProject` (status draft, step summary).
2. Edits stay local until sync.
3. Sync upserts the header and replaces child rows for steps, scenes, assets, and references from the snapshot.
4. Approve flips `VideoSessionStep.state` toward APPROVED and stores the step payload.
5. Render sets `renderedAt` and session status `RENDERED`, and can insert `VideoSessionExport`.
6. Delete removes the session and inserts `DeletedVideoSession`.

`VideoSessionStatus` also includes `IN_PROGRESS`, `EXPORTED`, and `ABANDONED`. The sync route sets `RENDERED` when `renderedAt` is set and `DRAFT` otherwise. The other statuses are in the schema. This document does not claim a writer for each of them.

### Validation

- Signup and integration key shape checks are in the server actions.
- Cursor and vidIQ route handlers parse and bound request bodies (topic length, title counts, byte caps).
- Snapshot sync rejects a body whose id does not match the URL.
- Thumbnail and clip uploads check MIME and size.
- Reference video ids must match YouTube’s 11-character id or a youtube.com / youtu.be URL.

### Security of data

- Channel OAuth tokens and user API keys are ciphertext in Postgres.
- Service role Supabase key stays server-side (`SUPABASE_SERVICE_ROLE_KEY`). The public URL is `NEXT_PUBLIC_SUPABASE_URL`.
- Session APIs check the user id. Channel ids are not leaked when access fails (`CHANNEL_NOT_FOUND`).
- Same-origin checks on state-changing provider routes.
- OAuth `state` cookies are `httpOnly`, `sameSite: lax`, 10 minutes, `secure` in production.

### Third-party data flows

| Flow | Data leaving the app |
| --- | --- |
| YouTube OAuth and sync | Auth code, then channel and video metadata coming back |
| Reference transcript | Video id to YouTube Innertube and `youtube-transcript` |
| vidIQ | Title text, thumbnail image bytes (data URI), a reference YouTube id, session id for usage rows. The Supabase URL is not sent as the image |
| ElevenLabs | Voice id and preview text. Response is audio bytes |
| Cursor CLI | Prompt and project context on the local machine. Not sent by this app to a hosted Cursor API of its own |
| Buddy | Recent chat messages to OpenAI or Gemini when those keys exist |
| Suggest | The topic prefix to `suggestqueries.google.com` |
| Supabase Storage | Image and clip bytes. URLs are public |

## Build plan and existing documentation

There is **no build-plan directory, roadmap file, or `Project Context.md`**. The documents below are the full set of product docs in the repo. Skill packs under `.agents/`, `agent/`, and `.claude/` are third-party Supabase notes, not this product’s plan.

| Document | What it is | Status | Depends on |
| --- | --- | --- | --- |
| [README.md](README.md) | create-next-app boilerplate | Does not describe the product | — |
| [AGENTS.md](AGENTS.md) | Next.js version warning for coding agents | Maintained by `next dev` | Next 16 docs in `node_modules/next/dist/docs/` |
| [CLAUDE.md](CLAUDE.md) | Points at `AGENTS.md` | Same | — |
| [config/README.md](config/README.md) | Per-machine Cursor CLI JSON | Current. Required for local generation | Cursor `agent` install |
| [docs/superpowers/specs/2026-08-24-youtube-specialist-chat-design.md](docs/superpowers/specs/2026-08-24-youtube-specialist-chat-design.md) | Buddy chat spec (2026-08-24) | Implemented: widget, `POST /api/chat`, provider order, `sessionStorage`, page-aware persona | `OPENAI_API_KEY`, `GEMINI_API_KEY` optional |
| [src/features/predictive-text/README.md](src/features/predictive-text/README.md) | Topic autocomplete | Implemented. Default source `hybrid` | `/api/suggest` for remote phrases |
| [prisma/schema.prisma](prisma/schema.prisma) | Data model | Current schema | Postgres |
| [.env.example](.env.example) | Env template | Current for the variables it lists | — |
| This file | Product map | Replace when behavior changes | The tree above |

Schema history (migration folders, oldest first): auth users, YouTube channels, status fields, per-user channel ownership, channel sharing, video session tracking, references, permanent deletion, cursor prompt settings, script analysis, user integrations, active channel, step payload documents, cursor prompt defaults, thumbnail prompt generation, script prompt generation, visual prompt generation.

## Integrations and environment

Catalog: `src/lib/integrations/catalog.ts`.

| Id | Auth | What the app does with it |
| --- | --- | --- |
| youtube | OAuth | Connect and sync. Upload scope unused |
| vidiq | OAuth (MCP). Dev fallback: Cursor MCP bearer | Titles, title scores, thumbnail images, thumbnail scores, credit balance |
| chatgpt | API key `sk-` | Key probe against `GET /v1/models`. Not used to generate create-step text |
| gemini | API key `AIza` | Key probe against the models list. Same gap |
| elevenlabs | Shared env key | Voices, TTS preview, subscription quota on refresh |
| seedance | API key | Stored encrypted. Probe message says it is verified on first use. No generation client |
| remotion | None | In-browser renderer. No account |

### Environment variables

From `.env.example` and additional names read in code.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Storage project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server storage client |
| `DATABASE_URL` | Runtime Postgres (pooler) |
| `DIRECT_URL` | Migrations |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | YouTube OAuth |
| `YOUTUBE_API_KEY` | YouTube Data API key |
| `TOKEN_ENCRYPTION_KEY` | AES-256-GCM key |
| `AUTH_SECRET` | Auth.js |
| `AUTH_TRUST_HOST` | Non-Vercel hosts |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Login with Google. Independent of the YouTube client |
| `NEXT_PUBLIC_SUGGESTION_SOURCE` | `local`, `remote`, or `hybrid` (default hybrid) |
| `OPENAI_API_KEY` | Buddy only |
| `GEMINI_API_KEY` | Buddy only |
| `ELEVEN_LABS_API_KEY` | TTS. Not the SDK’s default `ELEVENLABS_API_KEY` |
| `OPENAI_CHAT_MODEL` | Optional Buddy model override. Not in `.env.example` |
| `GEMINI_CHAT_MODEL` | Optional Buddy model override. Not in `.env.example` |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL override. Not in `.env.example` |
| `CURSOR_API_KEY` | Local Cursor SDK agent. Same key as the Cursor dashboard API key. Not a cloud-agent spend limit |
| `CURSOR_AGENT_PATH`, `CURSOR_AGENT_MODEL` | Fallback if `config/cursor-cli.local.json` is empty. The README says not to put the path in `.env` |
| `RAILWAY_PUBLIC_DOMAIN`, `VERCEL_PROJECT_PRODUCTION_URL` | Read for SEO URL if present |
| `NODE_ENV` | Gates every `/api/local/*` route and `/api/agent/chat` |

OAuth redirect URIs that must be registered:

- `http://localhost:3000/api/youtube/callback` and `https://<domain>/api/youtube/callback`
- `http://localhost:3000/api/auth/callback/google` and the production equivalent
- vidIQ uses the MCP register endpoint and stores the client in `McpClientRegistration`

No inbound product webhooks are implemented. OAuth callbacks are the redirect returns above.

## Security and performance

### Data protection

- Passwords hashed with bcrypt cost 12.
- Provider secrets encrypted before insert.
- Dashboard routes send `robots: noindex`.
- Login `next` is restricted to a single-slash path.
- `.env` is intentionally tracked (see `.gitignore`). That is a real risk if the remote is shared. Platform env still overrides at runtime. Do not copy new secrets into `.env` if the repo is pushed.

### Authorization gaps (confirmed)

- `/api/chat` does not call `requireUser`. Anyone who can reach the server can spend OpenAI or Gemini quota.
- Storage objects are public URLs.
- Share grants are all-or-nothing channel access. There is no editor-vs-viewer flag.
- Google account linking is enabled across emails that match.

### Error handling

- Provider routes map auth failures to 401, validation to 400, conflicts to 409, vidIQ credit exhaustion to 402, and tool failures to 502.
- Cursor maps missing CLI and logged-out CLI to 503, busy to 429, cancel to 408.
- Dashboard channel loads log and continue with an empty list, or show “Could not reach the database” on the channels page.
- Buddy falls back to the simulated specialist instead of failing the widget when a model errors.
- Client generation stores the error string from `useGeneration`.

### Scalability (as built)

- One Node server process. Cursor work is globally locked in that process.
- YouTube sync walks the uploads playlist 50 items at a time inside the OAuth callback request.
- Video session sync rewrites child collections in a transaction. `withWriteRetry` covers serialization conflicts only.
- No cache layer, no read replica config, no queue.
- Prisma client is cached on `globalThis` in development only.

### Performance notes

- `export const dynamic = "force-dynamic"` on dashboard, channels, and create pages.
- Images in the channel switcher use a plain `img` with `referrerPolicy="no-referrer"` rather than `next/image` in that component.
- Clip bytes are kept out of `localStorage` on purpose.
- Predictive text is local-first in `hybrid` mode, then merges up to 8 suggestions.

### Backups

No backup job, dump script, or point-in-time restore doc is in the repo. Persistence is whatever Supabase Postgres and Storage provide for the project. Local drafts disappear with the browser profile. IndexedDB clips are per browser.

## Current development status

Branch: `main`. Latest commit inspected: `331d47a` (video session documents, reference titles, step navigation). The working tree also contains the create-step Cursor SDK agent, vidIQ thumbnail image and score, the low-effort agent tool, ElevenLabs routes, scene clip storage, and their tests. Treat the tree, not only that commit, as the product.

### Completed (usable in the tree)

- Marketing page, signup, login, JWT session, optional Google login, demo seed.
- YouTube connect, token refresh storage, channel sync, active channel, email sharing.
- Integrations catalog with encrypted keys, vidIQ OAuth, usage rows.
- Create index and eight-step workspace, local draft, server document hydrate, approve-to-persist, permanent delete.
- Reference transcript fetch.
- Cursor generators and prompt editor in development.
- Create-step agent: local Cursor SDK, persisted browser threads, auto-applied project tools.
- vidIQ title generate and score, thumbnail image generation, and live thumbnail scoring.
- ElevenLabs voice list and preview.
- Supabase thumbnail and scene-clip upload.
- Remotion player and browser MP4 download.
- Buddy chat with provider fallback.
- Predictive text on the topic field.
- Unit tests listed in `npm test` (contracts, transcript, session commits, scene split, clip paths, timing, predictive text, suggestions, agent change parsing, vidIQ thumbnail job, balance, and score parsers).

### In progress

Inferred from uncommitted files and TODOs, not from a ticket board:

- Replacing `mockGenerate` for descriptions, scenes, and the remaining VidIQ script path (`TODO: replace with real API call` in `src/lib/mockAi.ts`). Thumbnail scoring no longer uses that mock.
- Wiring ChatGPT and Gemini, which already have key storage, into those steps. The UI already shows a missing-provider modal instead of the mock for several generators.
- Scene visual generation stops at prompts. Seedance is not called.

### Pending (UI or schema without behavior)

- Profile settings persistence.
- Overview, monetization, library, scheduler, notifications: demo data.
- Best-time timeline, AI recommendations, and post history.
- YouTube upload, despite the scope.
- vidIQ thumbnail prompt route with no caller.
- `ChannelAnalyticsPanel` with no route.
- Footer and pricing CTAs that do not start checkout.
- Landing FAQ and Buddy persona that still describe a fully mocked demo.

### Known issues called out by the code

- Stale FAQ versus live OAuth.
- ChatGPT and Gemini create buttons do not generate.
- Description step still returns mock copy that includes the provider name in the text.
- Editor music and stock are mocks.
- Settings “save” does not write.
- Overview “Refresh” does not reload YouTube.
- `/api/chat` is unauthenticated.
- Cursor cannot run in the production `NODE_ENV`.
- Google suggest is unofficial.
- `.env` is committed by policy.

## Future scope

No roadmap file exists. The items below are **proposed** only because the code already points at them. They are not scheduled.

- Call the saved ChatGPT and Gemini keys from title, script, description, and thumbnail prompt actions, and delete the matching `mockGenerate` branches.
- Either implement YouTube `videos.insert` using the upload scope, or stop requesting that scope and stop describing publish as a step.
- Add a Seedance client or remove it from the pipeline story until one exists.
- Point overview, library, and scheduler at `YoutubeVideo` and `VideoSession` instead of `dashboardContent.ts`.
- Persist settings on `User`.
- Put Cursor generation behind a worker if it should run outside a developer laptop. That design is not started.
- Add plan enforcement only if billing is introduced. Nothing in the repo chooses a processor.
- Replace the landing FAQ so it matches OAuth, mocks, and the demo seed.
- Decide whether Storage buckets should stay public.
- Mount or delete `ChannelAnalyticsPanel` and `/api/vidiq/thumbnails/prompts` so dead paths do not look supported.

Longer direction that the marketing page states, and the code does not implement: multi-seat roles, white-label reports, included generation minutes, and scheduled publish. Those remain marketing until a schema and flow exist.

## Development guidelines

### Conventions in this repo

- TypeScript, strict enough for `tsc` via `tsconfig.json`. Path alias `@/` → `src/`.
- App Router. Server-only modules start with `import "server-only"` when they hold secrets or Prisma (`thumbnails`, `sceneClips`, `vidiq/client`, `elevenlabs/client`).
- Feature folders own contracts, tests, and UI actions: `src/features/<name>/{contract.ts,contract.test.ts,*Actions.tsx}`.
- Domain types for the draft live in `src/lib/videoProject.ts`. Do not invent a second project shape.
- Prisma enums are the server vocabulary (`SUMMARY`). The client uses `StepId` (`summary`). Map them in `src/lib/session/server.ts`.
- Client components are marked `"use client"`. Dashboard pages that read Prisma stay as server components and pass plain data down.
- User-facing copy is in `src/lib/content.ts` (marketing) and `src/lib/dashboardContent.ts` (demo workspace). Product behavior should not be inferred from those files alone.
- Tailwind classes in components. Shared tokens belong in `globals.css`.
- Naming: React components `PascalCase.tsx`, hooks `useX.ts`, route handlers `route.ts`, server actions `actions.ts`.

### Folder rules of thumb

- New provider call: `src/features/<provider>` plus a thin `src/app/api/.../route.ts` that checks auth, origin, and body size.
- New create step field: extend `VideoProject`, the step payload builder, and the sync snapshot together.
- New env var: `.env.example` and this file’s env table. Cursor machine paths go in `config/cursor-cli.local.json` only.

### Testing

`npm test` runs the Node test runner on the files named in `package.json`. Current coverage is contracts and pure functions (session commit, scene split, transcript parsing, clip paths, timing, suggestions, predictive text). There is no browser or Playwright suite in the repo.

`npm run db:test` runs `scripts/test-db.ts`. `npm run lint` runs ESLint. `npm run db:migrate` is `prisma migrate dev`. `npm run db:seed` creates the demo user.

### Git

History is a linear `main` with sentence-style messages (“Enhance …”, “Update …”, “Add …”). No `CONTRIBUTING.md`, branch policy, or PR template is in the repo. Do not commit `config/cursor-cli.local.json` or `src/generated`. `.env` is currently allowed by `.gitignore` on purpose.

### Local run

```bash
npm install
# Postgres URLs and TOKEN_ENCRYPTION_KEY in the environment
npx prisma migrate dev
npm run db:seed   # optional demo user
npm run dev       # http://localhost:3000
```

One-shot Cursor steps also need [config/README.md](config/README.md) and `agent login`. The create agent needs `CURSOR_API_KEY` in the environment and Node `>=22.13`. A vidIQ MCP entry in `~/.cursor/mcp.json` is the development fallback when the app user has not completed vidIQ OAuth.

### Deploy

Railway: push the branch the service builds, `npm run build` (includes `prisma generate`), pre-deploy `npx prisma migrate deploy`, `npm run start`. Set the env vars from the table above on the service. Register the production OAuth redirect URIs. Create the two public Storage buckets before thumbnail or clip upload.

## Glossary

| Term | Meaning here |
| --- | --- |
| Buddy | Floating YouTube-specialist chat. Not the create-step agent |
| Create step | One of summary, title, thumbnail, script, timeline, description, render, editor |
| Video project | Client `VideoProject` draft |
| Video session | Server `VideoSession` row. Same id as the project |
| Step payload | JSON document on `VideoSessionStep` (`schemaVersion` ≥ 1) |
| Active channel | `User.activeChannelId`. The channel new work targets |
| Share | Email grant to use someone else’s connected channel |
| Snapshot | Client payload posted to `/sync` |
| Cursor CLI | Local `agent` binary. Dev-only one-shot generation |
| Cursor SDK agent | In-process local agent for the create panel. Uses `CURSOR_API_KEY` |
| Mark approved | Control that persists the current step |
| Faceless | Marketing term for voice, scenes, and captions without an on-camera host |
| BYOK | Marketing term for the Starter plan. Partially true: some keys can be saved; ElevenLabs is shared; Cursor is local |
| Demo data | Static dashboard numbers, not YouTube Analytics |
| Provider picker | ChatGPT, Gemini, Cursor, or vidIQ on a step. Only some of those run |
