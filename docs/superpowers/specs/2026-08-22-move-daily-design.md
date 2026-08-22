# Move Daily — Product and Interaction Design

**Date:** 2026-08-22  
**Status:** Implemented and live verified (2026-08-22).
**Product line:** *Your plan, one move at a time.*

## 1. Decision

Build **Move Daily** as a public, mobile-first progressive web app with a hybrid 2D illustrated coach. The app turns two supplied exercise routines into guided sessions with English preparation prompts, visible instructions, animated demonstrations, repetition and set tracking, hold countdowns, automatic in-set progression, safe readiness gates, local completion history, and reminder setup.

The first release uses a hybrid visual system rather than one generic avatar:

- full-body and mat-based rigs for large back movements;
- a segmented-spine overlay where articulation needs to be visible;
- prop-aware views for the foam roller and bands;
- dedicated left-foot close-ups for toe and arch movements;
- a full-body balance view with a magnified foot inset.

This is more legible and less misleading than a small full-body figure for every exercise. A 3D avatar is not part of the first release: it would add load, motion-authoring complexity, and false visual authority without resolving ambiguities in the written plan. Filmed video is also out of scope because it requires a performer, clinical review, media hosting, and usage rights.

## 2. Problem and success

The user already has a clinician-written plan but regularly forgets to do it and finds a text list hard to enter. The product should remove the effort of remembering the sequence, repetitions, sets, side changes, equipment changes, and what comes next.

The product succeeds when:

1. a routine starts or resumes with one tap from the home screen;
2. during the session, the user always knows the current exercise, phase, set, side, rep or remaining time, and next action;
3. the player advances automatically while the user is settled in one movement, but never starts a new position or equipment setup without readiness confirmation;
4. backgrounding, locking, refreshing, losing speech, or losing storage cannot silently advance or destroy the session;
5. every dose matches the supplied plan and no extra clinical instruction is introduced;
6. no personal information or exercise history leaves the device;
7. the app can be installed and, after one successful online load, used without a network connection;
8. weekly history makes the routine easier to remember without rewarding over-exercising.

## 3. Non-goals

The first release will not:

- diagnose, personalise, progress, or modify the programme;
- judge form, detect repetitions, or claim a movement was performed correctly;
- use a camera, microphone, wearable, motion sensor, or AI coach;
- prescribe tempo, range, resistance, rest, pain thresholds, or recovery;
- infer exact days for “most days” or “4× per week”;
- send web push notifications or run a reminder service in the background;
- create an account, cloud sync, community, sharing, or clinician portal;
- store pain scores, symptoms, diagnosis, free text, or clinician details;
- replace ambiguous written instructions with invented animation detail.

## 4. Clinical-content boundary

The exercise plan defines names, setup wording, repetitions, sets, sides, frequency, and one hold range. It does **not** define repetition tempo, transition time, rest periods, acceptable discomfort, progression, or review timing. The product must preserve that boundary.

Rules:

- A five-second countdown is labelled **Get ready**, never clinical rest.
- The animated loop is labelled **Coach pace** and is a visual following rhythm, not a prescribed speed. It can be slowed, paused, or replayed.
- The counter reflects completed coach-animation cycles. The interface never says a camera or sensor detected a user repetition.
- The safety line is short and separate from the clinician plan: **“Stop the session if you feel unwell or the movement causes pain, and follow your physiotherapist’s advice.”** This is a conservative general boundary consistent with NHS home-exercise guidance, not a new diagnosis or pain scale.
- Every player screen can open: **“Illustration only. Follow the plan and guidance given by your physiotherapist.”**
- No posture cue such as “brace your core,” “keep your back flat,” “keep the knee aligned,” or “move only to this angle” may be added unless it exists in later clinician guidance.
- Ambiguous visuals remain schematic and are identified in the content-review checklist.

Useful public safety references:

- [NHS: Home Exercise Programme](https://www.cuh.nhs.uk/patient-information/home-exercise-programme/)
- [NHS: Back pain](https://www.nhs.uk/conditions/back-pain/)

## 5. Experience principles

### 5.1 A coach timeline, not an exercise library

The dominant experience is a running session. Reference material is secondary. The player always answers: **What do I do now?**

### 5.2 One tap until a physical setup changes

The home screen offers one-tap `Start` or `Resume`. Reps, sets, sides, and phases then progress automatically. A physical change—standing to floor, forearms to hands, fetching a roller, placing a band, or changing setup—uses an `I’m ready` gate so the app cannot rush ahead while the user is moving.

### 5.3 Calm, not gym-like

The visual direction is warm editorial utility: an off-white paper-like field, deep ink text, a clear sky-blue coach, and one high-visibility orange action accent. It should feel like a dependable physiotherapy card brought to life, not a neon fitness challenge. Use a characterful display face and a highly legible body face, bundled with the app rather than fetched at runtime.

### 5.4 Consistency without guilt

The home screen shows completed days and the clinician-written frequency. It does not use broken-streak language, confetti for exceeding the plan, or prompts to double up after a missed day.

## 6. Information architecture

The app has five user-facing surfaces:

1. **Home** — resume state, two routine cards, weekly completion, install/reminder access.
2. **Routine setup** — equipment check, voice and pace settings, balance hold choice when relevant.
3. **Session player** — preparation, readiness, preview, work, pause, and transition states.
4. **Completion** — honest completed/skipped summary and next lightweight habit action.
5. **Settings and safety** — voice, coach pace, reduced motion, install help, reminder setup, reset progress, privacy, and safety boundary.

There is no account creation or introductory questionnaire. A one-time, single-screen notice explains that illustrations are demonstrations of an existing plan and that history stays on the current device.

## 7. Home screen

### 7.1 Resume state

If a session is unfinished, the dominant control is:

> **Resume Back**  
> Exercise 3 of 5 · Set 1 of 2

One tap restores the saved state, requests audio and screen-wake capability again, and gives a fresh three-second countdown. It does not resume motion or speech before the tap.

### 7.2 Routine cards

When there is no unfinished session, show two large cards:

- **Back** — `Most days` — approximate duration derived from the selected coach pace — equipment: mat and foam roller.
- **Left Toe** — `4× per week` — approximate duration derived from the selected coach pace — equipment: loop band and heavy loop band.

Each card contains one dominant `Start Back` or `Start Left Toe` button. The first tap is the browser gesture used to enable sound and request Screen Wake Lock.

### 7.3 Weekly consistency

- Back uses seven date dots with completed days filled and the label `Most days`; it does not display an invented weekly target.
- Left Toe displays `2 of 4 this week` and four progress marks.
- Skipped exercises do not count as a completed session.
- History is device-local and can be reset from Settings.

### 7.4 Habit support

After the first completed session, show two quiet actions:

- `Add to Home Screen`
- `Set a calendar reminder`

Reminder setup lets the user choose days and time, then creates a local calendar file or shows platform-specific steps. The product does not infer days from the plan and does not promise web push when the app is closed.

## 8. Session-player layout

In portrait orientation, the active player uses the full viewport:

- **Top rail:** routine name, `Exercise 2 of 5`, safety/help button, and close.
- **Coach stage:** the responsive SVG occupies roughly half the screen; equipment and movement arrows appear only where needed.
- **Instruction band:** exercise name and one short clinician-grounded cue, always visible and synchronized with speech.
- **Progress row:** set, side, rep or hold time, with large numerals.
- **Control dock:** `Pause`, `Replay demo`, `Slower`, and a compact audio toggle. `Skip` remains available but visually secondary.

All primary targets are at least approximately 44 × 44 CSS pixels, safe-area insets are respected, text can scale, browser zoom remains enabled, and no state relies on colour alone.

Landscape keeps the coach on the left and instructions/controls on the right. At 320–390 px portrait widths, no horizontal scrolling is allowed.

## 9. Session state machine

The session engine uses explicit, serialisable states:

```text
idle
  → setup
  → preview
  → awaiting_ready
  → preparing
  → active
  → set_transition | phase_transition | side_transition
  → awaiting_ready | preparing | active
  → exercise_complete
  → next_exercise
  → session_complete

Any running state → paused
Any running state → saved_on_background
paused/saved_on_background → preparing → previous running state
```

State contains routine, exercise, phase, set, side, paced rep count, remaining hold time, coach pace, skipped items, and the timestamp at which it was saved. It does not contain symptoms or free text.

### 9.1 Preview and readiness

- Show an uncounted loop or reduced-motion start/end cards.
- Speak and display the setup instruction once.
- For the first exercise and every physical setup change, stop on `I’m ready` with `Replay setup` available.
- After `I’m ready`, say **“Get ready”**, then count down five to one.
- `Start now` can shorten a preparation countdown; `Need more time` returns to the readiness gate.

### 9.2 Active movement

- The coach loop, rep counter, phase cue, and subtle tone share one timeline.
- A rep is counted at the defined end state of an animation cycle, not from user sensing.
- The opening repetition receives the full cue. Later repetitions use short phase cues and a tone so speech does not overlap.
- `−1 rep` is available from the expanded control sheet to resynchronise if the user falls behind.
- `Replay demo` pauses counting, plays one uncounted loop, and returns to a three-second resumption countdown.

### 9.3 Set, side, and phase changes

- Set-only transitions announce `Set complete` and the next set. They use a visible product transition countdown with `I’m ready` and `Start now`; they are not described as prescribed rest.
- Side changes announce `Switch sides` and wait for readiness if body position changes.
- Major phase changes that alter contact points or equipment always wait for `I’m ready`.
- No stage begins silently.

### 9.4 Pause, background, and exit

- `Pause` freezes animation, timers, counters, tones, and speech immediately.
- `Resume` always gives a fresh three-second countdown.
- The pause sheet offers `Resume`, `Replay demo`, `Restart set`, `Skip exercise`, and `End session`.
- `Skip exercise` requires a brief confirmation and records the item as skipped.
- Page hide, screen lock, navigation, or refresh saves exact progress and pauses. Returning shows `Resume`; elapsed background time never consumes reps or a hold.
- Timing uses monotonic deadlines while visible rather than assuming that one-second intervals remain accurate.

## 10. Exact routine and visual map

The data model treats the nine written exercises as eleven player phases where the plan itself changes movement.

### 10.1 Back — Most days

| Exercise / phase | Dose | Coach view and states | English setup and movement cues | Count point / gate |
| --- | --- | --- | --- | --- |
| Standing reach: knee bends | 6 reps × 3 sets | Whole body, side three-quarter. Standing → reach toward floor → knees bend → knees straighten. | “In standing, reach toward the floor.” “Bend your knees.” “Straighten your knees.” | Count on straighten. Readiness before first set. |
| Standing reach: full down and up | 8 reps | Same view. Schematic full-down state → return to standing. | “Now go all the way down and back up.” Short cues: “Down.” “Back up.” | Count on return. Phase gate because endpoints are ambiguous. |
| Bridge articulations | 10 reps × 2 sets | Side-on mat view. Knees bent → hips lifted → chest lowers → highlighted spine segments lower in sequence → hips reach floor. | “Lie on your back with your knees bent.” “Lift your hips and squeeze your glutes.” “Lower your chest, one vertebra at a time, until your hips reach the floor.” | Count when hips return. Readiness gate from standing. |
| Cobra on forearms | 10 reps | Side-on mat. Tummy down, forearms press, chest lifts, chest lowers. Contact points are prominent. | “Lie on your tummy.” “Push down through your forearms and lift your chest.” “Lower.” | Count on lower. Readiness gate from supine to prone. |
| Cobra on hands | 10 reps | Side-on mat. Hands support a larger illustrated extension, then chest lowers. No invented neck or pelvis cue. | “Now lift all the way up onto your hands into a bigger extension.” “Lower.” | Count on lower. Readiness gate to change arm setup. |
| Supermans | 8 reps × 2 sets each side | Elevated front three-quarter. Right arm + left leg, then left arm + right leg, with text labels and two counters. | “Start on your hands and knees.” “Lift one arm and the opposite leg.” “Lower.” “Other side.” | Alternate sides as an interface convention; count each pair on lower. Readiness gate. |
| Foam-roller upper-back extensions | 10 reps × 2 sets | Side-on body plus setup inset showing roller across upper back. Knees bent, hands behind head, hips-down reference; upper back extends over roller and returns. | “Lie on your back with the roller across your upper back.” “Bend your knees and place your hands behind your head.” “Keep your hips down.” “Extend your upper back over the roller.” “Lift back up.” | Count on lift back up. Readiness gate for roller setup. |

### 10.2 Left Toe — 4× per week

| Exercise | Dose | Coach view and states | English setup and movement cues | Count point / gate |
| --- | --- | --- | --- | --- |
| Big-toe lifts | 20 reps | Close left-foot view from low inside angle. Foot flat, big toe highlighted, toe lifts and lowers; ground shadow reinforces vertical motion. | “Keep your foot on the floor.” “Lift your big toe.” “Lower.” | Count on lower. Readiness gate. |
| Banded big-toe pointing | 20 reps | Close side view. Loop around big toe, toe relaxed, presses down into band, relaxes. Unspecified band anchor remains outside the frame. | “Hook a loop band around your big toe.” “Use the band setup your physiotherapist showed you.” “Press your toe down into the band.” “Relax.” | Count on relax. Readiness gate for band. |
| Heavy-band arch lifts | 10 reps × 3 sets | Split view: both-feet setup plus close inside edge of left foot. Left foot inside loop; band pulled sideways; right foot stands on band; arch relaxes in and lifts. | “Place your left foot inside the loop band.” “Pull it to the side and stand on the band with your right foot.” “Use the band position your physiotherapist showed you.” “Relax the left arch in.” “Lift the arch back up.” | Count on arch lift. Readiness gate. |
| Single-leg balance | 10 or 15 seconds × 4 | Full-body front three-quarter on left leg plus magnified foot inset. Calm hold, straight-toe and arch highlights, circular countdown. No invented raised-leg position. | “Keep your toe straight and your arch lifted.” “Hold.” Final cue: “Three, two, one. Done.” | User chooses 10 or 15 seconds once; choice is remembered. Readiness before each hold. |

### 10.3 Ambiguities that the artwork must not conceal

The first release can remain useful with schematic visuals, but it must not claim exact clinical demonstration for:

1. the endpoint and spinal/knee pattern of “all the way down and back up”;
2. the band anchor and resistance direction for banded big-toe pointing;
3. the precise band position and pull direction for heavy-band arch lifts;
4. whether Superman should alternate sides or complete one side at a time—the app uses alternating sides only as a transparent interface convention.

The ideal content-release gate is a clinician review of all nine demonstrations, with particular attention to these three ambiguities plus bridge articulation, cobra range, and foam-roller placement. Until then, the app labels visuals as illustrations and preserves the written cues.

## 11. Voice, tones, and captions

All spoken content is English and appears simultaneously as visible text.

### 11.1 Prompt categories

- session: `Session ready`, `Session complete`;
- preparation: `Get ready`, five-to-one countdown, `Start`;
- navigation: exercise name, `Next exercise`, `Set two`, `Switch sides`;
- movement: the short cues in the routine table;
- completion: `Set complete`, `Exercise complete`;
- hold: final `Three, two, one, done`.

The player does not narrate every screen change through an assertive live region. Screen readers receive polite announcements for exercise, set, side, and completion changes; each elapsed second is visual only.

### 11.2 Speech implementation and fallback

- Select only an available English system voice whose browser metadata marks it as local, and handle voice-list loading asynchronously.
- Do not request a remote browser voice. Even with a reported local voice, treat speech as best-effort across browsers rather than an offline guarantee.
- Pause, skip, replay, or page hide cancels the queued utterance immediately.
- If no suitable local voice is available, use synchronized English captions and bundled tones. The session remains fully operable.
- Audio is enabled by the explicit Start/Resume tap and has a persistent mute control.
- Pre-recorded speech is deferred until a redistribution-safe voice source is selected; browser speech is progressive enhancement, not a dependency of the state machine.

## 12. Progress, reminders, and privacy

### 12.1 Stored locally

Use a versioned, namespaced local record containing only:

- routine ID and local calendar date;
- completed or skipped exercise IDs;
- exact resumable player state for one unfinished session;
- voice, coach pace, reduced-motion, and 10/15-second balance preference;
- whether install/reminder education has been dismissed.

Do not store symptoms, pain, diagnosis, free text, names, email, clinic data, or clinician data. `Reset all progress` removes the app namespace after confirmation.

Storage failure or private browsing must not block a session. If persistence throws or is unavailable, show: **“This session will work, but progress cannot be saved on this device.”**

Because project sites under one GitHub Pages origin can share origin-level local and cache storage, keys and caches must be strictly namespaced and must remain non-sensitive. Namespacing prevents accidental collisions; it is not protection from a hostile or compromised same-origin sibling. A dedicated custom domain is deferred hardening if stronger origin isolation becomes necessary. The app promises **“No exercise history is sent by this app,”** not that a web page makes no network requests: static assets still load from the host.

### 12.2 Installation and local-history expectation

- Show install help appropriate to the detected platform.
- On iOS, explain the Share → Add to Home Screen path rather than promising an automatic install prompt.
- Recommend installing before building history because browser and installed-app storage may not be shared.
- Copy states: **“Open once online to enable offline use.”**

### 12.3 Reminder setup

The user explicitly selects days and time. The app creates a calendar reminder or gives OS-specific instructions; it does not send history to a server. The two routines can have separate schedules. No defaults imply that “most days” means seven days or that the toe routine belongs on particular weekdays.

## 13. Technical architecture

### 13.1 Stack

- Vite, React, and TypeScript compiled to static assets.
- A small explicit reducer/state machine; no external state-management service.
- Responsive SVG components driven by structured pose keyframes.
- Web Speech and Screen Wake Lock only as progressive enhancements.
- Versioned service worker and web app manifest for installation and offline app-shell caching.
- Local storage behind a narrow adapter that catches unavailable/quota errors.
- Vitest for data and state-machine tests; Playwright for mobile flows, offline behavior, and deployed smoke checks.
- One GitHub Actions workflow builds, tests, uploads the static artifact, and deploys it to GitHub Pages.

React is justified here by the number of synchronized player states, reusable coach views, accessibility labels, and fallback presentations. No backend, API, database, CDN, analytics library, or runtime font request is required.

### 13.2 Module boundaries

```text
src/
  routines/        exact structured plan and validation
  session/         serialisable reducer, deadlines, transitions
  coach/           full-body, mat, foot, prop and reduced-motion visuals
  audio/           speech queue, local-voice selection, tones, captions
  persistence/     namespaced local history and resumable session
  reminders/       calendar-file generation and platform guidance
  pwa/             install, update and Wake Lock helpers
  screens/         Home, Setup, Player, Completion, Settings
```

The routine data contains content and dose. The session engine consumes routine data but does not know SVG internals. The coach consumes pose/phase and reports deterministic cycle completion. Audio consumes state transitions but cannot advance state. Persistence serialises session state but does not interpret it. This prevents a speech, animation, or storage failure from corrupting the exercise sequence.

### 13.3 Offline and update behavior

- The first successful online visit caches the application shell, fonts, icons, SVG assets, tones, and routine data.
- The manifest, service worker scope, and asset base use the repository subpath expected by GitHub Pages.
- A new service worker downloads in the background, then offers `Update after session`; it never forces a refresh during an active session.
- A cache version removes obsolete assets on activation.
- Failure to register the service worker leaves a normal online web app.

References:

- [GitHub: Publishing a Pages site with a custom workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [MDN: SpeechSynthesis speak](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/speak)

## 14. Accessibility and failure behavior

### 14.1 Accessibility

- All spoken cues have synchronized captions.
- Decorative motion follows `prefers-reduced-motion`; an in-app toggle is also provided.
- Reduced-motion exercise demonstrations show start/end pose cards and directional arrows instead of continuous looping.
- Core exercise motion is user-initiated and can always be paused or replayed.
- VoiceOver, TalkBack, keyboard focus order, visible focus, text scaling, and portrait/landscape are first-class test cases.
- `aria-live="polite"` is limited to meaningful stage changes.
- No status depends only on sound, colour, or animation.

### 14.2 Failure matrix

| Failure | Required behavior |
| --- | --- |
| English speech unavailable | Continue with captions and tones; show an unobtrusive voice-unavailable state. |
| Wake Lock denied or released | Continue; preserve state and automatically pause if the page becomes hidden. |
| Local storage unavailable | Continue the session; disclose that progress cannot be saved. |
| Service worker unavailable | Continue online; do not show offline-ready confirmation. |
| Animation cannot run | Use bundled start/end pose cards and exact text; counting remains manual or paused. |
| Page hidden or phone locked | Save, cancel audio, pause all deadlines; require one-tap Resume. |
| Refresh or browser crash | Offer Resume from the most recently committed state; never infer work during the gap. |
| Speech queue lags | Cancel stale utterances on state change; visual state remains authoritative. |
| Corrupt saved record | Quarantine/reset only the namespaced progress record; keep the app usable. |
| Update arrives mid-session | Defer activation and reload until the session completes or the user exits. |

## 15. Testing and release gates

### 15.1 Automated

- Validate every routine against a schema and snapshot all frequencies, reps, sets, phases, sides, and hold choices.
- Use a simulated clock to cover prepare, active, set/side/phase transitions, pause, resume, replay, decrement, skip, completion, and background restore.
- Verify one complete Back session and one complete Left Toe session produce the exact expected sequence without dropped or duplicated reps.
- Test speech cancellation and ensure audio cannot advance session state.
- Test storage exceptions and record migrations.
- Test reminder generation without sending data.
- Run component and accessibility tests for captions, focus, labels, reduced motion, and muted mode.
- Run Playwright at 320, 360, and 390 px portrait widths plus landscape and desktop.
- Test the built app under the GitHub Pages repository subpath, not only at `/`.
- Verify offline reload after first load and verify that a first-ever offline visit explains the limitation.
- Scan source, Git history under release, and build output for prohibited personal identifiers and common secret patterns.

### 15.2 Manual mobile and content review

- Complete both routines on iPhone Safari, an installed iPhone home-screen app, and Android Chrome.
- Lock/background for at least 30 seconds during a rep block and during a hold; confirm the app pauses and resumes without progress.
- Exercise mute, unavailable voice, denied Wake Lock, unavailable storage, reduced motion, large text, VoiceOver/TalkBack, keyboard, and rotation.
- Use flight mode after the first online load and complete both routines; animations, captions, tones, and progress must work. Voice is best-effort unless a local system voice is available.
- Review each animation against the supplied written plan. Mark the three documented setup ambiguities as schematic until clarified.
- Ideally obtain clinician visual review before describing any animation as exact technique.

### 15.3 Deployment

- The public application and product documentation do not identify the exercise participant and contain no clinician name, clinic, address, signature, source email, appointment detail, diagnosis, token, or environment secret. Normal Git authorship remains the repository owner’s identity without linking that identity to receiving treatment.
- A fail-closed release scanner examines every Git-tracked file and the freshly built `dist/` tree, reports only finding kind/path/line/count, and never echoes a matched value.
- Every third-party Action is pinned to a verified full commit. Workflow permissions default to none; build receives only source-read access, while only the main-branch deployment job receives Pages and identity-token write access.
- Public history begins from a sanitized isolated `main` checkout. The private granular development history is neither rewritten nor pushed.
- GitHub Pages uses one Actions-based publishing source and the deployment job reports success.
- Manifest, icons, deep links, service-worker file, cache scope, and all assets return successfully under the production subpath.
- Network inspection during a session shows no analytics, upload, third-party embed, or unexpected TTS request attributable to the app.
- The production URL is opened on mobile, installed, run offline, and checked again after a version update.
- Release is complete only when source push, Pages deployment, and live-site verification are all independently observed.

## 16. First-release acceptance criteria

The release is accepted when all of the following are true:

1. `Start Back`, `Start Left Toe`, or `Resume` begins guidance with one tap.
2. The app presents exactly the plan frequencies and dose:
   - Back: most days;
   - standing knee bends 6 × 3, then full down/up 8;
   - bridge 10 × 2;
   - forearm cobra 10, hand cobra 10;
   - Superman 8 × 2 each side;
   - foam roller 10 × 2;
   - Left Toe: 4× per week;
   - big-toe lift 20;
   - banded toe pointing 20;
   - arch lift 10 × 3;
   - balance 10 or 15 seconds × 4.
3. The player never advances across a major setup change until the user presses `I’m ready`.
4. Pause stops motion, deadline, count, tone, and speech together.
5. Backgrounding or locking cannot consume progress.
6. Every audible cue exists as visible English text.
7. Toe and arch movements use dedicated close-ups; bridge uses articulation detail; foam-roller setup shows roller orientation.
8. A skipped exercise produces an honest saved summary, not “session complete.”
9. The session remains operable when voice, Wake Lock, storage, or service-worker support is absent.
10. No personal data or health narrative exists in public source or build output, and no local history is transmitted.
11. The installed app opens correctly from the GitHub Pages subpath and works offline after first load.
12. The live URL and deployment state are verified rather than inferred from a push or workflow start.

## 17. Deferred decisions

These are explicitly deferred rather than silently assumed:

- exact clinical endpoints for the standing full-down phase;
- band anchor for big-toe pointing;
- precise heavy-band placement and resistance direction;
- clinician review of every animation;
- redistribution-safe pre-recorded spoken prompts;
- a dedicated custom domain to isolate web storage from other project sites;
- 3D avatar, filmed demonstration, camera form feedback, cloud history, and clinician sharing.

None blocks a labelled, schematic personal-use MVP. They do block claims that the animation is an exact clinical demonstration or that the app evaluates movement.
