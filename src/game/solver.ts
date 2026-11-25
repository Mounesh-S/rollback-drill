// The rule a careful engineer applies. A change can be the cause only if it reached
// every failing restaurant and no restaurant that is demonstrably healthy.

import type { Change, Incident } from './types.ts'

export function viableChanges(incident: Incident): Change[] {
  const failing = new Set(incident.signals.filter((s) => s.type === 'error').map((s) => s.restaurantId))
  const healthy = new Set(incident.signals.filter((s) => s.type === 'healthy').map((s) => s.restaurantId))

  return incident.changes.filter(
    (change) =>
      [...failing].every((id) => change.targets.includes(id)) && !change.targets.some((id) => healthy.has(id)),
  )
}
