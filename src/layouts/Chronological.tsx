// Control layout: every change and signal in one log, oldest first.
// This is how most incident timelines look today.

import { Fragment } from 'react'
import { getRestaurant } from '../game/evidence.ts'
import type { Change, Incident, Signal } from '../game/types.ts'
import { ChangeHeader, RestaurantLabel, SignalRow } from './parts.tsx'

type FeedItem = { at: number; change: Change; signal?: undefined } | { at: number; signal: Signal; change?: undefined }

export function Chronological({ incident }: { incident: Incident }) {
  const items: FeedItem[] = [
    ...incident.changes.map((change) => ({ at: change.at, change })),
    ...incident.signals.map((signal) => ({ at: signal.at, signal })),
  ]
  // Oldest first; a change sorts before a signal at the same minute.
  items.sort((a, b) => a.at - b.at || (a.change ? -1 : 0) - (b.change ? -1 : 0))

  return (
    <ol className="evidence" data-layout="chronological" aria-label="Events in time order">
      {items.map((item) =>
        item.change ? (
          <li key={item.change.id} className="log-row log-change">
            <ChangeHeader change={item.change} />
            <p className="rollout">
              <span className="rollout-label">ROLLED OUT TO</span>
              {item.change.targets.map((id, i) => (
                <Fragment key={id}>
                  {i > 0 && ', '}
                  <RestaurantLabel restaurant={getRestaurant(incident, id)} />
                </Fragment>
              ))}
            </p>
          </li>
        ) : (
          <SignalRow
            key={item.signal.id}
            className="log-row"
            signal={item.signal}
            restaurant={getRestaurant(incident, item.signal.restaurantId)}
          />
        ),
      )}
    </ol>
  )
}
