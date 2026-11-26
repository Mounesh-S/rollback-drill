import { describe, expect, test } from 'vitest'
import { initialRound, roundReducer, scoreRound, type RoundAction, type RoundState } from './round.ts'

const run = (...actions: RoundAction[]): RoundState => actions.reduce(roundReducer, initialRound)

describe('roundReducer', () => {
  test('a normal round records the first answer and decision time', () => {
    const s = run({ type: 'start', now: 1000 }, { type: 'select', changeId: 'A' }, { type: 'submit', now: 38_400 })
    expect(s).toMatchObject({ phase: 'done', answerId: 'A', decisionMs: 37_400, ending: 'answered' })
  })

  test('only the first answer counts', () => {
    const s = run(
      { type: 'start', now: 0 },
      { type: 'select', changeId: 'A' },
      { type: 'submit', now: 10 },
      { type: 'select', changeId: 'B' },
      { type: 'submit', now: 20 },
    )
    expect(s.answerId).toBe('A')
    expect(s.decisionMs).toBe(10)
  })

  test('submit without a selection does nothing', () => {
    expect(run({ type: 'start', now: 0 }, { type: 'submit', now: 5 }).phase).toBe('playing')
  })

  test('nothing happens before start', () => {
    expect(run({ type: 'select', changeId: 'A' }, { type: 'submit', now: 5 }, { type: 'timeout' }, { type: 'tabLeft' })).toEqual(
      initialRound,
    )
  })

  test('timeout ends the round with no answer', () => {
    const s = run({ type: 'start', now: 0 }, { type: 'select', changeId: 'A' }, { type: 'timeout' }, { type: 'submit', now: 9 })
    expect(s).toMatchObject({ phase: 'done', ending: 'timeout', answerId: null })
  })

  test('tab leaving is only recorded while playing', () => {
    expect(run({ type: 'start', now: 0 }, { type: 'tabLeft' }).tabLeft).toBe(true)
    const after = run({ type: 'start', now: 0 }, { type: 'select', changeId: 'A' }, { type: 'submit', now: 1 }, { type: 'tabLeft' })
    expect(after.tabLeft).toBe(false)
  })
})

describe('scoreRound', () => {
  const answered = (id: string, tabLeft = false) => ({
    ...run({ type: 'start', now: 0 }, { type: 'select', changeId: id }, { type: 'submit', now: 1 }),
    tabLeft,
  })

  test('correct answer counts', () => expect(scoreRound(answered('C'), 'C')).toEqual({ correct: true, counts: true }))
  test('wrong answer', () => expect(scoreRound(answered('X'), 'C')).toEqual({ correct: false, counts: false }))
  test('correct but left the tab does not count', () =>
    expect(scoreRound(answered('C', true), 'C')).toEqual({ correct: true, counts: false }))
  test('timeout', () =>
    expect(scoreRound(run({ type: 'start', now: 0 }, { type: 'timeout' }), 'C')).toEqual({ correct: false, counts: false }))
})

test('an answer after the time limit counts as a timeout', () => {
  const s = run({ type: 'start', now: 0, limitMs: 75_000 }, { type: 'select', changeId: 'A' }, { type: 'submit', now: 75_150 })
  expect(s).toMatchObject({ phase: 'done', ending: 'timeout', answerId: null })
})
