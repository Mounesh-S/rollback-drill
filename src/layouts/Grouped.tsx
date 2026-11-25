// Treatment layout: the same evidence grouped by change, with the status of every
// restaurant each change reached shown beside it. Changes keep chronological order,
// so grouping is the only difference from the control.

import { getRestaurant, restaurantStatus } from '../game/evidence.ts'
import type { Incident } from '../game/types.ts'
import { ChangeHeader, SignalRow, TargetStatus } from './parts.tsx'

export function Grouped({ incident }: { incident: Incident }) {
  const status = restaurantStatus(incident)
  const reached = new Set(incident.changes.flatMap((c) => c.targets))
  const unrelated = incident.signals.filter((s) => !reached.has(s.restaurantId))

  return (
    <div className="evidence" data-layout="grouped">
      {incident.changes.map((change) => {
        const signals = incident.signals.filter((s) => change.targets.includes(s.restaurantId))
        return (
          <section key={change.id} className="group" aria-label={`Change ${change.id}`}>
            <ChangeHeader change={change} />
            <h3>Restaurants this change reached</h3>
            <ul className="target-list">
              {change.targets.map((id) => (
                <TargetStatus key={id} restaurant={getRestaurant(incident, id)} status={status.get(id) ?? 'no-signal'} />
              ))}
            </ul>
            <h3>Signals from those restaurants</h3>
            <ul className="signal-list">
              {signals.map((s) => (
                <SignalRow key={s.id} signal={s} restaurant={getRestaurant(incident, s.restaurantId)} />
              ))}
            </ul>
          </section>
        )
      })}

      {unrelated.length > 0 && (
        <section className="group" aria-label="Restaurants not reached by any change">
          <h3>Restaurants no recent change reached</h3>
          <ul className="signal-list">
            {unrelated.map((s) => (
              <SignalRow key={s.id} signal={s} restaurant={getRestaurant(incident, s.restaurantId)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
