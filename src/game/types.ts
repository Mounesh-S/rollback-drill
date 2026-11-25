// Core data model. Both layouts render exactly this data; only the arrangement differs.

export const CHANGE_KINDS = ['deploy', 'flag_rollout', 'config_change'] as const
export type ChangeKind = (typeof CHANGE_KINDS)[number]

export interface Restaurant {
  id: string
  name: string
  area: string
}

/** A recent production change: one of the three rollback candidates. */
export interface Change {
  id: string // e.g. "CHG-4821", shown to the player and used as the answer
  kind: ChangeKind
  title: string
  service: string
  author: string
  at: number // minutes since midnight
  targets: string[] // restaurant ids the change was rolled out to
}

/** A monitoring signal from one restaurant. */
export interface Signal {
  id: string
  type: 'error' | 'healthy'
  at: number // minutes since midnight
  restaurantId: string
  message: string
}

export interface Incident {
  seed: number
  number: string // short display number, e.g. "#4821"
  packId: string
  platform: string
  headline: string
  onset: number // minutes since midnight when errors began
  restaurants: Restaurant[]
  changes: Change[] // in chronological order
  signals: Signal[] // in chronological order
  culpritId: string
}

/** Every piece of evidence has a stable id; used by the evidence-parity test. */
export function evidenceIds(incident: Incident): string[] {
  return [...incident.changes.map((c) => c.id), ...incident.signals.map((s) => s.id)]
}
