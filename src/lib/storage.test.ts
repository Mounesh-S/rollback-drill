import { beforeEach, expect, test, vi } from 'vitest'
import { getPlayerId, isRunningElsewhere, markThisTabPlaying, thisTabWasPlaying, loadAttempt, resolveAbandoned, saveAttempt, type AttemptRecord } from './storage.ts'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

const record: AttemptRecord = {
  seed: 7,
  status: 'in-progress',
  ending: null,
  answerId: null,
  decisionMs: null,
  correct: false,
  counts: false,
  tabLeft: false,
}

test('player id is a uuid and stays the same', () => {
  const id = getPlayerId()
  expect(id).toMatch(/^[0-9a-f-]{36}$/)
  expect(getPlayerId()).toBe(id)
})

test('attempt round-trips', () => {
  saveAttempt(record)
  expect(loadAttempt()).toEqual(record)
})

test('corrupt attempt data is ignored', () => {
  localStorage.setItem('rollback-drill:v1:attempt', '{not json')
  expect(loadAttempt()).toBeNull()
})

test('an unfinished round becomes abandoned', () => {
  expect(resolveAbandoned(record)).toMatchObject({ status: 'done', ending: 'abandoned' })
})

test('blocked storage does not throw', () => {
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(() => getPlayerId()).not.toThrow()
  expect(loadAttempt()).toBeNull()
  expect(() => saveAttempt(record)).not.toThrow()
  spy.mockRestore()
  vi.restoreAllMocks()
})

test('a just-started round counts as running elsewhere until its time is up', () => {
  const started = { ...record, startedAt: 1_000_000 }
  expect(isRunningElsewhere(started, 1_000_000 + 30_000, 75_000)).toBe(true)
  expect(isRunningElsewhere(started, 1_000_000 + 81_000, 75_000)).toBe(false)
  expect(isRunningElsewhere({ ...started, status: 'done' }, 1_000_100, 75_000)).toBe(false)
})

test('falls back to getRandomValues when randomUUID is unavailable', () => {
  const original = crypto.randomUUID
  Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
  try {
    expect(getPlayerId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  } finally {
    Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
  }
})

test('remembers which tab was playing', () => {
  expect(thisTabWasPlaying(7)).toBe(false)
  markThisTabPlaying(7)
  expect(thisTabWasPlaying(7)).toBe(true)
  expect(thisTabWasPlaying(8)).toBe(false)
})
