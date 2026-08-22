# Move Daily Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build, verify, and publicly deploy an installable English exercise-coach PWA that plays the supplied Back and Left Toe routines with hybrid 2D demonstrations, guided cues, safe readiness gates, and device-local history.

**Architecture:** A Vite/React/TypeScript static application keeps the clinician-grounded routine data separate from a pure serialisable session reducer. Platform capabilities—speech, tones, Wake Lock, visibility, persistence, installation, and reminders—sit behind narrow adapters so their failure cannot corrupt the routine. Responsive SVG visuals consume a deterministic `0..1` progress value and never control clinical content or session state.

**Tech Stack:** Node 22, npm 10, Vite 8.2, React 19.2, TypeScript 6.0, Vitest 4.1, Testing Library 16.3, Playwright 1.62, vite-plugin-pwa 1.3, SVG, CSS Modules, Web Speech, Web Audio, Screen Wake Lock, Page Visibility, localStorage, GitHub Actions, GitHub Pages.

**Spec:** [`../specs/2026-08-22-move-daily-design.md`](../specs/2026-08-22-move-daily-design.md)

## Global Constraints

- Read [`../../../CLAUDE.md`](../../../CLAUDE.md), the full spec, and the assigned task before editing.
- All user-facing text, captions, accessibility names, and spoken prompts are English.
- Public application content, test fixtures, build output, and product documentation do not identify the exercise participant and contain no clinician name, clinic, address, email, diagnosis, appointment, or source-email text. Normal Git authorship remains Tao Feng, but no content connects the publisher identity to receiving treatment.
- Exercise frequency, dose, setup wording, sides, and hold options come only from the spec. Do not add clinical range, resistance, tempo, rest, pain threshold, progression, form correction, or detection claims.
- `Get ready` and `Coach pace` are interface timing, not clinical prescription. Major position or equipment changes stop at `I’m ready`.
- No backend, account, database, cloud sync, analytics, camera, microphone, ad, third-party embed, CDN, or runtime font request.
- Select only English voices reported by the browser as local. If none exists, captions and bundled tones remain fully functional.
- Page hide or lock saves and pauses; returning always requires an explicit Resume gesture.
- Persist only namespaced routine completion, one resumable session, and non-clinical preferences. Storage failure cannot block a session.
- The built app must work at `/move-daily/`, install from HTTPS, and work offline after one successful online load.
- Support 320, 360, and 390 px portrait widths, landscape, text zoom, keyboard, VoiceOver/TalkBack, muted mode, and reduced motion.
- Use Tao Feng as Git author/committer. Do not add agent attribution to commits, source comments, repository metadata, or public documentation.
- Every task begins with a failing test, ends with task-scoped tests plus `npm run check`, and produces one focused commit.

## Agent Collaboration Contract

The plan is deliberately structured for Codex, Cursor/“Curse,” Claude, or another agent to take one task without reconstructing product intent.

1. The root agent owns checkbox state, integration decisions, and final deployment.
2. A worker owns only the files listed under its task. If an interface must change, stop and message the root agent before editing a neighbouring task’s files.
3. Public interfaces in each task’s `Produces` block are frozen once that task is accepted. Later tasks consume those exact names and types.
4. Each worker reports: files changed, test commands and results, commit hash, and any spec ambiguity. “Looks good” is not a handoff.
5. Each task receives two review gates before merge: spec compliance first, then code quality.
6. Never stage or commit unrelated workspace changes. This directory is an independent repository.
7. Run tasks in this dependency order:

```text
Task 1 foundation
  ├─ Task 2 routine contract ─ Task 3 session engine ─ Task 4 persistence
  ├─ Task 5 platform adapters
  ├─ Task 6 coach runtime ─┬─ Task 7 back visuals
  │                        └─ Task 8 toe visuals
  └─ Task 12 PWA/deployment foundation

Tasks 2–8 and 12 converge into Task 9 player
Tasks 2, 4, and 9 feed Task 10 home/completion
Tasks 4, 5, and 12 feed Task 11 settings/reminders
Tasks 9–12 feed Task 13 integration/polish
Task 13 feeds Task 14 release/deployment
```

Tasks 2, 5, 6, and 12 may run in parallel after Task 1. Tasks 7 and 8 may run in parallel after Task 6. Do not parallelise tasks that modify the same file.

## Locked File Map

```text
index.html                         document shell and metadata
package.json                       scripts and pinned dependency ranges
vite.config.ts                     Vite, Vitest, base path, and PWA configuration
playwright.config.ts               browser projects and preview server
src/app/App.tsx                    top-level screen orchestration only
src/app/App.module.css             top-level layout only
src/domain/routine.ts              routine and dose types
src/domain/routines.ts             exact public-safe routine records
src/domain/routines.test.ts        dose/content contract
src/session/session.ts             serialisable state and event types
src/session/reducer.ts             pure transition logic
src/session/reducer.test.ts        state-machine contract
src/persistence/appState.ts        versioned persisted model and migrations
src/persistence/storage.ts         localStorage adapter
src/persistence/*.test.ts          persistence/history contract
src/platform/audio/*               local speech and bundled tone adapters
src/platform/lifecycle/*           visibility and Wake Lock adapters
src/coach/runtime/*                deterministic progress clock and SVG primitives
src/coach/back/*                   five Back visual families
src/coach/toe/*                    four Left Toe visual families
src/features/player/*              session controller and player UI
src/features/home/*                home cards and weekly history
src/features/completion/*          honest completed/skipped summary
src/features/settings/*            preferences, privacy, safety, reset, install help
src/features/reminders/*           local calendar generation
src/pwa/*                          installation/update helpers and offline state
src/styles/*                       tokens, reset, typography, shared utilities
e2e/*                              end-to-end and accessibility scenarios
public/icons/*                     bundled PWA icons
.github/workflows/pages.yml        check/build/deploy workflow
scripts/scan-public-content.mjs     prohibited-identifier and secret scan
README.md                          public-safe product/run/deploy documentation
```

---

### Task 1: Repository Foundation and Quality Gates

**Files:**
- Create: `package.json`
- Create: `package-lock.json` via `npm install`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `eslint.config.js`
- Create: `vite.config.ts`
- Create: `playwright.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/test/setup.ts`
- Create: `.gitignore`

**Interfaces:**
- Consumes: approved design spec and Node/npm versions recorded above.
- Produces: `App(): JSX.Element`; npm scripts `dev`, `build`, `preview`, `lint`, `test`, `test:watch`, `test:e2e`, and `check`; Vitest/jsdom test environment; Vite base `/move-daily/`.

- [x] **Step 1: Write the failing application smoke test**

```tsx
// src/app/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the public product name and English promise', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Move Daily' })).toBeVisible();
    expect(screen.getByText('Your plan, one move at a time.')).toBeVisible();
  });
});
```

- [x] **Step 2: Run the smoke test and observe the missing module failure**

Run: `npm test -- src/app/App.test.tsx`
Expected: FAIL because the repository has no package manifest or `App` module.

- [x] **Step 3: Create the pinned project manifest**

```json
{
  "name": "move-daily",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "npm run lint && npm test && npm run build"
  },
  "dependencies": {
    "@fontsource-variable/atkinson-hyperlegible-next": "^5.3.0",
    "@fontsource-variable/bricolage-grotesque": "^5.3.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@playwright/test": "^1.62.1",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^26.2.0",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@vitejs/plugin-react": "^6.1.0",
    "eslint": "^10.9.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.4",
    "globals": "^17.11.0",
    "jsdom": "^30.0.1",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.67.0",
    "vite": "^8.2.2",
    "vite-plugin-pwa": "^1.3.0",
    "vitest": "^4.1.11"
  }
}
```

Run: `npm install`
Expected: `package-lock.json` is created without peer-dependency errors.

- [x] **Step 4: Add TypeScript, lint, test, and browser configuration**

```ts
// vite.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/move-daily/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:4173/move-daily/' },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/move-daily/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'mobile-390', use: { ...devices['iPhone 14'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

Use these project-reference settings:

```json
// tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

```json
// tsconfig.node.json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["vite.config.ts", "playwright.config.ts", "pwa-assets.config.ts"]
}
```

```js
// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'artifacts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
);
```

Add `import '@testing-library/jest-dom/vitest';` to `src/test/setup.ts`.

- [x] **Step 5: Add the smallest English application shell and design tokens**

```tsx
// src/app/App.tsx
export function App() {
  return (
    <main>
      <h1>Move Daily</h1>
      <p>Your plan, one move at a time.</p>
    </main>
  );
}
```

```css
/* src/styles/tokens.css */
:root {
  --paper: #f4f0e7;
  --paper-raised: #fffdf7;
  --ink: #17201d;
  --ink-muted: #5f6964;
  --coach: #57a8c4;
  --coach-deep: #1d647d;
  --action: #f06b3e;
  --action-dark: #b83e1f;
  --line: #cad1c9;
  --success: #287a59;
  --focus: #153f9e;
  --radius-sm: 0.75rem;
  --radius-lg: 1.5rem;
  --shadow-card: 0 1rem 3rem rgb(23 32 29 / 10%);
  --font-display: 'Bricolage Grotesque Variable', sans-serif;
  --font-body: 'Atkinson Hyperlegible Next Variable', sans-serif;
}
```

Import both bundled variable fonts, `tokens.css`, and `global.css` from `src/main.tsx`. Mount `<App />` under `React.StrictMode`. Keep `global.css` limited to reset, typography, body background, focus visibility, safe-area variables, and reduced decorative motion.

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
artifacts/
.env
.env.*
.DS_Store
```

- [x] **Step 6: Run the foundation checks**

Run: `npm test -- src/app/App.test.tsx && npm run lint && npm run build`
Expected: all commands PASS and `dist/index.html` references assets beneath `/move-daily/`.

- [x] **Step 7: Commit the foundation**

```bash
git add package.json package-lock.json tsconfig*.json eslint.config.js vite.config.ts playwright.config.ts index.html src .gitignore
git commit -m "build: establish Move Daily app foundation"
```

---

### Task 2: Routine Contract and Exact Plan Data

**Files:**
- Create: `src/domain/routine.ts`
- Create: `src/domain/routines.ts`
- Create: `src/domain/routines.test.ts`

**Interfaces:**
- Consumes: no earlier domain interface.
- Produces: `RoutineId`, `ExerciseId`, `PhaseId`, `VisualId`, `CoachPace`, `RepDose`, `HoldDose`, `RoutinePhase`, `Routine`; constants `ROUTINES`, `ROUTINE_BY_ID`; functions `getRoutine(id: RoutineId): Routine`, `getCycleMs(phase: RoutinePhase, pace: CoachPace): number`, and `assertRoutineIntegrity(routines: readonly Routine[]): void`.

- [x] **Step 1: Write a failing dose-and-content contract test**

```ts
// src/domain/routines.test.ts
import { describe, expect, it } from 'vitest';
import { getRoutine, ROUTINES } from './routines';

describe('public routine contract', () => {
  it('contains the exact routine frequencies and eleven player phases', () => {
    expect(ROUTINES.map(({ id, frequency }) => [id, frequency])).toEqual([
      ['back', 'Most days'],
      ['left-toe', '4× per week'],
    ]);
    expect(ROUTINES.flatMap((routine) => routine.phases)).toHaveLength(11);
  });

  it('preserves every prescribed dose without adding one', () => {
    const dose = Object.fromEntries(
      ROUTINES.flatMap((routine) => routine.phases).map((phase) => [phase.id, phase.dose]),
    );
    expect(dose).toEqual({
      'standing-knee-bends': { kind: 'reps', reps: 6, sets: 3, sideMode: 'none' },
      'standing-full-down-up': { kind: 'reps', reps: 8, sets: 1, sideMode: 'none' },
      'bridge-articulations': { kind: 'reps', reps: 10, sets: 2, sideMode: 'none' },
      'cobra-forearms': { kind: 'reps', reps: 10, sets: 1, sideMode: 'none' },
      'cobra-hands': { kind: 'reps', reps: 10, sets: 1, sideMode: 'none' },
      supermans: { kind: 'reps', reps: 8, sets: 2, sideMode: 'alternating-pairs' },
      'foam-roller-extensions': { kind: 'reps', reps: 10, sets: 2, sideMode: 'none' },
      'big-toe-lifts': { kind: 'reps', reps: 20, sets: 1, sideMode: 'none' },
      'banded-toe-pointing': { kind: 'reps', reps: 20, sets: 1, sideMode: 'none' },
      'band-arch-lifts': { kind: 'reps', reps: 10, sets: 3, sideMode: 'none' },
      'single-leg-balance': { kind: 'hold', seconds: [10, 15], sets: 4 },
    });
  });

  it('keeps public data free of personal or clinic identifiers', () => {
    const serialised = JSON.stringify(getRoutine('back'));
    expect(serialised).not.toMatch(/patient|clinic|diagnosis|appointment|@/i);
  });
});
```

- [x] **Step 2: Run the domain test and confirm it fails**

Run: `npm test -- src/domain/routines.test.ts`
Expected: FAIL because `routine.ts` and `routines.ts` do not exist.

- [x] **Step 3: Define the frozen routine interfaces**

```ts
// src/domain/routine.ts
export type RoutineId = 'back' | 'left-toe';

export type ExerciseId =
  | 'standing-reach'
  | 'bridge-articulations'
  | 'cobras'
  | 'supermans'
  | 'foam-roller-extensions'
  | 'big-toe-lifts'
  | 'banded-toe-pointing'
  | 'band-arch-lifts'
  | 'single-leg-balance';

export type PhaseId =
  | 'standing-knee-bends'
  | 'standing-full-down-up'
  | 'bridge-articulations'
  | 'cobra-forearms'
  | 'cobra-hands'
  | 'supermans'
  | 'foam-roller-extensions'
  | 'big-toe-lifts'
  | 'banded-toe-pointing'
  | 'band-arch-lifts'
  | 'single-leg-balance';

export type VisualId =
  | 'standing-reach'
  | 'bridge'
  | 'cobra-forearms'
  | 'cobra-hands'
  | 'superman'
  | 'foam-roller'
  | 'big-toe'
  | 'banded-toe'
  | 'arch-lift'
  | 'balance';

export type CoachPace = 'slow' | 'standard' | 'brisk';
export type SideMode = 'none' | 'alternating-pairs';

export interface RepDose {
  readonly kind: 'reps';
  readonly reps: number;
  readonly sets: number;
  readonly sideMode: SideMode;
}

export interface HoldDose {
  readonly kind: 'hold';
  readonly seconds: readonly [10, 15];
  readonly sets: 4;
}

export interface RoutinePhase {
  readonly id: PhaseId;
  readonly exerciseId: ExerciseId;
  readonly name: string;
  readonly visual: VisualId;
  readonly setupCues: readonly string[];
  readonly movementCues: readonly string[];
  readonly dose: RepDose | HoldDose;
  readonly coachCycleMs: number;
  readonly readyGate: boolean;
  readonly equipment: readonly string[];
  readonly ambiguityNote?: string;
}

export interface Routine {
  readonly id: RoutineId;
  readonly name: 'Back' | 'Left Toe';
  readonly frequency: 'Most days' | '4× per week';
  readonly equipment: readonly string[];
  readonly phases: readonly RoutinePhase[];
}
```

- [x] **Step 4: Add all eleven public-safe phase records**

In `src/domain/routines.ts`, export `ROUTINES` with the exact names, setup cues, movement cues, dose, visual mapping, and ambiguity notes from spec §10. Set these interface-only coach cycles:

| Phase | `coachCycleMs` |
| --- | ---: |
| standing knee bends | 4000 |
| standing full down/up | 5000 |
| bridge articulation | 6000 |
| each cobra phase | 4500 |
| Superman pair | 5000 |
| foam-roller extension | 5000 |
| big-toe lift | 3000 |
| banded toe pointing | 3000 |
| arch lift | 4000 |
| balance | 1000; hold duration comes from the chosen 10/15 seconds |

Use `ambiguityNote` only for standing full down/up, banded toe pointing, arch lift, and alternating Superman order. Use the plan’s “Illustration only” boundary in UI, not repeated inside every phase record.

```ts
export const PACE_MULTIPLIER: Readonly<Record<CoachPace, number>> = {
  slow: 1.3,
  standard: 1,
  brisk: 0.8,
};

export function getCycleMs(phase: RoutinePhase, pace: CoachPace): number {
  return Math.round(phase.coachCycleMs * PACE_MULTIPLIER[pace]);
}
```

- [x] **Step 5: Add integrity checks that reject accidental clinical drift**

`assertRoutineIntegrity` must throw if routine IDs or phase IDs repeat; exercise grouping does not resolve to exactly five Back and four Left Toe exercises; reps, sets, or cycle times are non-positive; a hold offers anything except `[10, 15]`; a cue is empty; a phase visual is missing; or a routine has no phases. Call it once after defining `ROUTINES` so development fails immediately on malformed data.

- [x] **Step 6: Run the domain checks**

Run: `npm test -- src/domain/routines.test.ts && npm run check`
Expected: all tests PASS; the snapshot contains eleven phases and the exact prescribed doses.

- [x] **Step 7: Commit the routine contract**

```bash
git add src/domain
git commit -m "feat: encode clinician-grounded routines"
```

---

### Task 3: Deterministic Session State Machine

**Files:**
- Create: `src/session/session.ts`
- Create: `src/session/reducer.ts`
- Create: `src/session/reducer.test.ts`
- Create: `src/session/selectors.ts`

**Interfaces:**
- Consumes: `RoutineId`, `PhaseId`, `CoachPace`, `Routine`, `RoutinePhase`, `getRoutine` from Task 2.
- Produces: `SessionStatus`, `SessionState`, `SessionEvent`, `createSession(routineId, preferences): SessionState`, `sessionReducer(state, event): SessionState`, `getCurrentPhase(state): RoutinePhase`, `isSessionFullyComplete(state): boolean`, and `getSessionSummary(state): SessionSummary`.

- [x] **Step 1: Write failing transition tests**

```ts
// src/session/reducer.test.ts
import { describe, expect, it } from 'vitest';
import { createSession, sessionReducer } from './reducer';

describe('sessionReducer', () => {
  it('uses a readiness gate and five-second preparation before movement', () => {
    let state = createSession('back', { coachPace: 'standard', balanceSeconds: 10 });
    expect(state.status).toBe('awaiting-ready');
    state = sessionReducer(state, { type: 'READY' });
    expect(state).toMatchObject({ status: 'preparing', remainingMs: 5000 });
    state = sessionReducer(state, { type: 'PREPARATION_FINISHED' });
    expect(state.status).toBe('active');
  });

  it('advances only after the exact number of coach cycles', () => {
    let state = createSession('back', { coachPace: 'standard', balanceSeconds: 10 });
    state = sessionReducer(state, { type: 'READY' });
    state = sessionReducer(state, { type: 'PREPARATION_FINISHED' });
    for (let index = 0; index < 6; index += 1) {
      state = sessionReducer(state, { type: 'CYCLE_FINISHED' });
    }
    expect(state).toMatchObject({ status: 'set-transition', setIndex: 1, rep: 0 });
  });

  it('pauses without consuming progress and resumes through a countdown', () => {
    let state = createSession('left-toe', { coachPace: 'slow', balanceSeconds: 15 });
    state = sessionReducer(state, { type: 'READY' });
    state = sessionReducer(state, { type: 'PREPARATION_FINISHED' });
    state = sessionReducer(state, { type: 'CYCLE_FINISHED' });
    const paused = sessionReducer(state, { type: 'PAUSE', reason: 'background' });
    expect(paused).toMatchObject({ status: 'paused', rep: 1, pauseReason: 'background' });
    expect(sessionReducer(paused, { type: 'RESUME' })).toMatchObject({
      status: 'preparing',
      remainingMs: 3000,
      rep: 1,
    });
  });
});
```

- [x] **Step 2: Run the reducer test and confirm it fails**

Run: `npm test -- src/session/reducer.test.ts`
Expected: FAIL because the session modules do not exist.

- [x] **Step 3: Define the serialisable state and exhaustive event union**

```ts
// src/session/session.ts
import type { CoachPace, PhaseId, RoutineId } from '../domain/routine';

export type SessionStatus =
  | 'awaiting-ready'
  | 'preparing'
  | 'active'
  | 'set-transition'
  | 'phase-transition'
  | 'paused'
  | 'replay'
  | 'complete';

export interface SessionPreferences {
  readonly coachPace: CoachPace;
  readonly balanceSeconds: 10 | 15;
}

export interface SessionState {
  readonly version: 1;
  readonly routineId: RoutineId;
  readonly status: SessionStatus;
  readonly phaseIndex: number;
  readonly setIndex: number;
  readonly rep: number;
  readonly rightCount: number;
  readonly leftCount: number;
  readonly remainingMs: number | null;
  readonly preferences: SessionPreferences;
  readonly skippedPhaseIds: readonly PhaseId[];
  readonly completedPhaseIds: readonly PhaseId[];
  readonly resumeStatus: Exclude<SessionStatus, 'paused' | 'complete'> | null;
  readonly pauseReason: 'user' | 'background' | null;
}

export type SessionEvent =
  | { readonly type: 'READY' }
  | { readonly type: 'START_NOW' }
  | { readonly type: 'PREPARATION_FINISHED' }
  | { readonly type: 'CYCLE_FINISHED' }
  | { readonly type: 'HOLD_FINISHED' }
  | { readonly type: 'TRANSITION_FINISHED' }
  | { readonly type: 'PAUSE'; readonly reason: 'user' | 'background' }
  | { readonly type: 'RESUME' }
  | { readonly type: 'REPLAY_DEMO' }
  | { readonly type: 'REPLAY_FINISHED' }
  | { readonly type: 'DECREMENT_REP' }
  | { readonly type: 'RESTART_SET' }
  | { readonly type: 'SKIP_PHASE' }
  | { readonly type: 'SET_COACH_PACE'; readonly pace: CoachPace };
```

- [x] **Step 4: Implement the pure transition rules**

Implement `createSession` and an exhaustive `switch (event.type)` in `reducer.ts` with these exact rules:

- First state is `awaiting-ready`, phase/set/rep indices are zero.
- `READY` uses 5000 ms; `RESUME` uses 3000 ms; `START_NOW` enters `active` immediately.
- Rep phases advance on `CYCLE_FINISHED`. Hold phases advance only on `HOLD_FINISHED`.
- Superman alternates and increments right/left counters until each reaches 8, then advances the set; the UI labels the pair explicitly.
- A remaining set enters `set-transition` with an 8000 ms interface transition countdown. `READY`, `START_NOW`, or `TRANSITION_FINISHED` leads to `preparing` with 5000 ms. This is labelled preparation time, not prescribed rest.
- A next phase with `readyGate: true` enters `phase-transition`, then `awaiting-ready`. No major setup auto-starts.
- Pause copies the running status into `resumeStatus`; Resume preserves all counts.
- Replay preserves all counts and returns through a 3000 ms preparation.
- Decrement never goes below zero. Restart set resets only the current set’s counters.
- `SET_COACH_PACE` updates only the visual pacing preference and preserves phase/set/rep progress.
- Skip records the current phase ID, never adds it to completed IDs, and advances safely.
- The final phase enters `complete`; a session with any skipped phase is not fully complete.
- Invalid events for the current state return the original state rather than guessing.

Use a `never` exhaustiveness assertion so a new event cannot compile without a transition decision.

- [x] **Step 5: Add selectors and full-sequence tests**

`SessionSummary` is:

```ts
export interface SessionSummary {
  readonly completed: number;
  readonly skipped: number;
  readonly total: number;
  readonly label: 'Session complete' | 'Session saved';
}
```

Add tests that drive the entire Back and Left Toe routines using events generated from each phase dose. Assert exact phase order, set count, alternating Superman counts, chosen 10/15-second balance value, five/four exercise-group summaries, skipped summary wording, `DECREMENT_REP`, `RESTART_SET`, pace change without lost progress, and no implicit advancement from a readiness gate.

- [x] **Step 6: Run state-machine checks**

Run: `npm test -- src/session && npm run check`
Expected: all reducer and sequence tests PASS with no real timers or DOM dependency.

- [x] **Step 7: Commit the state machine**

```bash
git add src/session
git commit -m "feat: add deterministic session engine"
```

---

### Task 4: Versioned Local Persistence and Weekly History

**Files:**
- Create: `src/persistence/appState.ts`
- Create: `src/persistence/storage.ts`
- Create: `src/persistence/storage.test.ts`
- Create: `src/persistence/history.ts`
- Create: `src/persistence/history.test.ts`

**Interfaces:**
- Consumes: `RoutineId`, `CoachPace`, `PhaseId`, `SessionState`, `SessionSummary` from Tasks 2–3.
- Produces: `APP_STORAGE_KEY`, `Preferences`, `CompletionRecord`, `PersistedAppState`, `DEFAULT_APP_STATE`, `loadAppState(storage?): LoadResult`, `saveAppState(state, storage?): SaveResult`, `clearAppState(storage?): SaveResult`, `recordSession(appState, session, localDate): PersistedAppState`, `getWeeklyProgress(records, weekStart): WeeklyProgress`, and `safeLocalDate(date): string`.

- [x] **Step 1: Write failing storage and history tests**

```ts
// src/persistence/storage.test.ts
import { describe, expect, it } from 'vitest';
import { APP_STORAGE_KEY, loadAppState, saveAppState } from './storage';
import { DEFAULT_APP_STATE } from './appState';

describe('local app state', () => {
  it('uses a versioned namespaced key', () => {
    expect(APP_STORAGE_KEY).toBe('move-daily:app-state:v1');
  });

  it('continues without persistence when storage throws', () => {
    const failingStorage = {
      getItem: () => { throw new DOMException('blocked'); },
      setItem: () => { throw new DOMException('blocked'); },
      removeItem: () => { throw new DOMException('blocked'); },
    };
    expect(loadAppState(failingStorage)).toEqual({ state: DEFAULT_APP_STATE, available: false });
    expect(saveAppState(DEFAULT_APP_STATE, failingStorage)).toEqual({ ok: false });
  });
});
```

```ts
// src/persistence/history.test.ts
import { describe, expect, it } from 'vitest';
import { getWeeklyProgress } from './history';

describe('weekly progress', () => {
  it('counts completed toe routines but does not invent a Back target', () => {
    const progress = getWeeklyProgress([
      { id: 'a', routineId: 'left-toe', localDate: '2026-08-18', outcome: 'complete' },
      { id: 'b', routineId: 'left-toe', localDate: '2026-08-20', outcome: 'complete' },
      { id: 'c', routineId: 'back', localDate: '2026-08-21', outcome: 'complete' },
    ], '2026-08-17');
    expect(progress).toEqual({ backCompletedDates: ['2026-08-21'], toeCompleted: 2, toeTarget: 4 });
  });
});
```

- [x] **Step 2: Run persistence tests and confirm they fail**

Run: `npm test -- src/persistence`
Expected: FAIL because persistence modules do not exist.

- [x] **Step 3: Define the persisted model**

```ts
// src/persistence/appState.ts
import type { CoachPace, RoutineId } from '../domain/routine';
import type { SessionState } from '../session/session';

export interface Preferences {
  readonly voiceEnabled: boolean;
  readonly coachPace: CoachPace;
  readonly balanceSeconds: 10 | 15;
  readonly reducedMotion: boolean;
  readonly installEducationDismissed: boolean;
  readonly reminderEducationDismissed: boolean;
}

export interface CompletionRecord {
  readonly id: string;
  readonly routineId: RoutineId;
  readonly localDate: string;
  readonly outcome: 'complete' | 'saved-with-skips';
}

export interface PersistedAppState {
  readonly version: 1;
  readonly preferences: Preferences;
  readonly activeSession: SessionState | null;
  readonly history: readonly CompletionRecord[];
}

export interface LoadResult {
  readonly state: PersistedAppState;
  readonly available: boolean;
  readonly recoveredFromCorruption?: boolean;
}

export interface SaveResult {
  readonly ok: boolean;
}

export interface WeeklyProgress {
  readonly backCompletedDates: readonly string[];
  readonly toeCompleted: number;
  readonly toeTarget: 4;
}
```

Set `DEFAULT_APP_STATE` to voice on, standard coach pace, 10-second balance, reduced motion false, and both education flags false. On first load, Task 13 changes reduced motion to true when the OS media query requests it. Keep only the most recent 180 completion records and one active session.

- [x] **Step 4: Implement guarded storage and validation**

The adapter accepts a `Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>` dependency for tests. Parse JSON inside `try/catch`; accept only `version === 1`, known routine IDs, valid preferences, and structurally valid session/history records. A corrupt record returns defaults with `{ available: true, recoveredFromCorruption: true }` and removes only `move-daily:app-state:v1` on the next successful save.

- [x] **Step 5: Implement honest history recording**

`recordSession(appState, session, localDate)` writes `complete` only when `isSessionFullyComplete(session)` is true; otherwise it writes `saved-with-skips`. Its deterministic record ID is `${routineId}:${localDate}:${outcome}`. Deduplicate a completed routine on the same local date. `getWeeklyProgress` counts only `complete` outcomes, returns seven Back date slots, and returns the toe `completed/4` count without declaring a Back target.

- [x] **Step 6: Run persistence checks**

Run: `npm test -- src/persistence && npm run check`
Expected: PASS for normal, blocked, corrupt, same-day duplicate, skipped, 180-record cap, and week-boundary cases.

- [x] **Step 7: Commit persistence**

```bash
git add src/persistence
git commit -m "feat: keep progress safely on device"
```

---

### Task 5: Speech, Tone, Wake Lock, and Visibility Adapters

**Files:**
- Create: `src/platform/audio/coachAudio.ts`
- Create: `src/platform/audio/localSpeech.ts`
- Create: `src/platform/audio/localSpeech.test.ts`
- Create: `src/platform/audio/tone.ts`
- Create: `src/platform/audio/tone.test.ts`
- Create: `src/platform/lifecycle/wakeLock.ts`
- Create: `src/platform/lifecycle/wakeLock.test.ts`
- Create: `src/platform/lifecycle/visibility.ts`
- Create: `src/platform/lifecycle/visibility.test.ts`

**Interfaces:**
- Consumes: English cue strings from Task 2; no session mutation interface.
- Produces: `CoachAudio`, `createCoachAudio(deps?): CoachAudio`, `chooseLocalEnglishVoice(voices): SpeechSynthesisVoice | null`, `WakeLockController`, `createWakeLockController(navigatorLike?): WakeLockController`, and `observeVisibility(documentLike, callbacks): () => void`.

- [x] **Step 1: Write failing local-voice and cancellation tests**

```ts
// src/platform/audio/localSpeech.test.ts
import { describe, expect, it, vi } from 'vitest';
import { chooseLocalEnglishVoice, createLocalSpeech } from './localSpeech';

describe('local English speech', () => {
  it('rejects remote voices and prefers en-GB when local', () => {
    const voices = [
      { lang: 'en-US', localService: false, name: 'Remote' },
      { lang: 'fr-FR', localService: true, name: 'French' },
      { lang: 'en-GB', localService: true, name: 'British' },
    ] as SpeechSynthesisVoice[];
    expect(chooseLocalEnglishVoice(voices)?.name).toBe('British');
  });

  it('cancels stale speech before a new state cue', () => {
    const synthesis = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] };
    const speech = createLocalSpeech({ synthesis });
    speech.cancel();
    expect(synthesis.cancel).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 2: Run platform tests and confirm they fail**

Run: `npm test -- src/platform`
Expected: FAIL because the platform modules do not exist.

- [x] **Step 3: Define the audio boundary and local-speech selection**

```ts
// src/platform/audio/coachAudio.ts
export type ToneKind = 'count' | 'start' | 'complete' | 'warning';

export interface CoachAudio {
  readonly speechAvailable: boolean;
  unlock(): Promise<void>;
  speak(text: string): void;
  tone(kind: ToneKind): void;
  cancel(): void;
  dispose(): void;
}
```

`chooseLocalEnglishVoice` filters `voice.localService === true` and `voice.lang.toLowerCase().startsWith('en')`, then prefers `en-GB`, falls back to another local English voice, and otherwise returns `null`. Listen for `voiceschanged` because the first `getVoices()` call may be empty. `speak` cancels stale utterances, uses the selected local voice, and no-ops when none exists.

- [x] **Step 4: Generate deterministic bundled tones without network assets**

Use an injected `AudioContext` factory. `unlock` creates/resumes the context from the Start gesture. `tone` creates a short oscillator/gain envelope with these mappings:

```ts
export const TONE_PROFILE = {
  count: { frequency: 520, durationMs: 70 },
  start: { frequency: 740, durationMs: 120 },
  complete: { frequency: 880, durationMs: 180 },
  warning: { frequency: 260, durationMs: 180 },
} as const;
```

Tests inject a fake context and assert no tone is attempted before unlock, the expected frequency is used, and `dispose` closes the context.

- [x] **Step 5: Implement capability-safe Wake Lock**

```ts
export interface WakeLockController {
  readonly active: boolean;
  request(): Promise<boolean>;
  release(): Promise<void>;
}
```

`request` catches unsupported, rejected, low-power, and released-sentinel paths and returns `false`; it never throws into UI. `release` is idempotent. Tests cover unsupported navigator, successful request, rejected request, and release.

- [x] **Step 6: Implement visibility observation**

```ts
export interface VisibilityCallbacks {
  onHidden(): void;
  onVisible(): void;
}

export function observeVisibility(
  documentLike: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>,
  callbacks: VisibilityCallbacks,
): () => void;
```

On `hidden`, invoke only `onHidden`; on `visible`, invoke only `onVisible`. Return an unsubscribe function. Do not auto-resume or request Wake Lock inside this adapter—the session controller decides after a user gesture.

- [x] **Step 7: Run platform checks**

Run: `npm test -- src/platform && npm run check`
Expected: PASS with remote speech rejected, queue cancellation verified, capability failures contained, and visibility callbacks deterministic.

- [x] **Step 8: Commit platform adapters**

```bash
git add src/platform
git commit -m "feat: add resilient coaching platform adapters"
```

---

### Task 6: Deterministic Coach Runtime and Shared SVG Primitives

**Files:**
- Create: `src/coach/runtime/coach.ts`
- Create: `src/coach/runtime/math.ts`
- Create: `src/coach/runtime/math.test.ts`
- Create: `src/coach/runtime/useCoachCycle.ts`
- Create: `src/coach/runtime/useCoachCycle.test.tsx`
- Create: `src/coach/runtime/CoachSvg.tsx`
- Create: `src/coach/runtime/primitives.tsx`
- Create: `src/coach/runtime/CoachStage.module.css`

**Interfaces:**
- Consumes: `VisualId` and cycle duration from Task 2; `running` derived later by Task 9.
- Produces: `CoachVisualProps`, `CoachCycleOptions`, `useCoachCycle(options): CoachCycleState`, `lerp`, `easeInOut`, `pulse`, `CoachSvg`, `Limb`, `Joint`, `Ground`, `Mat`, `Roller`, `Band`, `MotionArrow`, and `PoseLabel`.

- [x] **Step 1: Write failing interpolation and cycle tests**

```ts
// src/coach/runtime/math.test.ts
import { describe, expect, it } from 'vitest';
import { easeInOut, lerp, pulse } from './math';

describe('coach animation math', () => {
  it('interpolates and returns to the start across one cycle', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(pulse(0)).toBe(0);
    expect(pulse(0.5)).toBe(1);
    expect(pulse(1)).toBe(0);
  });
});
```

```tsx
// src/coach/runtime/useCoachCycle.test.tsx
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCoachCycle } from './useCoachCycle';

describe('useCoachCycle', () => {
  it('does not advance while paused and emits one completion per cycle', () => {
    const onCycleComplete = vi.fn();
    const { result, rerender } = renderHook(
      ({ running }) => useCoachCycle({ durationMs: 1000, running, onCycleComplete }),
      { initialProps: { running: false } },
    );
    expect(result.current.progress).toBe(0);
    rerender({ running: true });
    act(() => vi.advanceTimersByTime(1000));
    expect(onCycleComplete).toHaveBeenCalledOnce();
  });
});
```

Configure this suite with fake timers and a requestAnimationFrame shim in the test file.

- [x] **Step 2: Run coach-runtime tests and confirm they fail**

Run: `npm test -- src/coach/runtime`
Expected: FAIL because runtime files do not exist.

- [x] **Step 3: Define the visual contract**

```ts
// src/coach/runtime/coach.ts
import type { PhaseId, VisualId } from '../../domain/routine';

export interface CoachVisualProps {
  readonly phaseId: PhaseId;
  readonly visualId: VisualId;
  readonly progress: number;
  readonly reducedMotion: boolean;
  readonly preview: boolean;
}

export interface CoachCycleOptions {
  readonly durationMs: number;
  readonly running: boolean;
  readonly onCycleComplete(): void;
}

export interface CoachCycleState {
  readonly progress: number;
  readonly cycle: number;
  reset(): void;
}
```

- [x] **Step 4: Implement monotonic animation progress**

`useCoachCycle` uses `performance.now()` and requestAnimationFrame while `running`. It derives progress from elapsed visible foreground time, calls `onCycleComplete` exactly once per completed cycle, carries overflow into the next cycle, and cancels the frame when paused/unmounted. `reset` returns progress/cycle to zero. It never reads session data or writes a rep count.

For reduced motion, Task 9 passes `running: false`; the visual receives static progress `0` and renders start/end cards rather than running the clock.

- [x] **Step 5: Add accessible SVG primitives**

```tsx
export function CoachSvg({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 280" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      {children}
    </svg>
  );
}
```

Implement capsule-like `Limb`, circular `Joint`, `Ground`, `Mat`, `Roller`, `Band`, arrow, and non-colour `PoseLabel` primitives. All coordinates are passed as props; primitives do not know exercise names. Set `vectorEffect="non-scaling-stroke"` where appropriate. Decorative arrows inside an already labelled SVG use `aria-hidden="true"`.

- [x] **Step 6: Run coach-runtime checks**

Run: `npm test -- src/coach/runtime && npm run check`
Expected: interpolation, pause, resume, reset, overflow, cleanup, and primitive accessibility tests PASS.

- [x] **Step 7: Commit the coach runtime**

```bash
git add src/coach/runtime
git commit -m "feat: add deterministic SVG coach runtime"
```

---

### Task 7: Back Routine Coach Visuals

**Files:**
- Create: `src/coach/back/StandingReachCoach.tsx`
- Create: `src/coach/back/BridgeCoach.tsx`
- Create: `src/coach/back/CobraCoach.tsx`
- Create: `src/coach/back/SupermanCoach.tsx`
- Create: `src/coach/back/FoamRollerCoach.tsx`
- Create: `src/coach/back/BackCoach.tsx`
- Create: `src/coach/back/BackCoach.test.tsx`
- Create: `src/coach/back/backCoach.module.css`

**Interfaces:**
- Consumes: `CoachVisualProps`, math helpers, and SVG primitives from Task 6; Back `PhaseId` and `VisualId` values from Task 2.
- Produces: `BackCoach(props: CoachVisualProps): JSX.Element`; one accessible SVG or reduced-motion pose panel for every Back phase.

- [x] **Step 1: Write failing visual-semantic tests**

```tsx
// src/coach/back/BackCoach.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BackCoach } from './BackCoach';

describe('BackCoach', () => {
  it.each([
    ['standing-knee-bends', 'standing-reach', 'Standing reach with knee bends'],
    ['standing-full-down-up', 'standing-reach', 'Standing reach all the way down and back up'],
    ['bridge-articulations', 'bridge', 'Bridge articulation from hips to spine'],
    ['cobra-forearms', 'cobra-forearms', 'Cobra supported on forearms'],
    ['cobra-hands', 'cobra-hands', 'Larger cobra extension supported on hands'],
    ['supermans', 'superman', 'Opposite arm and leg Superman'],
    ['foam-roller-extensions', 'foam-roller', 'Upper-back extension over a foam roller'],
  ] as const)('labels %s without claiming form correction', (phaseId, visualId, label) => {
    render(<BackCoach phaseId={phaseId} visualId={visualId} progress={0.5} reducedMotion={false} preview={false} />);
    expect(screen.getByRole('img', { name: label })).toBeVisible();
    expect(document.body.textContent).not.toMatch(/correct|detected|perfect|brace your core/i);
  });
});
```

Add separate assertions for a segmented-spine overlay in Bridge, `Forearms`/`Hands` contact labels in Cobra, `Right arm + left leg` and `Left arm + right leg` labels in Superman, and a roller-orientation inset.

- [x] **Step 2: Run Back visual tests and confirm they fail**

Run: `npm test -- src/coach/back`
Expected: FAIL because Back coach components do not exist.

- [x] **Step 3: Implement Standing and Bridge visuals**

Standing uses the side three-quarter full-body rig. For knee bends, map `pulse(progress)` to knee flexion while the reached torso remains schematic. For full down/up, map the same progress to a conservative down-state and return without adding straight-leg, spinal-roll, or range detail. Display an `Illustration` badge for the ambiguous full-down phase.

Bridge uses a side-on mat, bent-knee anchors, hip lift, then four torso/spine segments that lower in chest-to-hip order:

```ts
const segmentProgress = (progress: number, index: number) =>
  Math.min(1, Math.max(0, (progress - 0.5 - index * 0.08) / 0.25));
```

Do not animate a rigid torso as if it represented “one vertebra at a time.”

- [x] **Step 4: Implement both Cobra phases**

Use one `CobraCoach` with a discriminated `support: 'forearms' | 'hands'`. Keep tummy/mat contact and support points visible. Hands produce a visibly larger but schematic extension. Do not add neck angle, pelvic pressure, elbow-locking, or range copy.

- [x] **Step 5: Implement Superman and foam-roller visuals**

Superman uses an elevated front three-quarter view, alternates opposite pairs based on cycle half, and renders text labels as well as accent colours. Foam roller uses a side-on movement plus a setup inset that shows the roller crossing the upper back; the hips-down reference is a labelled baseline, not a form score.

- [x] **Step 6: Implement reduced-motion Back poses**

When `reducedMotion` is true, render two labelled pose cards (`Start` and `Move`) with a directional arrow. Keep the exact same SVG geometry at progress `0` and `0.5`; do not loop or blink.

- [x] **Step 7: Run Back visual checks**

Run: `npm test -- src/coach/back && npm run check`
Expected: all seven Back player phases render accessibly, ambiguity labels appear where required, and prohibited coaching claims are absent.

- [x] **Step 8: Commit Back visuals**

```bash
git add src/coach/back
git commit -m "feat: illustrate guided Back routine"
```

---

### Task 8: Left Toe Routine Coach Visuals

**Files:**
- Create: `src/coach/toe/BigToeLiftCoach.tsx`
- Create: `src/coach/toe/BandedToeCoach.tsx`
- Create: `src/coach/toe/ArchLiftCoach.tsx`
- Create: `src/coach/toe/BalanceCoach.tsx`
- Create: `src/coach/toe/ToeCoach.tsx`
- Create: `src/coach/toe/ToeCoach.test.tsx`
- Create: `src/coach/toe/toeCoach.module.css`

**Interfaces:**
- Consumes: `CoachVisualProps`, SVG primitives, and math helpers from Task 6; Toe phase/visual IDs from Task 2.
- Produces: `ToeCoach(props: CoachVisualProps): JSX.Element`; dedicated close-up visuals for all toe/arch phases and a balance view with foot inset.

- [x] **Step 1: Write failing foot-legibility tests**

```tsx
// src/coach/toe/ToeCoach.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToeCoach } from './ToeCoach';

describe('ToeCoach', () => {
  it('marks every foot-specific visual as the left foot', () => {
    render(<ToeCoach phaseId="big-toe-lifts" visualId="big-toe" progress={0.5} reducedMotion={false} preview={false} />);
    expect(screen.getByRole('img', { name: 'Left big-toe lift close-up' })).toBeVisible();
    expect(screen.getByText('LEFT')).toBeVisible();
  });

  it('labels unresolved band placement as schematic', () => {
    render(<ToeCoach phaseId="banded-toe-pointing" visualId="banded-toe" progress={0.5} reducedMotion={false} preview={false} />);
    expect(screen.getByText('Use the band setup shown by your physiotherapist.')).toBeVisible();
  });
});
```

Add assertions that Arch Lift contains both `Setup` and `Arch close-up`, Balance contains a full-body figure and `Left foot` inset, and no view contains a camera/detection/correction claim.

- [x] **Step 2: Run Toe visual tests and confirm they fail**

Run: `npm test -- src/coach/toe`
Expected: FAIL because Toe coach components do not exist.

- [x] **Step 3: Implement the big-toe lift close-up**

Use a low inside three-quarter left-foot SVG with a ground line, big-toe accent, vertical movement arrow, and changing contact shadow. `pulse(progress)` raises and lowers only the big toe; the rest of the foot remains grounded in the illustration.

- [x] **Step 4: Implement banded toe pointing without inventing an anchor**

Render the loop around the big toe and extend the band beyond the frame without depicting an anchor or resistance angle. Map progress to press down and relax. Always include the schematic setup label from the test.

- [x] **Step 5: Implement split-view arch lift**

The upper inset shows the left foot in a loop, band pulled sideways, and right foot pinning the band exactly as written. The larger view highlights the inside arch relaxing in and lifting. Do not draw a precise band position on the left foot beyond a schematic loop; label the setup as physiotherapist-shown.

- [x] **Step 6: Implement balance with a foot inset**

Render a calm full-body figure balancing on the left leg and a magnified left-foot inset with `Toe straight` and `Arch lifted` text labels. Do not animate wobble or invent where the free leg belongs. The countdown ring comes from Task 9; this component only renders the pose and inset.

- [x] **Step 7: Implement reduced-motion Toe poses and run checks**

Reduced motion uses static start/move cards for the three movement phases and one static hold pose for balance.

Run: `npm test -- src/coach/toe && npm run check`
Expected: dedicated close-ups, left-foot labels, setup caveats, reduced-motion panels, and accessibility tests PASS.

- [x] **Step 8: Commit Toe visuals**

```bash
git add src/coach/toe
git commit -m "feat: illustrate guided Left Toe routine"
```

---

### Task 9: Guided Session Controller and Player UI

**Files:**
- Create: `src/features/player/useDeadline.ts`
- Create: `src/features/player/useDeadline.test.tsx`
- Create: `src/features/player/useSessionController.ts`
- Create: `src/features/player/useSessionController.test.tsx`
- Create: `src/features/player/CoachRouter.tsx`
- Create: `src/features/player/SessionPlayer.tsx`
- Create: `src/features/player/SessionPlayer.test.tsx`
- Create: `src/features/player/ReadyGate.tsx`
- Create: `src/features/player/PlayerProgress.tsx`
- Create: `src/features/player/PlayerControls.tsx`
- Create: `src/features/player/PauseSheet.tsx`
- Create: `src/features/player/SessionPlayer.module.css`

**Interfaces:**
- Consumes: routine data from Task 2; reducer/selectors from Task 3; persistence from Task 4; platform adapters from Task 5; coach runtime and all visuals from Tasks 6–8.
- Produces: `SessionControllerDeps`, `PlayerViewModel`, `PlayerActions`, `useSessionController(options): { view, actions }`, `CoachRouter(props): JSX.Element`, and `SessionPlayer(props): JSX.Element`.

- [x] **Step 1: Write failing deadline and controller tests**

```tsx
// src/features/player/useSessionController.test.tsx
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSessionController } from './useSessionController';

describe('useSessionController', () => {
  it('starts from one gesture, unlocks audio, and waits at readiness', async () => {
    const audio = { unlock: vi.fn(), speak: vi.fn(), tone: vi.fn(), cancel: vi.fn(), dispose: vi.fn(), speechAvailable: true };
    const wakeLock = { request: vi.fn().mockResolvedValue(true), release: vi.fn(), active: false };
    const { result } = renderHook(() => useSessionController({ routineId: 'back', audio, wakeLock }));
    await act(() => result.current.actions.start());
    expect(audio.unlock).toHaveBeenCalledOnce();
    expect(wakeLock.request).toHaveBeenCalledOnce();
    expect(result.current.view.status).toBe('awaiting-ready');
  });

  it('auto-pauses, saves, and cancels sound when hidden', () => {
    const save = vi.fn();
    const audio = { unlock: vi.fn(), speak: vi.fn(), tone: vi.fn(), cancel: vi.fn(), dispose: vi.fn(), speechAvailable: true };
    const { result } = renderHook(() => useSessionController({ routineId: 'left-toe', audio, saveSession: save }));
    act(() => result.current.actions.background());
    expect(result.current.view.status).toBe('paused');
    expect(audio.cancel).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });
});
```

`useDeadline.test.tsx` uses fake timers to assert a 5000 ms deadline emits once, pause preserves remaining time, Resume creates a new absolute deadline, and unmount clears scheduled work.

- [x] **Step 2: Run player tests and confirm they fail**

Run: `npm test -- src/features/player`
Expected: FAIL because player modules do not exist.

- [x] **Step 3: Define the controller boundary**

```ts
export interface SessionControllerDeps {
  readonly audio?: CoachAudio;
  readonly wakeLock?: WakeLockController;
  readonly initialSession?: SessionState;
  readonly preferences?: SessionPreferences;
  readonly voiceEnabled?: boolean;
  readonly reducedMotion?: boolean;
  readonly saveSession?: (state: SessionState) => void;
  readonly onFinished?: (state: SessionState) => void;
  readonly onVoiceEnabledChange?: (enabled: boolean) => void;
}

export interface PlayerViewModel {
  readonly state: SessionState;
  readonly routine: Routine;
  readonly phase: RoutinePhase;
  readonly status: SessionStatus;
  readonly exercisePosition: string;
  readonly setLabel: string;
  readonly sideLabel: string | null;
  readonly countLabel: string;
  readonly caption: string;
  readonly countdownSeconds: number | null;
  readonly coachProgress: number;
  readonly speechAvailable: boolean;
  readonly wakeLockActive: boolean;
  readonly voiceEnabled: boolean;
  readonly reducedMotion: boolean;
}

export interface PlayerActions {
  start(): Promise<void>;
  ready(): void;
  startNow(): void;
  pause(): void;
  resume(): Promise<void>;
  replay(): void;
  markRep(): void;
  decrementRep(): void;
  restartSet(): void;
  skip(): void;
  background(): void;
  exit(): void;
  setCoachPace(pace: CoachPace): void;
  setVoiceEnabled(enabled: boolean): void;
}
```

Defaults are constructed internally, while tests inject fakes. The controller is the only layer allowed to dispatch reducer events from animation cycles or deadlines.

- [x] **Step 4: Implement absolute deadlines and coach cycles**

`useDeadline` stores an absolute `performance.now() + remainingMs` deadline and derives visible remaining time on requestAnimationFrame. It stops when the session is paused/hidden. `useCoachCycle` runs only when status is `active` and dose is repetitions. Holds use the selected 10/15-second deadline and dispatch `HOLD_FINISHED`; they never use one-second `setInterval` accumulation.

- [x] **Step 5: Synchronise cues without letting audio control state**

On state entry:

- `awaiting-ready`: speak the phase name and setup cues once;
- `preparing`: speak `Get ready`, then the final `Three, two, one`, and play the start tone;
- `active`: display the full movement cue; speak only the opening cue and short phase changes;
- `set-transition`: speak `Set complete` and the next set number;
- `phase-transition`: speak `Exercise complete` and the next exercise name;
- `paused`: cancel speech and tones;
- `complete`: play completion tone and speak `Session complete` or `Session saved` from the honest summary.

Rep changes use the count tone and large visual numeral; do not queue spoken numbers 1–20. `audio.cancel()` runs before every stage cue, Pause, Skip, Replay, background, and exit.

- [x] **Step 6: Implement the mobile player surfaces**

`SessionPlayer` renders:

```tsx
<main className={styles.player} aria-labelledby="exercise-title">
  <header>{view.exercisePosition}</header>
  <CoachRouter phase={view.phase} progress={view.coachProgress} reducedMotion={preferences.reducedMotion} />
  <section aria-live="polite" aria-atomic="true">
    <h1 id="exercise-title">{view.phase.name}</h1>
    <p>{view.caption}</p>
  </section>
  <PlayerProgress setLabel={view.setLabel} sideLabel={view.sideLabel} countLabel={view.countLabel} />
  <PlayerControls view={view} actions={actions} />
</main>
```

`ReadyGate` contains `I’m ready`, `Replay setup`, and the always-visible illustration boundary. `PlayerControls` exposes Pause, Replay demo, Slower/Faster cycle, and audio; Skip is secondary. `PauseSheet` exposes Resume, Replay demo, Restart set, Skip exercise with confirmation, and End session.

- [x] **Step 7: Implement Coach routing and reduced-motion presentation**

`CoachRouter` sends Back visuals to `BackCoach` and Toe visuals to `ToeCoach` by `phase.visual`. Unknown visual IDs are impossible at compile time. During reduced motion, the controller does not start a cycle; the visual shows its static start/move cards and the player presents `Mark rep`, which dispatches the same `CYCLE_FINISHED` event, so the session remains operable without looping animation.

- [x] **Step 8: Add interaction and accessibility tests**

Test one-tap Start; setup speech/caption parity; five-second and Resume countdowns; automatic cycle count; `−1 rep`; pause/replay/restart; skip confirmation; honest skipped completion; no silent new phase; reduced-motion `Mark rep`; background pause; local speech absence; denied Wake Lock; and 44 px control sizing through computed CSS assertions where practical.

- [x] **Step 9: Run player checks**

Run: `npm test -- src/features/player && npm run check`
Expected: controller and UI tests PASS, with no session transition triggered directly by audio or SVG components.

- [x] **Step 10: Commit the guided player**

```bash
git add src/features/player
git commit -m "feat: build one-tap guided session player"
```

---

### Task 10: Home, Resume, Weekly Consistency, and Completion

**Files:**
- Create: `src/features/home/HomeScreen.tsx`
- Create: `src/features/home/HomeScreen.test.tsx`
- Create: `src/features/home/RoutineCard.tsx`
- Create: `src/features/home/WeeklyProgress.tsx`
- Create: `src/features/home/HomeScreen.module.css`
- Create: `src/features/completion/CompletionScreen.tsx`
- Create: `src/features/completion/CompletionScreen.test.tsx`
- Create: `src/features/completion/CompletionScreen.module.css`

**Interfaces:**
- Consumes: `Routine`, `ROUTINES` from Task 2; `SessionState`, `SessionSummary` from Task 3; weekly history from Task 4.
- Produces: `HomeScreenProps`, `HomeScreen`, `RoutineCard`, `WeeklyProgress`, `CompletionScreenProps`, and `CompletionScreen`.

- [x] **Step 1: Write failing one-tap and honest-completion tests**

```tsx
// src/features/home/HomeScreen.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createSession } from '../../session/reducer';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  it('starts either routine with one button tap', () => {
    const onStart = vi.fn();
    render(<HomeScreen activeSession={null} history={[]} onStart={onStart} onResume={vi.fn()} onOpenSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Back' }));
    expect(onStart).toHaveBeenCalledWith('back');
  });

  it('makes an unfinished session the dominant resume action', () => {
    const fakeActiveSession = createSession('back', { coachPace: 'standard', balanceSeconds: 10 });
    render(<HomeScreen activeSession={fakeActiveSession} history={[]} onStart={vi.fn()} onResume={vi.fn()} onOpenSettings={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Resume Back/ })).toBeVisible();
  });
});
```

```tsx
// src/features/completion/CompletionScreen.test.tsx
it('does not call a skipped session complete', () => {
  render(<CompletionScreen summary={{ completed: 4, skipped: 1, total: 5, label: 'Session saved' }} onDone={() => {}} onSetReminder={() => {}} onInstall={() => {}} />);
  expect(screen.getByRole('heading', { name: 'Session saved' })).toBeVisible();
  expect(screen.queryByText('Session complete')).not.toBeInTheDocument();
});
```

Import `createSession` from Task 3; do not hand-write a partial session object.

- [x] **Step 2: Run home/completion tests and confirm they fail**

Run: `npm test -- src/features/home src/features/completion`
Expected: FAIL because the feature modules do not exist.

- [x] **Step 3: Build the calm editorial home screen**

The top of Home contains `Move Daily`, the product line, current local date, and a quiet Settings button. If an active session exists, show a full-width Resume card before routine cards with exact exercise/set progress. Otherwise show Back and Left Toe cards with frequency, equipment, dynamic time estimate from coach pace, weekly progress, and one Start button each.

Back uses seven date dots labelled with days and an explicit `Most days` caption; no numeric target. Left Toe uses four marks and `n of 4 this week`. Missed days are neutral outlines, never red or “broken.”

- [x] **Step 4: Build honest completion and first-habit actions**

Full completion heading: `Back complete` or `Left Toe complete`, followed by completed phase count. With skips: `Session saved`, followed by `4 completed · 1 skipped`. Show `Done` as the dominant action. After the first complete record, offer `Add to Home Screen` and `Set a calendar reminder`; these actions delegate to Tasks 11–12.

- [x] **Step 5: Add responsive and accessible tests**

Test routine frequency copy, equipment copy, Back day dots, Toe 4-target, no punitive streak language, resume dominance, keyboard order, descriptive progress labels, skipped copy, and absent personal identifiers.

- [x] **Step 6: Run feature checks**

Run: `npm test -- src/features/home src/features/completion && npm run check`
Expected: Home and Completion tests PASS at all semantic states.

- [x] **Step 7: Commit Home and Completion**

```bash
git add src/features/home src/features/completion
git commit -m "feat: add calm routine and completion flow"
```

---

### Task 11: Settings, Safety, Privacy, Reset, and Calendar Reminders

**Files:**
- Create: `src/features/settings/SettingsScreen.tsx`
- Create: `src/features/settings/SettingsScreen.test.tsx`
- Create: `src/features/settings/SettingsScreen.module.css`
- Create: `src/features/reminders/calendar.ts`
- Create: `src/features/reminders/calendar.test.ts`
- Create: `src/features/reminders/ReminderDialog.tsx`
- Create: `src/features/reminders/ReminderDialog.test.tsx`
- Create: `src/features/reminders/ReminderDialog.module.css`

**Interfaces:**
- Consumes: `Preferences` and persistence actions from Task 4; install capability/help state from Task 12.
- Produces: `SettingsScreenProps`, `ReminderSchedule`, `createRecurringCalendar(schedule): string`, `downloadCalendar(schedule): void`, and `ReminderDialog`.

- [x] **Step 1: Write failing calendar and privacy tests**

```ts
// src/features/reminders/calendar.test.ts
import { describe, expect, it } from 'vitest';
import { createRecurringCalendar } from './calendar';

describe('calendar reminder', () => {
  it('uses only user-selected days and keeps health detail out of the event', () => {
    const ics = createRecurringCalendar({ routineId: 'left-toe', days: ['MO', 'WE', 'FR', 'SU'], localTime: '18:30' });
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR,SU');
    expect(ics).toContain('SUMMARY:Move Daily — Left Toe');
    expect(ics).not.toMatch(/diagnosis|clinic|physiotherapist|pain/i);
  });
});
```

Settings tests assert the exact privacy line `No exercise history is sent by this app.`, the illustration boundary, the conservative stop line, coach pace labels, 10/15-second balance choice, reset confirmation, and no hidden default reminder days.

- [x] **Step 2: Run settings/reminder tests and confirm they fail**

Run: `npm test -- src/features/settings src/features/reminders`
Expected: FAIL because feature modules do not exist.

- [x] **Step 3: Implement deterministic local calendar output**

```ts
export type CalendarDay = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export interface ReminderSchedule {
  readonly routineId: 'back' | 'left-toe';
  readonly days: readonly CalendarDay[];
  readonly localTime: `${number}${number}:${number}${number}`;
}
```

Validate at least one selected day, a real 24-hour local time, and unique days. Produce RFC 5545 text with CRLF endings, a stable product-domain UID, local `DTSTART`, weekly `RRULE`, `DURATION:PT15M`, `SUMMARY`, and the description `Open Move Daily and follow your existing plan.` Escape commas, semicolons, backslashes, and newlines. `downloadCalendar` creates a Blob URL, clicks a temporary anchor, and revokes the URL.

- [x] **Step 4: Implement Settings without clinical drift**

Settings sections:

- Coaching: voice on/off, Slow/Standard/Brisk coach pace labelled `visual rhythm`, reduced motion.
- Balance: explicit 10 or 15 seconds.
- Reminder: separate schedules for Back and Left Toe; no preselected weekdays.
- Install and offline: platform help from Task 12 and `Open once online to enable offline use.`
- Safety: illustration boundary and `Stop the session if you feel unwell or the movement causes pain, and follow your physiotherapist’s advice.`
- Privacy: local fields stored, `No exercise history is sent by this app.`, and browser/home-screen histories may be separate.
- Data: `Reset all progress` with confirmation; reset affects only the namespaced app record.

- [x] **Step 5: Test keyboard, labels, validation, and reset**

Verify every radio/switch has a visible label, reminder days are keyboard operable, no reminder downloads with zero days, reset is cancelled by default, confirmed reset returns defaults, and the page contains no clinician endorsement.

- [x] **Step 6: Run settings checks**

Run: `npm test -- src/features/settings src/features/reminders && npm run check`
Expected: settings, ICS escaping, reminder validation, privacy, and reset tests PASS.

- [x] **Step 7: Commit Settings and Reminders**

```bash
git add src/features/settings src/features/reminders
git commit -m "feat: add private settings and reminders"
```

---

### Task 12: Installable Offline PWA and GitHub Pages Workflow

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Create: `pwa-assets.config.ts`
- Create: `public/icons/move-daily.svg`
- Create: `public/robots.txt`
- Create: `src/pwa/manifest.ts`
- Create: `src/pwa/manifest.test.ts`
- Create: `src/pwa/install.ts`
- Create: `src/pwa/install.test.ts`
- Create: `src/pwa/register.ts`
- Create: `src/pwa/OfflineReadyNotice.tsx`
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: Vite foundation from Task 1.
- Produces: `PWA_MANIFEST`, `InstallState`, `observeInstallPrompt`, `getInstallInstructions(platform): string[]`, `registerMoveDailyPwa(callbacks): () => void`; generated 192, 512, maskable, and Apple touch icons; tested Pages workflow.

- [x] **Step 1: Write failing manifest and installation-help tests**

```ts
// src/pwa/manifest.test.ts
import { describe, expect, it } from 'vitest';
import { PWA_MANIFEST } from './manifest';

describe('PWA manifest', () => {
  it('uses repository-relative launch paths and required icons', () => {
    expect(PWA_MANIFEST).toMatchObject({
      name: 'Move Daily',
      short_name: 'Move Daily',
      start_url: './',
      scope: './',
      display: 'standalone',
    });
    expect(PWA_MANIFEST.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });
});
```

`install.test.ts` asserts iOS instructions are `Share` then `Add to Home Screen`, Android/Chromium can expose a captured install event, and unsupported browsers get bookmark guidance rather than a false install promise.

- [x] **Step 2: Run PWA tests and confirm they fail**

Run: `npm test -- src/pwa`
Expected: FAIL because PWA modules do not exist.

- [x] **Step 3: Add deterministic PWA asset generation**

Run: `npm install --save-dev @vite-pwa/assets-generator@^1.0.2`.

Create a square SVG icon using the product palette: paper background, blue articulated figure arc, and orange movement mark; include no letters smaller than icon-legible size. Configure `pwa-assets-generator` to produce `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, and `apple-touch-icon-180x180.png`. Add an npm script `generate:pwa-assets` and commit generated PNGs because the deployed app must not depend on local tooling.

- [x] **Step 4: Export and test the manifest object**

```ts
// src/pwa/manifest.ts
export const PWA_MANIFEST = {
  name: 'Move Daily',
  short_name: 'Move Daily',
  description: 'A calm guided player for your existing exercise plan.',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#f4f0e7',
  theme_color: '#f4f0e7',
  icons: [
    { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
} as const;
```

Pass this object to `VitePWA`. Configure `registerType: 'prompt'`, `base: '/move-daily/'`, asset precaching, `navigateFallback: 'index.html'`, cache cleanup, and no runtime third-party routes. Do not force `skipWaiting` during an active session.

- [x] **Step 5: Implement install/update/offline helpers**

Capture `beforeinstallprompt` without auto-opening it. Use these frozen interfaces:

```ts
export type InstallState =
  | { readonly kind: 'installable'; prompt(): Promise<'accepted' | 'dismissed'> }
  | { readonly kind: 'ios-instructions' }
  | { readonly kind: 'installed' }
  | { readonly kind: 'unsupported' };

export interface PwaCallbacks {
  onOfflineReady(): void;
  onNeedRefresh(update: () => Promise<void>): void;
  onRegistered(registration: ServiceWorkerRegistration | undefined): void;
}

export function observeInstallPrompt(callback: (state: InstallState) => void): () => void;
export function getInstallInstructions(platform: 'ios' | 'android' | 'desktop' | 'unknown'): readonly string[];
export function registerMoveDailyPwa(callbacks: PwaCallbacks): () => void;
```

Task 13 decides when to show the callbacks. Update copy is `Update ready — apply after this session.` The helper never reloads while a session is active.

- [x] **Step 6: Add the Pages build-and-deploy workflow**

```yaml
name: Check and deploy Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions: {}

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    permissions:
      contents: read
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run verify:release
      - uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6.0.0
      - uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0
        with:
          path: dist
  deploy:
    if: github.ref == 'refs/heads/main'
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128 # v5.0.0
```

Keep these third-party Action references immutable and add weekly Dependabot updates for the
`github-actions` ecosystem. Task 14 owns the release scripts consumed by this workflow; the
workflow installs Chromium before invoking that single checked release command.

- [x] **Step 7: Run PWA checks**

Run: `npm run generate:pwa-assets && npm test -- src/pwa && npm run check`
Expected: manifest tests PASS; build emits `manifest.webmanifest`, service worker, four icons, and repository-relative asset paths.

- [x] **Step 8: Commit PWA foundation**

```bash
git add package.json package-lock.json vite.config.ts pwa-assets.config.ts public src/pwa .github/workflows/pages.yml
git commit -m "feat: make Move Daily installable offline"
```

---

### Task 13: App Integration, Accessibility, Responsive Polish, and Browser Tests

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/main.tsx`
- Modify: `src/app/App.tsx`
- Create: `src/app/App.module.css`
- Create: `src/app/useAppModel.ts`
- Create: `src/app/useAppModel.test.tsx`
- Modify: `src/styles/global.css`
- Create: `src/styles/utilities.css`
- Create: `e2e/home.spec.ts`
- Create: `e2e/session.spec.ts`
- Create: `e2e/resilience.spec.ts`
- Create: `e2e/accessibility.spec.ts`
- Create: `e2e/helpers.ts`

**Interfaces:**
- Consumes: all domain, session, persistence, platform, coach, feature, and PWA interfaces from Tasks 2–12.
- Produces: integrated `App`, `AppRoute`, `useAppModel`, production visual system, and end-to-end release suite.

- [x] **Step 1: Write failing top-level orchestration tests**

```tsx
// src/app/useAppModel.test.tsx
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getRoutine } from '../domain/routines';
import { useAppModel } from './useAppModel';

describe('useAppModel', () => {
  it('moves home → player → completion → home without losing history', () => {
    const { result } = renderHook(() => useAppModel());
    expect(result.current.route.name).toBe('home');
    act(() => result.current.startRoutine('back'));
    expect(result.current.route).toMatchObject({ name: 'player', routineId: 'back' });
    if (result.current.route.name !== 'player') throw new Error('Expected player route');
    const completeSession = {
      ...result.current.route.session,
      status: 'complete' as const,
      completedPhaseIds: getRoutine('back').phases.map((phase) => phase.id),
      skippedPhaseIds: [],
    };
    act(() => result.current.finishSession(completeSession));
    expect(result.current.route.name).toBe('completion');
    act(() => result.current.goHome());
    expect(result.current.history).toHaveLength(1);
  });
});
```

Add a test that rehydrates an unfinished session and routes Home Resume to the exact saved phase/set/rep without automatic movement.

- [x] **Step 2: Run integration tests and confirm they fail**

Run: `npm test -- src/app`
Expected: FAIL because orchestration is not integrated.

- [x] **Step 3: Implement one explicit application route union**

```ts
export type AppRoute =
  | { readonly name: 'home' }
  | { readonly name: 'player'; readonly routineId: RoutineId; readonly session: SessionState }
  | { readonly name: 'completion'; readonly session: SessionState }
  | { readonly name: 'settings'; readonly returnTo: 'home' | 'completion' };
```

`useAppModel` loads once from Task 4, owns preferences/history/active session, and provides `startRoutine`, `resumeSession`, `saveActiveSession`, `finishSession`, `openSettings`, `closeSettings`, `goHome`, and `resetAllProgress`. It is the only top-level layer that changes screens.

- [x] **Step 4: Compose App without leaking feature responsibilities**

`App` selects one screen by `route.name`. It passes plain props and callbacks; feature components never import one another. Register PWA callbacks once in `main.tsx`. Show offline/update notices outside the screen switch, but defer updates while route is `player`.

- [x] **Step 5: Apply the approved visual direction**

Before styling, read and follow the `frontend-design` skill. Use the design’s warm editorial utility direction:

- paper and subtle grain atmosphere without a purple gradient;
- Bricolage Grotesque display hierarchy and Atkinson Hyperlegible Next body copy;
- one memorable oversized coach stage and progress numeral;
- sky-blue coach, deep ink, and orange action hierarchy;
- restrained staggered Home entrance and no decorative motion in reduced-motion mode;
- large mobile controls, visible focus, safe-area padding, and generous negative space;
- no generic dashboard grid, glassmorphism, fitness neon, or punitive gamification.

Keep feature styles in their CSS Modules. `global.css` owns only reset, body, typography, focus, safe areas, and OS motion defaults. `utilities.css` owns reusable screen-reader and touch-target helpers.

- [x] **Step 6: Add browser and accessibility tooling**

Run: `npm install --save-dev @axe-core/playwright@^4.13.0`.

Create `e2e/helpers.ts` with routines to clear the namespaced storage key, seed a valid active session, click through readiness, and set reduced motion. Do not add a production-only test bypass.

- [x] **Step 7: Add end-to-end flows**

`home.spec.ts` verifies one-tap Start, Resume dominance, frequencies, equipment, weekly progress, and Settings. `session.spec.ts` verifies readiness, countdown, one paced rep, Pause/Resume, Replay, Skip confirmation, and completion copy. `resilience.spec.ts` verifies refresh restore, offline reload after first visit, speech absence, blocked storage notice, denied Wake Lock, and background-pause behaviour. Use Playwright’s context offline switch only after an online load.

- [x] **Step 8: Add automated accessibility checks**

```ts
// e2e/accessibility.spec.ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home and active player have no serious accessibility violations', async ({ page }) => {
  await page.goto('./');
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.getByRole('button', { name: 'Start Back' }).click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});
```

Add viewports 320×700, 360×780, 390×844, and 844×390. Assert `document.documentElement.scrollWidth <= innerWidth`, focus is visible, text zoom does not cover controls, captions exist with sound, and progress is not colour-only.

- [x] **Step 9: Run the integrated checks and capture review screenshots**

Run: `npm run check && npm run test:e2e`
Expected: unit, lint, build, mobile, resilience, offline, and axe checks PASS.

Capture Home, Back readiness, active Bridge, Toe arch close-up, Balance hold, Pause, and Completion at 390×844 into `artifacts/screenshots/` for local visual inspection. Keep `artifacts/` gitignored. Inspect each screenshot for overflow, hierarchy, coach legibility, safe areas, clipped controls, and generic visual treatment; fix issues before commit.

- [x] **Step 10: Commit integrated experience**

```bash
git add package.json package-lock.json src e2e
git commit -m "feat: integrate accessible Move Daily experience"
```

---

### Task 14: Public-Safety Scan, Documentation, Repository, and Live Deployment

**Files:**
- Create: `scripts/scan-public-content.mjs`
- Create: `scripts/scan-public-content.test.mjs`
- Create: `README.md`
- Create: `.github/dependabot.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/features/reminders/calendar.ts`
- Modify: `src/features/reminders/calendar.test.ts`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-08-22-move-daily-design.md`
- Modify: `docs/superpowers/plans/2026-08-22-move-daily-implementation.md`

**Interfaces:**
- Consumes: the complete checked application from Tasks 1–13; the root publication phase separately consumes authenticated access to `taofeng-sketch`.
- Produces locally: `scanText`, `scanBuffer`, `collectScanTargets`, `scanRepository`, `npm run scan:public`, `npm run verify:release`, immutable least-privilege Pages configuration, and public-safe documentation.
- Produces only after root-owned publication: public repository `taofeng-sketch/move-daily`, successful exact-SHA Pages runs, and independently verified `https://taofeng-sketch.github.io/move-daily/`.

- [x] **Step 1: Prove the public-content scanner contract with failing tests**

Write Node tests before the scanner exists and observe the missing-module failure. The test matrix
must cover ordinary safe copy; high-confidence personal/contact, credential, and private-path
classes; LF and CRLF line numbers; same-line aggregation; output non-disclosure; mutable Action
references; exact 40-hex pins; semantic workflow YAML keys/values across quoted, escaped, explicit,
flow, block, anchor, and alias forms; invalid/warning/duplicate/multi-document YAML; bounded aliases;
semantic local `action.yml`/`action.yaml` manifests at any depth; normalized local Action paths;
hidden, extensionless, and spaced tracked filenames; untracked
source exclusion; recursive built output; missing `dist`; recognised binary magic; fail-closed
UTF-8 decoding; visible UTF-8 text behind every recognised binary family; exact first-payload-byte
boundaries; printable-signature exclusion; binary split-fragment, exact-budget, over-budget, and
trailing-control/split-island budget controls; real-asset controls; external symlinks; narrow
lockfile/generated-code suppressions;
injected in-memory private rules; scanner self-protection; and deterministic CLI status/output.

Construct every sensitive-looking fixture from fragments so the scanner and its own tests are
themselves safe to publish. A test must assert that findings contain exactly `kind`, `path`,
one-based `line`, and `count`, never a match, context, hash, or value.

Run: `node --test scripts/scan-public-content.test.mjs`
Expected initial result: FAIL because `scan-public-content.mjs` does not exist.

- [x] **Step 2: Implement the fail-closed scanner and harden its release inputs**

The scanner uses NUL-safe `git ls-files -z` output with no tracked-file exclusions, then adds every
file recursively beneath a required, freshly generated `dist/`. It does not follow a symlink
outside the repository. Positive PNG, WOFF/WOFF2, JPEG, GIF, WebP, and ICO magic selects a bounded
binary-text path rather than a wholesale skip. Recognition returns an exact payload offset — PNG
8 bytes, WOFF/WOFF2 4, JPEG 3, GIF87a/GIF89a 6, WebP 12, and ICO 4 — and excludes those signature
bytes before decoding. The first payload byte is therefore a real text boundary; printable magic
cannot merge into a candidate or be scanned as metadata. Scan subsequent contiguous raw
printable/UTF-8 islands through the same public and injected-private rules, collapse binary
findings to line 1, and fail closed if extracted printable material exceeds 1 MiB. Signature bytes
do not consume that budget. Controls and invalid UTF-8 separate islands so unrelated binary
fragments are never joined. Insert the synthetic separator only when a later printable island
actually begins; neither that separator nor trailing controls consume the printable-material
budget. Current generated fonts and icons must remain clean. All unrecognised
bytes are decoded as strict UTF-8 or reported as `unscannable-content`.

This binary boundary detects exposed text and metadata-like raw UTF-8 only; it does not decompress
format payloads, parse every format-specific metadata table, or detect steganography. Cost if wrong:
a secret or private identifier appended to a valid asset can evade release review, while joining
unrelated byte fragments or rejecting ordinary generated assets can make the release gate unusable;
an offset that is too short lets printable magic absorb a boundary-sensitive candidate, while one
that is too long drops real payload bytes. Correction belongs in magic-to-offset recognition,
binary extraction, its explicit payload-only budget, and direct-adjacency/real-asset mutation
controls. Counting synthetic separators as printable material would also reject a legal exact-budget
payload merely because it contains or ends with binary controls.

Detect high-confidence email, UK postcode, concrete desktop user path, PEM private key, major
provider credential, narrowly labelled secret assignment, and mutable GitHub Action classes.
For exact-root `.github/workflows/*.yml|yaml` and every tracked or built file whose basename is
exactly `action.yml` or `action.yaml`, use exact dev dependency `yaml@2.9.0` to parse one strict
document and recursively inspect semantic AST mappings. Resolve aliases within a 100-alias budget
and find semantic `uses` keys across plain, quoted, escaped, flow, explicit, anchored, and aliased
forms. Reject parse errors or warnings, duplicate semantic keys, multiple documents, unresolvable
nodes, and non-string `uses` values as one minimal `unscannable-content` finding. Remote Actions
are legal only at an exact 40-hex commit. A local Action is legal only as a non-empty normalized
`./segment[/segment]` path composed of ordinary letters, digits, dots, underscores, and hyphens;
reject traversal, empty/repeated segments, backslashes, expressions, and other syntax. The scanner
validates references but never resolves or executes a local Action.
Outside semantic Action YAML files, inspect action-shaped `owner/repo[/path]@ref` documentation
copies and reject malformed `./...` local copies while ordinary slash prose remains legal.
Aggregate and sort findings deterministically, print one minimal JSON object per finding, print
nothing on success, and exit non-zero on any finding.

Cost if wrong: a pinned workflow can delegate to a local composite manifest that quietly restores
a mutable remote dependency, while over-broad path recognition can parse ordinary YAML/prose as an
Action; correction belongs in the shared semantic-YAML path predicate, local-reference validator,
and manifest/near-path fixtures.

Suppress only email/postcode candidates inside an exact root-lockfile `deprecated` JSON value, and
only a generated `dist/` postcode lookalike that is precisely a backslash-prefixed Unicode escape.
Do not suppress any credential, path, assignment, workflow, real built postcode, whole lockfile, or
scanner file. Export in-memory extra-rule injection so the root agent can check exact private terms
without writing or echoing those terms.

Replace email-shaped calendar UIDs with distinct stable UUID URNs. Pin every Pages Action to the
reviewed full commit, default workflow permissions to none, give build only source-read access,
give deploy only Pages/identity-token writes, disable checkout credential persistence, condition
deployment on `main`, and add weekly `github-actions` Dependabot updates.

Add these exact package scripts in this order:

```json
"test:public-scan": "node --test scripts/scan-public-content.test.mjs",
"check": "npm run lint && npm test && npm run build && npm run test:public-scan",
"scan:public": "node scripts/scan-public-content.mjs",
"verify:release": "npm run check && npm run scan:public && npm run test:e2e"
```

The build must happen before source-plus-output scanning; browser verification follows the scan.
Vitest excludes the Node-native scanner test file; `npm run check` invokes that suite explicitly
after building `dist`, so each test stays in its correct runtime and the clean-clone order is real.

- [x] **Step 3: Write the public-safe README**

README sections:

- outcome-first description and live-site link;
- Back and Left Toe routine overview without patient or clinician identity;
- `Illustration only` and safety boundary;
- one-tap guidance, local history, offline/install, reminders, accessibility, and fallbacks;
- exact `npm ci`, `npm run dev`, `npm run verify:release`, and `npm run build` commands;
- architecture map and links to the spec/plan;
- GitHub Pages deployment behaviour;
- privacy statement: no account, analytics, uploads, or exercise-history transmission;
- same-origin boundary: namespaces prevent accidental collisions, not hostile sibling access;
- known schematic ambiguities and clinician-review recommendation;
- repository usage statement that public visibility does not grant an open-source licence unless a licence file is added deliberately.

Do not describe the repository owner as the patient or include the source email.

- [x] **Step 4: Run the complete automated local release gate**

Run: `npm run verify:release`
Expected: public scan, lint, all unit tests, production build, all Playwright projects, offline checks, and axe checks PASS.

Also run `npm audit --audit-level=high`, `git diff --check`, and a bounded in-memory scan for the
exact private source terms. The private scan may output only count/kind/path/line and must not write
or echo a term. Stage the intended new public files before the final scan so `git ls-files` sees the
complete would-be commit; then review the staged file list and diff before committing.

Observed current local candidate after the signature-boundary refinement: 320/320 Vitest checks,
92/92 scanner checks, 40 Playwright passes with 80 intentional project skips and zero failures, zero
public/private scan findings, and zero audit vulnerabilities.

Preserve these device/browser checks for the root-owned live-verification phase; do not infer them
from local automation:

1. Complete both routines in standard mode.
2. Complete one phase in reduced motion.
3. Verify local English speech when available and captions/tones when unavailable.
4. Lock/background during an active rep and a hold; both return paused.
5. Deny storage and Wake Lock; the session still completes.
6. Install locally where supported, reload offline, then simulate an app update outside an active session.
7. Confirm no third-party requests, upload, analytics, or remote app-requested TTS endpoint appears in the network log.

- [x] **Step 5: Update local project status and commit the release candidate**

Set the design status to `Implemented; live verification pending` and the project status to the same. Mark completed plan checkboxes. Preserve the three visual ambiguities and the clinician-review recommendation.

```bash
git add README.md package.json vite.config.ts scripts CLAUDE.md docs .github \
  src/features/reminders/calendar.ts src/features/reminders/calendar.test.ts
git commit -m "docs: prepare public Move Daily release"
```

Run: `git status --short && git log --oneline --decorate -15`
Expected: clean worktree and a focused commit sequence authored by Tao Feng.

- [ ] **Step 6: Resolve the exact GitHub target before mutation**

Run: `gh auth status`
Expected: active account `taofeng-sketch`.

Run: `gh repo view taofeng-sketch/move-daily --json name,url,visibility,defaultBranchRef`
Expected before first publication: repository not found. If it exists, stop creation, verify ownership/content, and attach only when it is the intended project.

- [ ] **Step 7: Create and push only a sanitized public `main`**

Export the reviewed candidate into an isolated temporary directory. Initialise a new `main`
repository there and create one root commit authored and committed by Tao Feng using the verified
GitHub noreply identity. Do not rewrite or publish the private granular development history.

Run `npm ci` and `npm run verify:release` inside that isolated checkout. Then create the public
remote **without `--push`**, verify the isolated checkout is clean and on `main`, add/confirm the
intended remote, and push exactly `main:main`. Record the exact published commit SHA.

Run: `git status --short --branch`, `git remote -v`, and
`gh repo view taofeng-sketch/move-daily --json url,visibility,defaultBranchRef`.
Expected: the isolated tree is clean on `main`, the target is public and owned by the intended
account, and remote `main` resolves to the recorded sanitized SHA.

- [ ] **Step 8: Enable the workflow Pages source and observe deployment**

```bash
gh api --method POST repos/taofeng-sketch/move-daily/pages -f build_type=workflow
```

If GitHub reports that the Pages site already exists, inspect it with `gh api repos/taofeng-sketch/move-daily/pages` and proceed only when `build_type` is `workflow`.

Verify remote `main` still equals the recorded published SHA, explicitly dispatch `pages.yml` from
that `main`, then select the resulting `workflow_dispatch` run whose `headSha` equals the recorded
SHA. Watch that exact run to terminal success. Do not infer completion from the newest run, queue
visibility, a push event, or a Pages URL appearing.

- [ ] **Step 9: Verify the production site independently**

Run:

```bash
gh api repos/taofeng-sketch/move-daily/pages --jq '{html_url: .html_url, status: .status, build_type: .build_type}'
curl --fail --silent --show-error --location https://taofeng-sketch.github.io/move-daily/ > /dev/null
curl --fail --silent --show-error --location https://taofeng-sketch.github.io/move-daily/manifest.webmanifest > /dev/null
```

Expected: Pages reports workflow publishing, both URLs return successfully, and the page title is `Move Daily`.

Open the live site at 390×844 and desktop widths. Verify Start/Resume, one full routine, installed/offline launch, no overflow, manifest/icons/service-worker scope, local storage, captions, and update behaviour on the production origin. Inspect a production screenshot before declaring completion.

- [ ] **Step 10: Record observed release evidence**

Update README status and project `CLAUDE.md` with the exact source URL, live URL, deployment run URL,
verified date, and observed capabilities. Export only those reviewed documentation changes into the
isolated public checkout, create a second sanitized Tao Feng commit, and push `main:main` from that
checkout. Assert the documentation run's `headSha` equals the second commit and watch it to terminal
success. Only then mark the implementation plan and project status live.

---

## Spec Coverage Matrix

| Spec section | Implemented by |
| --- | --- |
| Decision, problem, success, non-goals | Tasks 1, 10, 13, 14 |
| Clinical boundary and exact content | Tasks 2, 3, 7, 8, 9, 14 |
| Experience principles and information architecture | Tasks 9, 10, 11, 13 |
| Home, resume, weekly consistency, habit support | Tasks 4, 10, 11 |
| Player layout and state machine | Tasks 3, 6, 9 |
| Eleven exact visual phases and documented ambiguities | Tasks 2, 7, 8 |
| English voice, tones, captions, and fallback | Tasks 5, 9, 13 |
| Local progress, reset, privacy, and reminder | Tasks 4, 10, 11, 14 |
| Static architecture and module boundaries | Tasks 1–13 |
| Offline, installation, cache update, and Pages subpath | Tasks 12–14 |
| Accessibility and failure matrix | Tasks 5, 6, 9, 11–14 |
| Automated, manual, privacy, and deployment gates | Tasks 2–14 |
| Deferred clinical decisions remain labelled | Tasks 2, 7, 8, 11, 14 |

## Definition of Done

All task checkboxes are checked; every task commit passed its scoped tests and `npm run check`; `npm run verify:release` passes from a clean clone; source and build scans contain no private exercise-participant or clinician details; both routines complete correctly in standard and reduced-motion modes; background/audio/storage/Wake Lock failures degrade safely; the public GitHub repository is observed; the Pages workflow succeeds; and the production site is independently opened, exercised, installed, and verified offline.
