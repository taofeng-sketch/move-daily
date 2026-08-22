# Move Daily

**Status:** Implemented; live verification pending
**Outcome:** Publish a mobile-first, installable exercise coach that turns a supplied physiotherapy plan into clear, paced, one-tap guided sessions.

## Project rules

- The public application and product documentation must not identify the exercise participant and must contain no clinician name, clinic details, diagnosis, email content, appointment details, or contact information. Normal Git authorship remains Tao Feng, but no content connects the publisher identity to receiving treatment.
- Treat the supplied clinician plan as the only source for exercise names, instructions, frequency, repetitions, sets, sides, and hold duration.
- Do not invent clinical range, resistance, tempo, rest, pain threshold, progression, correction, or form-scoring guidance.
- The product is a plan player and reminder, not diagnosis, treatment advice, camera-based assessment, or a substitute for a physiotherapist.
- All user-facing copy and spoken prompts are English.
- No account, backend, analytics, camera, microphone, advertising, or third-party embed.
- Exercise history remains on the device and contains no symptom, diagnosis, pain, or free-text data.
- The session must remain usable without voice, Wake Lock, persistent storage, installation, or a network connection after the first successful load.
- Position or equipment changes require a visible readiness gate. Once ready, the movement block may advance automatically.
- Run the full content, state-machine, accessibility, privacy, offline, and deployed-site checks in the design before release.

## Source of truth

| Name | Description |
| --- | --- |
| [Product design](docs/superpowers/specs/2026-08-22-move-daily-design.md) | Approved direction, exact routine mapping, interaction states, privacy boundary, and release criteria. |
| [Implementation plan](docs/superpowers/plans/2026-08-22-move-daily-implementation.md) | Agent-ready task graph, frozen interfaces, rationale, TDD steps, ownership boundaries, and deployment gates. |
| [Public README](README.md) | Product boundary, local commands, architecture, privacy limits, schematic ambiguities, and intended public URLs. |

## Release handoff

- Local release command: `npm run verify:release`.
- Intended source: `https://github.com/taofeng-sketch/move-daily`.
- Intended site: `https://taofeng-sketch.github.io/move-daily/`.
- The repository and site are not considered live until the safe Task 14 publication sequence is completed and both exact workflow runs are observed at terminal success.
- Publish from an isolated, sanitized `main` checkout; do not rewrite or expose the private granular development history.
- Keep `.superpowers/` ignored. It is an internal execution ledger, not public product documentation.
