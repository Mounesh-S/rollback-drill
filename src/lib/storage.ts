// Local, per-browser persistence. Every access is wrapped: private windows and blocked
// storage must never break the game, they just lose the "one attempt" memory.

import type { Ending } from '../game/round.ts'

const KEYS = {
  player: 'rollback-drill:v1:player',
  attempt: 'rollback-drill:v1:attempt',
} as const

/** What we remember about a player's single live attempt. */
export interface AttemptRecord {
  seed: number
  status: 'in-progress' | 'done'
  ending: Ending | null
  answerId: string | null
  decisionMs: number | null
  correct: boolean
  counts: boolean
  tabLeft: boolean
  /** Wall-clock ms when the round started; used to spot a round running in another tab. */
  startedAt?: number
}

export const ATTEMPT_KEY = KEYS.attempt

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable: carry on without persistence.
  }
}

/** RFC 4122 v4 id. randomUUID needs a secure context, so fall back to getRandomValues. */
function newUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Stable anonymous id for this browser. It is the Flagsmith identity: no personal data. */
export function getPlayerId(): string {
  const existing = read(KEYS.player)
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing
  const id = newUuid()
  write(KEYS.player, id)
  return id
}

export function loadAttempt(): AttemptRecord | null {
  const raw = read(KEYS.attempt)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AttemptRecord
    return typeof parsed.seed === 'number' && (parsed.status === 'in-progress' || parsed.status === 'done') ? parsed : null
  } catch {
    return null
  }
}

export function saveAttempt(record: AttemptRecord): void {
  write(KEYS.attempt, JSON.stringify(record))
}

/** A round that was started but never finished (reload, closed tab) is final: no free retries. */
export function resolveAbandoned(record: AttemptRecord): AttemptRecord {
  return record.status === 'in-progress' ? { ...record, status: 'done', ending: 'abandoned' } : record
}

/** True while a round started in this browser could still be running (in another tab). */
export function isRunningElsewhere(record: AttemptRecord, now: number, limitMs: number): boolean {
  return record.status === 'in-progress' && typeof record.startedAt === 'number' && now - record.startedAt < limitMs + 5000
}
