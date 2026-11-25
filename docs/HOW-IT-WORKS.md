# How it works

A walk through the code, in the order a round happens. Read this before the demo: every
question a judge might ask is answered by one of these files.

## 1. An incident is generated (`src/game/`)

- `rng.ts`: `mulberry32` turns a 32-bit seed into a repeatable stream of random numbers.
- `generate.ts`: builds the incident from a seed and a scenario pack. Nine restaurants are picked:
  2 failing, 6 healthy, 1 silent. Three changes are created:
  - **culprit**: reached both failing restaurants and the silent one;
  - **recency trap**: shipped 1-3 minutes before the errors; reached one failing and two healthy;
  - **old decoy**: shipped earlier; reached the other failing one and two healthy.
  The culprit's type (deploy, flag, config) is random, so "it's always the flag" is useless.
- `solver.ts`: the rule a careful engineer uses. A change can be the cause only if it reached every
  failing restaurant and no healthy one. Tests prove exactly one change passes, for every seed.
- `pack.ts` + `scenarios/*.json`: the content. A pack is plain JSON and validated.

## 2. The player starts a round (`src/Game.tsx`, `src/game/Drill.tsx`)

- `Game.tsx` decides live or practice. Live: one attempt per browser, stored by
  `src/lib/storage.ts`. Practice: any layout and seed, nothing stored or sent.
- `Drill.tsx` runs one round. Its rules live in `round.ts`, a pure reducer:
  `intro -> playing -> done`. Only the first answer counts; the timer (`useCountdown`) and tab
  tracking (`useTabLeave`) feed actions into it.

## 3. Flagsmith picks the layout (`src/flags/`)

- `LiveRoot.tsx`: wraps live play in `FlagsmithProvider` with the player's UUID as identity,
  `enableEvents: true` and caching off. The drill waits until flags come from the server (the only
  case where Flagsmith records exposures). Also handles the kill switch (`game_enabled`), the
  remote timer (`drill_config`) and connection failures.
- `ExperimentEvidence.tsx`: calls `useExperiment('incident_evidence_layout')`. It is rendered only
  after Start, so the exposure is recorded when the layout is actually seen. Variant `grouped`
  shows `Grouped`; anything else shows `Chronological`.

## 4. The evidence is shown (`src/layouts/`)

- `Chronological.tsx` (control) and `Grouped.tsx` (treatment) render the same incident from shared
  parts in `parts.tsx`. Every piece of evidence carries `data-evidence-id`.
- `parity.test.tsx` renders both for 500 seeds and fails if the evidence differs.

## 5. The answer is scored and sent

- `round.ts` `scoreRound`: correct = the culprit was chosen; counts = correct and the tab was never left.
- `events.ts`: the four event names, typed so a typo is a compile error.
- `track.ts`: sends each event with `trackEvent` and flushes immediately, plus on `pagehide`.

| Event | When |
|---|---|
| exposure (automatic) | Evidence screen renders |
| `decision_submitted` (value = ms) | First answer, in time |
| `correct_first_rollback` | First answer correct, in time, tab never left |
| `tab_left` | Tab hidden during the round (once) |
| `self_reported_help` | Player says they had help |

## 6. Validation (`scripts/`)

- `validate-scenarios.ts`: checks every pack and proves 2,000 incidents per pack are solvable.
- `simulate.ts` + `sim-model.ts`: simulated players through the real SDK, Development only.
  Used for the A/A and known-effect runs in `docs/VALIDATION.md`.
