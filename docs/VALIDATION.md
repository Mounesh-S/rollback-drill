# Pipeline validation (Development environment, simulated players)

Before any real player, the full pipeline was tested end to end through the real Flagsmith SDK:
identity, flag assignment, exposure, events, warehouse, results and rollout. **All data here is
simulated and comes from the Development environment. None of it is part of the experiment result.**

Simulator: `scripts/simulate.ts` (each simulated player is its own identity, reads the experiment flag
like the app, and sends the same events). Raw results are saved next to this file.

## 1. Live browser check (experiment 487)

A real round in the browser showed `inExperiment: true` for experiment 487 and three successful
event flushes: the exposure on Start, `decision_submitted` and `correct_first_rollback`.

## 2. A/A test: no difference built in (experiment 487)

400 simulated players, both arms answering correctly 50% of the time.

| Metric | Control n | Grouped n | Lift | Chance to beat control |
|---|---|---|---|---|
| **correct_first_rollback** (primary) | 190 | 211 | +8.1% | **74.4%**: no winner |
| decision_submitted | 190 | 211 | +1.3% | 68.3% |
| decision_time_ms | 190 | 211 | -7.4% | **95.5%**: false positive |
| tab_left | 190 | 211 | -28% | 79.8% |

**Pass.** The primary metric did not produce a false winner. A secondary metric crossed 95% by
chance, which is why the pre-registration lets only the primary metric decide.
Raw: [aa-1-results.json](validation/aa-1-results.json)

## 3. Known-effect test: real difference built in (experiment 488)

400 simulated players, control 40% vs grouped 70% correct (before submission and tab-leave losses).

| Metric | Control | Grouped | Lift | Chance to beat control |
|---|---|---|---|---|
| **correct_first_rollback** (primary) | 36 / 88 (40.9%) | 57 / 99 (57.6%) | +40.7% (95% CI -2.1% to +83.6%) | **96.9%**: winner detected |
| decision_submitted (guardrail) | 84 / 88 | 91 / 99 | -3.7% | 15.6% |
| tab_left (guardrail) | 5 / 88 | 5 / 99 | -11% | 58.0% |

**Pass.** The pipeline detected a real effect with about 90 players per arm. Raw:
[known-effect-1-results.json](validation/known-effect-1-results.json)

**Finding:** only 187 of 400 players were enrolled. The simulation started seconds after the
experiment, before the new configuration reached Flagsmith's edge API. Launch rule: after starting
the Production experiment, confirm enrolment with a probe identity before sharing the link.

## 4. Shipping rehearsal

Experiment 488 was completed with `rollout_decision: "variant"` and the `grouped` variant. New
identities immediately received `grouped` (the variant weight became 100%). Development was then reset
to the control layout (weight 0) for the pilot.

## What this shows

- Exposures and conversions are joined per identity and reach the results within minutes.
- The decision rule (primary metric only, >95%) behaves correctly with and without a real effect.
- With roughly 100 players per arm, only a large effect will cross the threshold.
