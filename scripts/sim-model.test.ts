import { expect, test } from 'vitest'
import { simulatePlayer, type SimRates } from './sim-model.ts'

const rates: SimRates = { correct: { control: 0.45, treatment: 0.65 }, submit: 0.92, tabLeave: 0.05 }

test('is deterministic per seed', () => {
  expect(simulatePlayer(1, 'control', rates)).toEqual(simulatePlayer(1, 'control', rates))
})

test('conversion rates follow the configured rates', () => {
  const rate = (arm: 'control' | 'treatment') => {
    let n = 0
    for (let s = 1; s <= 20_000; s++) if (simulatePlayer(s, arm, rates).converts) n++
    return n / 20_000
  }
  // expected = correct * submit * (1 - tabLeave)
  expect(rate('control')).toBeCloseTo(0.45 * 0.92 * 0.95, 1)
  expect(rate('treatment')).toBeCloseTo(0.65 * 0.92 * 0.95, 1)
})

test('no decision time without a submission, and tab-leavers never convert', () => {
  for (let s = 1; s <= 2000; s++) {
    const o = simulatePlayer(s, 'treatment', rates)
    if (!o.submitted) expect(o.decisionMs).toBeNull()
    if (o.tabLeft) expect(o.converts).toBe(false)
  }
})
