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
| **Treatment** | `grouped`: the same evidence grouped by change, with the status of every restaurant it reached |
| **Primary metric** | `correct_first_rollback`: first answer correct, within the time limit, tab never left |
| **Guardrails** | `decision_submitted` must not drop; `tab_left` must not rise |
| **Decision rule** | Ship `grouped` only if its chance to beat control is above 95% on the primary metric |

The full plan was committed before launch: [docs/PREREGISTRATION.md](docs/PREREGISTRATION.md).

## How Flagsmith is used

- **Multivariate flag** `incident_evidence_layout` holds both layouts. The app reads it with
  `useExperiment` only on the evidence screen, so an exposure is recorded exactly when a player
  sees a layout ([src/flags/ExperimentEvidence.tsx](src/flags/ExperimentEvidence.tsx)).
- **Identities**: each browser gets a random UUID, used as its Flagsmith identity, so assignment is
  stable and exposures join to conversions.
- **Events**: the game emits typed events that map 1:1 to Flagsmith metrics and are flushed
  immediately ([src/game/events.ts](src/game/events.ts), [src/flags/track.ts](src/flags/track.ts)).
- **Kill switch** `game_enabled` and **remote config** `drill_config` (timer), kept separate from
  the experiment flag, which is locked while the test runs.
- **Server flags only**: the drill starts only after flags load from the server, because Flagsmith
  records exposures only for server-loaded flags.
- **CLI and API**: flags, metrics and experiments were created with the Flagsmith CLI
  (`flagsmith api ...`); every step is logged in [docs/DECISIONS.md](docs/DECISIONS.md).

## Making the test fair

- **Evidence parity:** a CI test renders both layouts for 500 incidents and fails if either adds,
  drops or hides any evidence ([src/layouts/parity.test.tsx](src/layouts/parity.test.tsx)).
- **Unique incident per player:** a seeded generator builds every incident with the same structure
  and difficulty, so sharing an answer or an AI's answer doesn't help anyone else. Every incident has
  exactly one correct answer, proven over 1,000 seeds in tests and 2,000 by `npm run validate-scenarios`.
- **One attempt per browser;** reloading mid-round counts as abandoned.
- **Leaving the tab voids the attempt** for the primary metric; an optional self-report records outside help.
- **Validated before launch:** an A/A run (no false winner on the primary metric) and a known-effect
  run, both with simulated players in the Development environment only
  ([docs/VALIDATION.md](docs/VALIDATION.md)).

## Try it

- **Live:** _link added at launch_
- **Judges / practice mode** (nothing recorded, choose the layout):
  `?practice=1&layout=grouped` or `?practice=1&layout=chronological`, optionally `&seed=4821`.
- Keys: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> pick a change, <kbd>Enter</kbd> rolls it back.

## Run it locally

```bash
npm ci
cp .env.example .env              # add your Flagsmith client-side environment key
npm run dev                       # http://localhost:5173
npm run check                     # typecheck, lint and 1,000+ tests
npm run validate-scenarios        # prove every scenario pack is solvable
SIM_ENV_KEY=<development key> npm run simulate -- --run aa-1 --users 400 --control 0.5 --treatment 0.5
```

Set up Flagsmith with: a multivariate flag `incident_evidence_layout` (control value
`chronological`, variant key `grouped`), flags `game_enabled` and `drill_config`
(`{"timerSeconds":75}`), the four metrics above, and an experiment using them. See
[docs/DECISIONS.md](docs/DECISIONS.md) for the exact API calls.

## Run this drill with your own team

Scenario packs are plain JSON in [scenarios/](scenarios/): services, restaurants (or any "tenants"),
change titles and symptoms. Add a pack, run `npm run validate-scenarios`, and the generator builds
solvable incidents from it.

## Project layout

```
src/game/      incident generator, solver, round state machine, events
src/layouts/   the two evidence layouts and the parity test
src/screens/   intro, play, result and status screens
src/flags/     Flagsmith: provider, experiment evidence, events, kill switch, config
scripts/       scenario validator and traffic simulator
docs/          pre-registration, decision log, validation, how it works
```

## Notes

- Built with help from an AI coding assistant; every file is small, commented and explained in
  [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).
- All restaurants, people and services are fictional.
