import { beforeEach, expect, test, vi } from 'vitest'
import { getPlayerId, loadAttempt, resolveAbandoned, saveAttempt, type AttemptRecord } from './storage.ts'

beforeEach(() => localStorage.clear())

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
