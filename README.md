# Move Daily

**Your plan, one move at a time.** Move Daily is a calm, mobile-first exercise-plan player. It turns two existing routines into paced English guidance with illustrated movement loops, preparation prompts, readiness gates, counters, hold timers, and device-local progress.

> **Release status:** Implemented and live verified. Source is published at [https://github.com/taofeng-sketch/move-daily](https://github.com/taofeng-sketch/move-daily), and production is at [https://taofeng-sketch.github.io/move-daily/](https://taofeng-sketch.github.io/move-daily/).

## Safety boundary

**Illustration only. Follow the plan and guidance given by your physiotherapist.**

**Stop the session if you feel unwell or the movement causes pain, and follow your physiotherapist’s advice.**

Move Daily plays an existing plan. It does not diagnose, prescribe, assess technique, detect repetitions, or replace a physiotherapist. Coach pace and preparation countdowns are interface timing, not prescribed exercise tempo or rest.

## Included routines

- **Back — Most days:** standing reach with knee bends (6 × 3), standing full down and up (8), bridge articulations (10 × 2), cobras on forearms (10), cobras on hands (10), opposite arm and leg Supermans (8 × 2 each side), and foam-roller upper-back extensions (10 × 2).
- **Left Toe — 4× per week:** big-toe lifts (20), banded big-toe pointing (20), heavy-band arch lifts (10 × 3), and single-leg balance (10 or 15 seconds × 4).

The Home and completion screens preserve the written five Back and four Left Toe exercise groups. The player uses seven Back phases where a written exercise changes movement or support.

## What it does

- Starts or resumes a routine with one tap, then pauses at every major position or equipment change until `I’m ready` is pressed.
- Keeps the current exercise, set, side, repetition, hold time, English caption, and next action visible.
- Uses responsive 2D SVG demonstrations, dedicated left-foot close-ups, a segmented Bridge view, and prop-aware band and foam-roller views.
- Offers local English system speech when the browser reports it as local, with synchronized captions and bundled tones as the complete fallback.
- Pauses and saves exact progress when the page is hidden or refreshed; returning always requires an explicit Resume gesture.
- Stores one resumable session, non-clinical preferences, and completion dates on the current device.
- Downloads user-configured calendar reminders; it does not infer reminder days or run a notification service.
- Can be installed and used offline after one successful online load and service-worker activation.
- Supports reduced motion, keyboard navigation, visible focus, text scaling, portrait widths from 320 px, landscape, and muted sessions.

Voice, Wake Lock, persistent storage, installation, and the service worker are progressive enhancements. Losing any of them does not change the routine dose or block the running session. A first-ever offline visit cannot load an app shell that has never been cached.

## Privacy and browser boundary

**No exercise history is sent by this app.** There is no account, backend, analytics, advertising, camera use, microphone use, upload, cloud sync, or third-party embed. GitHub Pages serves the static application files; calendar files and exercise history are created locally.

Local storage keys, service-worker scope, and cache names are namespaced to reduce accidental collisions. GitHub Pages project paths on the same `github.io` origin are not a hostile-security boundary: a compromised same-origin sibling could access origin-level local or cache storage. Stored state is therefore deliberately minimal and non-clinical. A dedicated custom domain is the future hardening path if stronger origin isolation is needed.

Browser storage and an installed home-screen app may not always share history. Install before building a long history if continuity matters, and use `Reset all progress` to remove the Move Daily namespace from the current context.

## Run locally

Requires Node.js 22 and npm 10.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. Useful release commands are:

```bash
npm run build
npm run verify:release
```

`verify:release` runs lint, 320 unit/component checks, a production PWA build, the tracked-source and built-output public-safety scan, and the full Playwright browser matrix.

## Architecture and rationale

The static React/TypeScript app keeps clinical content and dose in validated routine records. A pure serialisable reducer owns session progress. SVG, audio, lifecycle, persistence, reminder, and PWA capabilities sit behind narrow adapters so none can silently advance the plan.

| Name | Description |
| --- | --- |
| [Product and interaction design](docs/superpowers/specs/2026-08-22-move-daily-design.md) | Approved product boundary, exact routine map, screen states, accessibility behavior, ambiguities, and acceptance gates. |
| [Implementation plan](docs/superpowers/plans/2026-08-22-move-daily-implementation.md) | Agent-ready task graph, frozen interfaces, design rationale, test-first steps, and safe publication sequence. |

Key source areas are `src/domain/` for exact routine data, `src/session/` for deterministic progress, `src/coach/` for illustrations, `src/features/` for screens, `src/platform/` for optional browser capabilities, `src/persistence/` for local state, `src/pwa/` for installation/offline behavior, and `e2e/` for browser release checks.

## GitHub Pages release behavior

The Pages workflow runs only from `main` or an explicit manual dispatch. It uses immutable action commits and job-scoped permissions, installs the locked Node dependencies and Chromium, runs `npm run verify:release`, uploads only the freshly built `dist/` directory, and permits deployment only from `main`. The Vite base, manifest, service worker, and assets are configured for `/move-daily/`.

Updates download in the background and remain pending during an active session. Applying an update is an explicit action after leaving the player.

## Schematic artwork and review

Three setup or endpoint details remain deliberately schematic because the written plan does not specify them:

1. the endpoint and knee/spine pattern of standing “all the way down and back up”;
2. the anchor and resistance direction for banded big-toe pointing;
3. the precise loop-band position and pull direction for heavy-band arch lifts.

Supermans alternate opposite sides as a transparent interface convention because the written plan does not specify sequencing. Before any illustration is described as exact technique, a physiotherapist should review all demonstrations, with particular attention to these points plus Bridge articulation, Cobra range, and foam-roller placement.

## Licence

No licence file is included. Public visibility does not grant permission to copy, modify, redistribute, or reuse this project; add a licence deliberately before treating it as open-source software.
