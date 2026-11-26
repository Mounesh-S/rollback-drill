# Rollback Drill

**A 75-second on-call drill that is also a live A/B test.** Orders are failing at some
restaurants and three changes just shipped. You pick the one to roll back first. Flagsmith
Experimentation decides how the evidence is laid out for you, and measures whether that layout
helps people make the right call.

Built for **Toggle Wars: the Flagsmith Experimentation Hackathon** (Track 01, Test Something Real).

## The experiment

| | |
|---|---|
| **Question** | Does grouping incident evidence by change help an on-call engineer choose the right rollback? |
| **Control** | `chronological`: one time-ordered log, like most incident timelines |
| **Treatment** | `grouped`: the same evidence grouped by change, with each reached restaurant labelled OK / FAILING / NO SIGNAL (derived from the same signals) |
| **Primary metric** | `correct_first_rollback`: first answer correct, within the time limit, without leaving the drill window |
| **Secondary** | `decision_time_ms`: mean time to the first answer |
| **Guardrails** | `decision_submitted` must not drop; `tab_left` must not rise |
| **Reporting only** | `self_reported_help`: players who say they had outside help |
| **Decision rule** | Ship `grouped` only if its chance to beat control is above 95% on the primary metric |

The full plan was committed before launch: [docs/PREREGISTRATION.md](docs/PREREGISTRATION.md).

## How Flagsmith is used

- **Multivariate flag** `incident_evidence_layout` holds both layouts. The app reads it with
  `useExperiment` only on the evidence screen, so an exposure is recorded exactly when a player
  sees a layout ([src/flags/ExperimentEvidence.tsx](src/flags/ExperimentEvidence.tsx)).
- **Identities**: each browser gets a random UUID, used as its Flagsmith identity, so assignment is
  stable and exposures join to conversions.
- **Events**: the game emits four typed events, which feed the five metrics
  (`decision_time_ms` is the mean of the `decision_submitted` value), and flushes them immediately ([src/game/events.ts](src/game/events.ts), [src/flags/track.ts](src/flags/track.ts)).
- **Kill switch** `game_enabled` and **remote config** `drill_config` (timer), kept separate from
  the experiment flag, which is locked while the test runs.
- **Server flags only**: the drill starts only after flags load from the server, because Flagsmith
  records exposures only for server-loaded flags.
- **CLI and API**: flags, metrics and experiments were created with the Flagsmith CLI; the exact
  commands are in [docs/FLAGSMITH-SETUP.md](docs/FLAGSMITH-SETUP.md) and every change is logged in
  [docs/DECISIONS.md](docs/DECISIONS.md).

## Making the test fair

- **Evidence parity:** a CI test renders both layouts for 500 incidents and fails if either drops or
  invents any change or signal. The treatment's only additions (repeating a signal under each change
  that reached it, and the derived status labels) are stated in the test
  ([src/layouts/parity.test.tsx](src/layouts/parity.test.tsx)).
- **No shortcuts:** every incident has exactly one correct answer (1,000 seeds in tests, 2,000 in
  `npm run validate-scenarios`), and tests check that guessing by time slot or by "the change with a
  silent restaurant" stays near chance. Each player gets a unique incident, so a shared answer is useless.
- **One attempt per browser, across tabs:** reloading mid-round counts as abandoned, and a second tab
  can neither start another round nor see the answer.
- **Leaving the window voids the attempt** (hidden tab or window blur); an optional self-report
  records outside help.
- **Pre-registered and checked:** decision rule, sensitivity and a sample-ratio-mismatch check
  (`npm run srm`) were fixed before launch.
- **Validated before launch:** an A/A run (no false winner on the primary metric) and a known-effect
  run, both with simulated players in the Development environment only
  ([docs/VALIDATION.md](docs/VALIDATION.md)).

## Try it

- **Live:** _link added at launch_
- **Judges / practice mode** (nothing recorded, choose the layout):
  `?practice=1&layout=grouped` or `?practice=1&layout=chronological`, optionally `&seed=4821`.
- Keys: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> pick a change, <kbd>Enter</kbd> rolls it back.

## Run it locally

Requires Node 22.18 or newer (scripts run TypeScript directly).

```bash
npm ci
cp .env.example .env              # add your Flagsmith client-side environment key
npm run dev                       # http://localhost:5173
npm run check                     # typecheck, lint and 1,000+ tests
npm run validate-scenarios        # prove every scenario pack is solvable
SIM_ENV_KEY=<development key> npm run simulate -- --run aa-1 --users 400 --control 0.5 --treatment 0.5
```

Flagsmith setup (flags, five metrics, experiment, start, results, rollout):
[docs/FLAGSMITH-SETUP.md](docs/FLAGSMITH-SETUP.md).

## Run this drill with your own team

Scenario packs are plain JSON in [scenarios/](scenarios/): services, restaurants (or any "tenants"),
change titles and symptoms. Write a pack, run `npm run validate-scenarios`, and register it in
`src/game/packs.ts`. See [scenarios/README.md](scenarios/README.md).

## Project layout

```
src/game/      incident generator, solver, round state machine, events
src/layouts/   the two evidence layouts and the parity test
src/screens/   intro, play, result and status screens
src/flags/     Flagsmith: provider, experiment evidence, events, kill switch, config
scripts/       scenario validator, traffic simulator, SRM check
docs/          pre-registration, decision log, validation, how it works
```

## Notes

- Built with help from an AI coding assistant; every file is small, commented and explained in
  [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).
- All restaurants, people and services are fictional.
