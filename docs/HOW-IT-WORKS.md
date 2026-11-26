# How it works

A walk through the code, in the order a round happens. Read this before the demo: every
question a judge might ask is answered by one of these files.

## 1. An incident is generated (`src/game/`)

- `rng.ts`: `mulberry32` turns a 32-bit seed into a repeatable stream of random numbers.
- `generate.ts`: builds the incident from a seed and a scenario pack. Nine restaurants are picked:
  2 failing, 4 healthy, 3 silent. Three changes are created:
  - **culprit**: reached both failing restaurants and one silent one;
  - **wrong A**: reached failing A, one healthy and one silent;
  - **wrong B**: reached failing B, one healthy and one silent.
  The three time slots (oldest, middle, newest) and the three types (deploy, flag, config) are dealt
  at random, so neither timing nor type gives the answer; the newest wrong change is a natural
  recency trap. Tests check those shortcuts stay near chance.
- `solver.ts`: the rule a careful engineer uses. A change can be the cause only if it reached every
  failing restaurant and no healthy one. Tests prove exactly one change passes, for every seed.
- `pack.ts` + `scenarios/*.json`: the content. A pack is plain JSON and validated.

## 2. The player starts a round (`src/Game.tsx`, `src/game/Drill.tsx`)

- `Game.tsx` decides live or practice. Live: one attempt per browser, stored by
  `src/lib/storage.ts`. Start re-checks storage, a round running in another tab is shown as "in
  progress" (no answer revealed), and `sessionStorage` tells a same-tab reload (abandoned) apart from
  another tab. Practice: any layout and seed, nothing stored or sent.
- `Drill.tsx` runs one round. Its rules live in `round.ts`, a pure reducer:
  `intro -> playing -> done`. Only the first answer counts, and an answer after the time limit is a
  timeout; the timer (`useCountdown`) and window tracking (`useTabLeave`: hidden tab or window blur)
  feed actions into it.

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
| `tab_left` | Tab hidden or window blurred during the round (once) |
| `self_reported_help` | Player says they had help |

## 6. Validation (`scripts/`)

- `validate-scenarios.ts`: checks every pack and proves 2,000 incidents per pack are solvable.
- `simulate.ts` + `sim-model.ts`: simulated players through the real SDK, only against allowlisted
  Development keys. Used for the A/A and known-effect runs in `docs/VALIDATION.md`.
- `srm.ts`: sample-ratio-mismatch check on exported results.
