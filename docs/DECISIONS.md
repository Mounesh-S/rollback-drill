# Decision log

Every change to flags, metrics, experiments and timing, with the reason. Times are IST.

## 2026-11-25

- **Experiment flag** `incident_evidence_layout` (multivariate): control value `chronological`, variant `grouped` (key `grouped`). Control identities receive `variant: "control"`, so the app renders the treatment only for `variant === "grouped"`.
- **Development experiment 478** created (not started), 100% rollout, 50/50, primary metric `correct_first_rollback` (occurrence, increase).
- **Support flags** created: `game_enabled` (kill switch, on) and `drill_config` = `{"timerSeconds":75}`.
- **Metrics** in Development: `decision_submitted` (occurrence, higher is better), `decision_time_ms` (mean of the `decision_submitted` value, lower is better), `tab_left` (occurrence, lower is better).
- **Finding:** an experiment's metrics cannot be changed after creation (`Cannot change the metrics of an existing experiment.`). Experiment 478 therefore only has the primary metric. **The Production experiment must be created with all four metrics at once:**
  1. `correct_first_rollback`: increase (primary)
  2. `decision_time_ms`: decrease
  3. `decision_submitted`: not_decrease (guardrail: completion must not drop)
  4. `tab_left`: not_increase (guardrail)
- **Finding:** metric `direction` accepts only `up`, `down` and `informational`; experiment `expected_direction` accepts `increase`, `decrease`, `not_increase` and `not_decrease`.
- **Flag caching is off** in the SDK, because Flagsmith only records an exposure for flags loaded from the server. The drill cannot start until server flags arrive.

- **18:11 UTC:** deleted unstarted Development experiment 478 (no data) and created **experiment 487** with all four metrics; started it to validate the pipeline.
- **Live check:** a real browser round in Development showed `inExperiment: true`, experiment 487, and three successful event flushes (exposure, decision, conversion).
- **A/A run** (`aa-1`, 400 simulated players, equal 50% rates): primary metric 74% chance to win, so no false winner. A secondary metric (`decision_time_ms`) reached 95.5% by chance. Experiment 487 completed with decision `control`.
- **Known-effect run** (`ke-1`, 400 simulated players, 40% vs 70%) in **experiment 488**. Finding: 213 of 400 players ran before the new experiment reached the edge API and were not enrolled. **Launch rule:** after starting the Production experiment, confirm enrolment with a probe identity before sharing the link.
- **Finding:** an experiment is ended with `POST .../experiments/<id>/complete/` and a `rollout_decision` (`control` keeps the control value).
- **Production prepared:** metrics 475 (`correct_first_rollback`), 476 (`decision_time_ms`), 477 (`decision_submitted`), 478 (`tab_left`) and **experiment 489**, created and **not started**. One `warehouse_connection_check` event sent so the Production warehouse connects; no metric counts it.
- **Known-effect result** (experiment 488): primary 40.9% vs 57.6%, 96.9% chance to beat control; guardrails fine.
- **Ship rehearsal:** completed 488 with `{"rollout_decision":"variant","rollout_variant":36823}`; every new identity received `grouped`. Shipping sets the variant weight to 100%.
- **Development reset** to control with `flagsmith flag update incident_evidence_layout --weight grouped=0`.

## 2026-11-26

- **Independent review** before launch found a timing shortcut in the generator (culprit always the middle change), second-tab answer leaks and retries, and a weak tab-leave rule. All fixed before any real data; see the amendments in PREREGISTRATION.md.
- **Production:** created metric 562 `self_reported_help` (informational), deleted the unstarted, empty experiment 489 and created **experiment 567** with five metrics. Not started.
- **Deployed** to Vercel (Production key on the live site, Development key on previews).
- **Launch, 21:17 IST:** code frozen with git tag `experiment-v1`; **Production experiment 567 started** (`started_at` 2026-11-26T15:47:38Z). Pre-launch checks: flags `game_enabled` on, `drill_config` `{"timerSeconds":75}`, `grouped` weight 0 outside the experiment, five metrics attached, Production bundle uses the Production key only.
- **Enrolment probe:** 20 new probe identities (flag reads only, no events, so no exposures) all returned `in_experiment: true` for 567, split 10 control / 10 grouped. Link released for sharing after this check.
- **Pilot skipped** to maximise data-collection time; the timer stays at the pre-registered 75 seconds.
