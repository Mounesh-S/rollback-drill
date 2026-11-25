// What one simulated player does. Pure and seeded, so a run is reproducible and testable.

import { mulberry32 } from '../src/game/rng.ts'

export type Arm = 'control' | 'treatment'

export interface SimRates {
  /** Chance a player who stays on the tab answers correctly. */
  correct: Record<Arm, number>
  /** Chance a player submits an answer at all (otherwise the timer runs out). */
  submit: number
  /** Chance a player leaves the tab during the round. */
  tabLeave: number
}

export interface SimOutcome {
  submitted: boolean
  decisionMs: number | null
  tabLeft: boolean
  converts: boolean // fires correct_first_rollback
}

export function simulatePlayer(seed: number, arm: Arm, rates: SimRates): SimOutcome {
  const rng = mulberry32(seed)
  const tabLeft = rng() < rates.tabLeave
  const submitted = rng() < rates.submit
  const decisionMs = submitted ? Math.round(15_000 + rng() * 55_000) : null
  const correct = submitted && rng() < rates.correct[arm]
  return { submitted, decisionMs, tabLeft, converts: correct && !tabLeft }
}
