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
