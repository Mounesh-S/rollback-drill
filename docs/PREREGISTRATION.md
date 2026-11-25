# Pre-registration: Rollback Drill experiment

Written and committed **before** the Production experiment starts. The git commit time of this
file is the proof that the hypothesis, metrics and decision rules were fixed before any real data.
Any later change is listed under "Amendments" with a reason.

## Question

During an incident, does grouping evidence by change, with the status of every restaurant each
change reached, help an on-call engineer pick the right change to roll back first?

## Hypothesis

- **H1:** players shown the **grouped** layout make a correct first rollback, in time and without
  leaving the tab, more often than players shown the **chronological** feed.
- **H0:** no difference.

## Design

| Item | Value |
|---|---|
| Flag | `incident_evidence_layout` (multivariate) |
| Control | `chronological`: one time-ordered log of changes and signals |
| Treatment | `grouped`: the same evidence grouped by change, with the status of every restaurant it reached |
| Assignment | Flagsmith Experimentation, 100% rollout, 50/50 split |
| Unit | One anonymous browser identity (random UUID; no personal data) |
| Exposure | Recorded when the evidence screen first renders, after the player presses Start |
| Incident | Unique per player (seeded), identical structure and difficulty for everyone |
| Evidence parity | Both layouts render exactly the same evidence; enforced by a CI test over 500 seeds |
| Attempts | One live attempt per identity; reloads mid-round count as abandoned |

## Metrics

| Role | Metric | Event | Expected direction |
|---|---|---|---|
| **Primary** | `correct_first_rollback` (occurrence) | Correct first answer, within the time limit, tab never left | Increase |
| Secondary | `decision_time_ms` (mean of the `decision_submitted` value) | Time from Start to the first answer | Decrease |
| Guardrail | `decision_submitted` (occurrence) | Any first answer in time | Must not decrease |
| Guardrail | `tab_left` (occurrence) | Tab hidden during the round | Must not increase |

Timeouts, wrong answers, abandoned rounds and tab-leavers all stay in the denominator as
non-conversions.

## Sample and stopping rule

- Target: at least **100 identities per arm**. Flagsmith shows no result below 50 identities and
  5 conversions per arm.
- Data collection runs from the Production start (Nov 26, 2026, evening IST) to
  **Nov 29, 2026, 12:00 IST**. The experiment is not stopped early because of interim results;
  dashboards are watched only for data-quality problems.

## Decision rule

1. **Ship `grouped`** if Flagsmith's chance to beat control on the **primary** metric is above 95%,
   and neither guardrail shows the wrong direction with more than 95% chance.
2. Otherwise **keep `chronological`** and report the result as inconclusive (or negative).
3. Secondary metrics never decide the verdict. In the A/A validation run, a secondary metric reached
   95.5% "chance to win" with no real difference, which is exactly the false positive this rule
   protects against.

## Exclusions

- Practice mode (`?practice=1`) sends no events and is never analysed.
- Simulated traffic runs only in the Development environment and is never mixed into Production.
- No identity is removed after the fact.

## Known limitations

- Players may use outside help (AI, colleagues). Mitigations: unique incidents, time limit,
  tab-leave rule, and an optional self-report (`self_reported_help`), reported separately.
- Clearing browser storage or switching devices creates a new identity.
- The audience is self-selected developers; results may not transfer to experienced on-call teams.
- Sample size will be small, so only a large effect can reach the decision threshold.

## Amendments

None yet.
