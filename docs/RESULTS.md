# Results

Flagsmith experiment 567, Production environment, real players only. Generated with
`npm run report -- docs/production/results-2026-11-28.json` from the raw export in
[production/results-2026-11-28.json](production/results-2026-11-28.json).

**Status:** interim results at submission time (Nov 28, 2026, 21:23 IST). The pre-registered window
closes on Nov 29, 2026, 12:00 IST and the experiment is not stopped early. Reaching the rule's
minimum would take at least 45 more players in `control` and 40 more in `grouped` before then, so
the verdict below is not expected to change.

| Arm | Players exposed |
|---|---|
| `control` (control) | 5 |
| `grouped` (treatment) | 10 |

Sample ratio check: p = 0.197 (ok).

| Metric | Role | `control` | `grouped` | Lift (95% interval) | Chance `grouped` is better |
|---|---|---|---|---|---|
| `correct_first_rollback` | primary | 2/5 (40.0%) | 2/10 (20.0%) | n/a | n/a |
| `decision_time_ms` | secondary | 11.0 s | 6.5 s | n/a | n/a |
| `decision_submitted` | guardrail | 4/5 (80.0%) | 4/10 (40.0%) | n/a | n/a |
| `tab_left` | guardrail | 1/5 (20.0%) | 3/10 (30.0%) | n/a | n/a |
| `self_reported_help` | reporting | 0/5 (0.0%) | 1/10 (10.0%) | n/a | n/a |

**Verdict by the pre-registered rule:** **Not enough data.** Each arm needs at least 50 players and 5 conversions on the primary metric before the rule applies.

## What this means

- **The rule did its job.** With 5 and 10 players, any difference is noise. Flagsmith itself shows
  "collecting data" below 50 players per arm. The rule refuses to call a winner, so `chronological`
  stays the default. Calling `grouped` a loser from 2/5 vs 2/10 would be just as wrong.
- **The pipeline works end to end with real people.** Assignment, exposures, all five metrics and
  the sample ratio check (p = 0.197, balanced) came from real players on the live site.
- **The method was proven separately.** With 400 simulated players in the Development
  environment, an A/A test produced no false winner and a known 40% vs 70% effect was detected at
  96.9% ([VALIDATION.md](VALIDATION.md)). The setup is ready to rerun with a team's on-call
  rotation, where 100 players per arm is a realistic target.

## Decision

Keep `chronological` (control). On Nov 29 at 12:00 IST the experiment is completed in Flagsmith with
`rollout_decision: control`, as the pre-registered rule requires.
