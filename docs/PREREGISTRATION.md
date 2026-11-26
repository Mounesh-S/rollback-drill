# Pre-registration: Rollback Drill experiment

Written and committed **before** the Production experiment starts. Git commit times can be set
by the author, so the evidence is the time this file was **pushed to GitHub** (visible in the
repository's commit history and Actions runs) before the experiment's `started_at` in Flagsmith.
Any change is listed under "Amendments" with a reason.

## Question

During an incident, does grouping evidence by change, with the status of every restaurant each
change reached, help an on-call engineer pick the right change to roll back first?

## Hypothesis

- **H1:** players shown the **grouped** layout make a correct first rollback, in time and without
  leaving the drill window, more often than players shown the **chronological** feed.

The treatment is a package, and we test it as one: it (a) groups the evidence under each change
and (b) labels every restaurant a change reached OK / FAILING / NO SIGNAL. The labels are derived
from the same signals the control shows; nothing is added that a careful reader of the control
could not work out. A positive result means "this way of presenting the evidence helps", not
"grouping alone helps".
- **H0:** no difference.

## Design

| Item | Value |
|---|---|
| Flag | `incident_evidence_layout` (multivariate) |
| Control | `chronological`: one time-ordered log of changes and signals |
| Treatment | `grouped`: the same evidence grouped by change, with the status of every restaurant it reached (signals repeat under each change that reached that restaurant) |
| Assignment | Flagsmith Experimentation, 100% rollout, 50/50 split |
| Unit | One anonymous browser identity (random UUID; no personal data) |
| Exposure | Recorded when the evidence screen first renders, after the player presses Start |
| Incident | Unique per player (seeded), identical structure and difficulty for everyone. The culprit's time slot (oldest, middle, newest) and type are random, and every change reaches one silent restaurant, so no shortcut beats chance (tested) |
| Evidence parity | Both layouts render exactly the same evidence; enforced by a CI test over 500 seeds |
| Attempts | One live attempt per browser; reloads mid-round count as abandoned; a second tab cannot start another round or see the answer |

## Metrics

| Role | Metric | Event | Expected direction |
|---|---|---|---|
| **Primary** | `correct_first_rollback` (occurrence) | Correct first answer, within the time limit, without leaving the drill window (tab hidden or window blurred) | Increase |
| Secondary | `decision_time_ms` (mean of the `decision_submitted` value) | Time from Start to the first answer | Decrease |
| Guardrail | `decision_submitted` (occurrence) | Any first answer in time | Must not decrease |
| Guardrail | `tab_left` (occurrence) | Tab hidden or window blurred during the round (also fires on a mid-round reload) | Must not increase |
| Reporting only | `self_reported_help` (occurrence, informational) | Player says they had outside help | Not used in the decision |

Timeouts, wrong answers, abandoned rounds and tab-leavers all stay in the denominator as
non-conversions.

## Sample and stopping rule

- Target: at least **100 identities per arm**. Flagsmith shows "collecting data" until each arm has
  50 identities and, for conversion metrics, 5 conversions
  ([statistics docs](https://docs.flagsmith.com/experimentation/statistics)).
- **Sensitivity:** with about 100 identities per arm and a control rate near 50%, only an
  absolute difference of roughly **17-20 percentage points** is likely to reach the 95% threshold.
  The pilot tunes difficulty so the control sits near 40-60%, where the test is most sensitive.
  A smaller real effect will most likely be reported as inconclusive.
- **Distribution plan:** one post each in the WeMakeDevs and Flagsmith Discord communities (where
  sharing is allowed), personal invites to developer friends and colleagues, and one post on
  LinkedIn/X, all on Nov 26 evening and Nov 27. Each invite asks people not to share the answer.
- Data collection runs from the Production start (Nov 26, 2026, evening IST) to
  **Nov 29, 2026, 12:00 IST**. The experiment is not stopped early because of interim results;
  dashboards are watched only for data-quality problems.

## Data-quality check

Before reading any result, compute the sample-ratio-mismatch test on exposures per arm
(`npm run srm -- <results.json>`). If p < 0.01, assignment or tracking is broken and the result is
reported as **invalid**, not as a win or loss.

## Decision rule

1. **Ship `grouped`** if Flagsmith's chance to beat control on the **primary** metric is above 95%,
   and neither guardrail shows the wrong direction with more than 95% chance.
2. Otherwise **keep `chronological`** and report the result as inconclusive (or negative).
3. With two guardrails each checked at 95%, a true null can be blocked by chance up to about 10% of
   the time; a guardrail block is reported with that caveat.
4. Secondary metrics never decide the verdict. In the A/A validation run, a secondary metric reached
   95.5% "chance to win" with no real difference, which is exactly the false positive this rule
   protects against.

## Exclusions

- Practice mode (`?practice=1`) sends no events and is never analysed.
- Simulated traffic runs only in the Development environment and is never mixed into Production.
- No identity is removed after the fact.

## Known limitations

- Players may use outside help (AI, colleagues). Mitigations: unique incidents, time limit,
  leaving the window voids the attempt, and an optional self-report tracked as the informational
  metric `self_reported_help`. A second device cannot be detected.
- The time limit is part of what is being tested, so it cannot be extended for players who need
  more time (WCAG 2.2.1); practice mode has the same limit but no stakes.
- Clearing browser storage or switching devices creates a new identity.
- The audience is self-selected developers; results may not transfer to experienced on-call teams.
- Sample size will be small, so only a large effect can reach the decision threshold.

## Amendments

All made on Nov 26, 2026, **before** the Production experiment started, after an independent
review. No real data existed at the time.

1. **Removed shortcuts in the incident generator.** The culprit was always the middle change by
   time and the only one reaching a silent restaurant. Now its time slot is random and every change
   reaches one silent restaurant; tests check that timing-only and silent-restaurant strategies
   stay near chance.
2. **Leaving the window** now also counts window blur, not only a hidden tab (catches a second
   window side by side).
3. **One attempt across tabs:** a second tab cannot start a live round or see the answer.
4. **Self-report** became the informational metric `self_reported_help`.
5. **Treatment described honestly** as grouping plus derived restaurant status.
6. **Production experiment recreated** with five metrics: Flagsmith experiment **567**
   (replacing the unstarted, empty 489, because metrics cannot be changed after creation).
