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
}

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

/** Stable anonymous id for this browser. It is the Flagsmith identity: no personal data. */
export function getPlayerId(): string {
  const existing = read(KEYS.player)
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing
  const id = crypto.randomUUID()
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
