// Building blocks shared by both layouts, so a piece of evidence looks identical in each.
// Every evidence element carries data-evidence-id; the parity test relies on it.

import type { RestaurantStatus } from '../game/evidence.ts'
import { formatClock } from '../game/generate.ts'
import type { Change, ChangeKind, Restaurant, Signal } from '../game/types.ts'
import './evidence.css'

const KIND_LABEL: Record<ChangeKind, string> = {
  deploy: 'Deploy',
  flag_rollout: 'Flag rollout',
  config_change: 'Config change',
}

export function Clock({ minutes }: { minutes: number }) {
  return <time className="clock">{formatClock(minutes)}</time>
}

export function RestaurantLabel({ restaurant }: { restaurant: Restaurant }) {
  return (
    <span className="restaurant" data-restaurant-id={restaurant.id}>
      {restaurant.name}
      <span className="area">{restaurant.area}</span>
    </span>
  )
}

export function ChangeHeader({ change }: { change: Change }) {
  return (
    <div className="change-header" data-evidence-id={change.id}>
      <Clock minutes={change.at} />
      <span className="kind">{KIND_LABEL[change.kind]}</span>
      <code className="change-id">{change.id}</code>
      <span className="change-title">{change.title}</span>
      <span className="meta">
        {change.service} · {change.author}
      </span>
    </div>
  )
}

export function SignalRow({ signal, restaurant }: { signal: Signal; restaurant: Restaurant }) {
  const isError = signal.type === 'error'
  return (
    <li className={`signal signal-${signal.type}`} data-evidence-id={signal.id}>
      <Clock minutes={signal.at} />
      <span className="signal-icon" aria-hidden="true">
        {isError ? '✕' : '✓'}
      </span>
      <span>
        <span className="visually-hidden">{isError ? 'Error at ' : 'Healthy at '}</span>
        <RestaurantLabel restaurant={restaurant} />
      </span>
      <span className="signal-message">{signal.message}</span>
    </li>
  )
}

const STATUS_TEXT: Record<RestaurantStatus, string> = { failing: 'Failing', healthy: 'Healthy', 'no-signal': 'No signal' }
const STATUS_ICON: Record<RestaurantStatus, string> = { failing: '✕', healthy: '✓', 'no-signal': '–' }

export function TargetStatus({ restaurant, status }: { restaurant: Restaurant; status: RestaurantStatus }) {
  return (
    <li className={`target target-${status}`}>
      <span aria-hidden="true">{STATUS_ICON[status]}</span>
      <RestaurantLabel restaurant={restaurant} />
      <span className="status-text">{STATUS_TEXT[status]}</span>
    </li>
  )
}
