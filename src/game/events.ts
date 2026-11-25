// The game's analytics contract. The game only emits these typed events; Phase F maps them
// to Flagsmith. Names must match the Flagsmith metric definitions exactly (case-sensitive).

export const EVENT = {
  /** Primary metric: correct first answer, in time, tab never left. */
  correctFirstRollback: 'correct_first_rollback',
  /** Any first answer in time. `value` = decision time in ms (completion + mean time metrics). */
  decisionSubmitted: 'decision_submitted',
  /** Guardrail: the tab was hidden during the attempt (sent at most once). */
  tabLeft: 'tab_left',
  /** Reporting only: the player says they used outside help. */
  selfReportedHelp: 'self_reported_help',
} as const

export type GameEventName = (typeof EVENT)[keyof typeof EVENT]

export interface GameEvent {
  name: GameEventName
  value?: number
}

export type EmitEvent = (event: GameEvent) => void
