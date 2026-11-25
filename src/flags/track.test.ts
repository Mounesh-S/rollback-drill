import { expect, test, vi } from 'vitest'
import { EVENT } from '../game/events.ts'
import { flagsmithEmitter, flushOnPageHide } from './track.ts'

const client = () => ({ trackEvent: vi.fn(), flushEvents: vi.fn().mockResolvedValue(undefined) })

test('tracks the event with its value and flushes', () => {
  const c = client()
  const sent = vi.fn()
  flagsmithEmitter(c, sent)({ name: EVENT.decisionSubmitted, value: 1234 })
  expect(c.trackEvent).toHaveBeenCalledWith('decision_submitted', { value: 1234 })
  expect(c.flushEvents).toHaveBeenCalledOnce()
  expect(sent).toHaveBeenCalledWith({ name: 'decision_submitted', value: 1234 })
})

test('events without a value send no options', () => {
  const c = client()
  flagsmithEmitter(c)({ name: EVENT.correctFirstRollback })
  expect(c.trackEvent).toHaveBeenCalledWith('correct_first_rollback', undefined)
})

test('a failing flush never throws', async () => {
  const c = { trackEvent: vi.fn(), flushEvents: vi.fn().mockRejectedValue(new Error('offline')) }
  expect(() => flagsmithEmitter(c)({ name: EVENT.tabLeft })).not.toThrow()
})

test('flushes on pagehide until cleaned up', () => {
  const c = client()
  const stop = flushOnPageHide(c)
  window.dispatchEvent(new Event('pagehide'))
  expect(c.flushEvents).toHaveBeenCalledOnce()
  stop()
  window.dispatchEvent(new Event('pagehide'))
  expect(c.flushEvents).toHaveBeenCalledOnce()
})
