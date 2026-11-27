import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { analyse, decide, toMarkdown, type Report } from './report.ts'

const load = (name: string) => JSON.parse(readFileSync(`docs/validation/${name}-results.json`, 'utf8'))

describe('real validation exports', () => {
  test('A/A run: no false winner', () => {
    const r = analyse(load('aa-1'))
    expect(r.exposures).toEqual({ control: 190, grouped: 211 })
    expect(r.srmP).toBeCloseTo(0.294, 2)
    expect(r.verdict).toBe('keep-inconclusive')
  })

  test('known-effect run: the winner ships', () => {
    expect(analyse(load('known-effect-1')).verdict).toBe('ship')
  })

  test('markdown names every metric and the verdict', () => {
    const md = toMarkdown(analyse(load('aa-1')))
    for (const name of ['correct_first_rollback', 'decision_submitted', 'decision_time_ms', 'tab_left']) expect(md).toContain(name)
    expect(md).toContain('80/190 (42.1%)')
    expect(md).toContain('Keep `control`')
  })
})

describe('decision rule', () => {
  const arm = (n: number, sum: number) => ({ n, sum, sum_squares: sum })
  const row = (role: 'primary' | 'guardrail', chanceToWin: number, n = 100, sum = 40): Report['rows'][number] => ({
    id: 1,
    info: { name: role, role, kind: 'occurrence' },
    control: arm(n, sum),
    treatment: arm(n, sum),
    lift: 0,
    ciLow: 0,
    ciHigh: 0,
    chanceToWin,
  })

  test('ships above 95%', () => expect(decide([row('primary', 0.96)], 0.5)).toBe('ship'))
  test('exactly 95% is not enough', () => expect(decide([row('primary', 0.95)], 0.5)).toBe('keep-inconclusive'))
  test('a guardrail clearly worse blocks the rollout', () =>
    expect(decide([row('primary', 0.99), row('guardrail', 0.03)], 0.5)).toBe('keep-guardrail'))
  test('a sample ratio mismatch voids everything', () => expect(decide([row('primary', 0.99)], 0.001)).toBe('invalid-srm'))
  test('small samples give no verdict', () => {
    expect(decide([row('primary', 0.99, 30)], 0.5)).toBe('not-enough-data')
    expect(decide([row('primary', 0.99, 100, 3)], 0.5)).toBe('not-enough-data')
  })
})
