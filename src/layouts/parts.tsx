// Building blocks shared by both layouts, so a piece of evidence looks identical in each.
// Every evidence element carries data-evidence-id; the parity test relies on it.

import type { RestaurantStatus } from '../game/evidence.ts'
import { formatClock } from '../game/generate.ts'
import type { Change, Restaurant, Signal } from '../game/types.ts'
import { KIND_LABEL } from './labels.ts'
import './evidence.css'

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
    <div className="chg" data-evidence-id={change.id}>
      <Clock minutes={change.at} />
      <span className="kind">{KIND_LABEL[change.kind]}</span>
      <code className="chg-id">{change.id}</code>
      <span className="chg-title">{change.title}</span>
      <span className="meta">
        {change.service} · {change.author}
      </span>
    </div>
  )
}

export function SignalRow({ signal, restaurant, className = '' }: { signal: Signal; restaurant: Restaurant; className?: string }) {
  const isError = signal.type === 'error'
  return (
    <li className={`sig sig-${signal.type} ${className}`.trim()} data-evidence-id={signal.id}>
      <Clock minutes={signal.at} />
      <span className="glyph" aria-hidden="true">
        {isError ? '✕' : '✓'}
      </span>
      <span>
        <span className="visually-hidden">{isError ? 'Error at ' : 'Healthy at '}</span>
        <RestaurantLabel restaurant={restaurant} />
      </span>
      <span className="sig-msg">{signal.message}</span>
    </li>
  )
}

const STATUS_TEXT: Record<RestaurantStatus, string> = { failing: 'FAILING', healthy: 'OK', 'no-signal': 'NO SIGNAL' }
const STATUS_GLYPH: Record<RestaurantStatus, string> = { failing: '✕', healthy: '✓', 'no-signal': '·' }

export function TargetStatus({ restaurant, status }: { restaurant: Restaurant; status: RestaurantStatus }) {
  return (
    <li className={`tgt tgt-${status}`}>
      <span className="glyph" aria-hidden="true">
        {STATUS_GLYPH[status]}
      </span>
      <RestaurantLabel restaurant={restaurant} />
      <span className="status">{STATUS_TEXT[status]}</span>
    </li>
  )
}
