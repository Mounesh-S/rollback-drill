import { describe, expect, test } from 'vitest'
import { formatClock, generateIncident } from './generate.ts'
import { PACKS } from './packs.ts'
import { viableChanges } from './solver.ts'
import { evidenceIds } from './types.ts'

const SEEDS = Array.from({ length: 1000 }, (_, i) => (i * 2654435761) >>> 0)

describe.each(PACKS.map((p) => [p.id, p] as const))('pack %s', (_id, pack) => {
  test('same seed gives the same incident', () => {
    expect(generateIncident(42, pack)).toEqual(generateIncident(42, pack))
    expect(generateIncident(42, pack)).not.toEqual(generateIncident(43, pack))
  })

  test.each(SEEDS.map((s) => [s]))('seed %i: exactly one viable change, and it is the culprit', (seed) => {
    const incident = generateIncident(seed, pack)
    const viable = viableChanges(incident)
    expect(viable).toHaveLength(1)
    expect(viable[0]!.id).toBe(incident.culpritId)
  })

  test('every incident has the same shape and difficulty', () => {
    for (const seed of SEEDS) {
      const inc = generateIncident(seed, pack)
      const errors = inc.signals.filter((s) => s.type === 'error')
      const healthy = inc.signals.filter((s) => s.type === 'healthy')

      expect(inc.changes).toHaveLength(3)
      expect(new Set(inc.changes.map((c) => c.kind)).size).toBe(3)
      expect(new Set(inc.changes.map((c) => c.id)).size).toBe(3)
      expect(errors).toHaveLength(4)
      expect(new Set(errors.map((e) => e.message)).size).toBe(1) // one consistent symptom
      expect(healthy).toHaveLength(6)
      expect(new Set(evidenceIds(inc)).size).toBe(evidenceIds(inc).length)

      // Chronological order, all changes before the errors start.
      const times = inc.changes.map((c) => c.at)
      expect(times).toEqual([...times].sort((a, b) => a - b))
      expect(Math.max(...times)).toBeLessThan(inc.onset)

      // Everything happens on the same day.
      for (const t of [...times, ...inc.signals.map((s) => s.at)]) {
        expect(t).toBeGreaterThanOrEqual(0)
        expect(t).toBeLessThan(24 * 60)
      }
    }
  })

  test('no shortcut beats reading the evidence', () => {
    // Accuracy of lazy strategies over many incidents. Each should be close to chance (1/3).
    const silent = (inc: ReturnType<typeof generateIncident>, id: string) =>
      !inc.signals.some((s) => s.restaurantId === id)
    const strategies: Record<string, (inc: ReturnType<typeof generateIncident>) => string> = {
      newest: (inc) => inc.changes[2]!.id,
      middle: (inc) => inc.changes[1]!.id,
      oldest: (inc) => inc.changes[0]!.id,
      'reached a silent restaurant': (inc) => inc.changes.find((c) => c.targets.some((t) => silent(inc, t)))!.id,
    }
    for (const [name, pickChange] of Object.entries(strategies)) {
      const hits = SEEDS.filter((seed) => {
        const inc = generateIncident(seed, pack)
        return pickChange(inc) === inc.culpritId
      }).length
      expect(hits / SEEDS.length, name).toBeLessThan(0.42)
    }
  })

  test('every change reaches exactly one silent restaurant', () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const inc = generateIncident(seed, pack)
      for (const c of inc.changes) {
        const silentTargets = c.targets.filter((t) => !inc.signals.some((s) => s.restaurantId === t))
        expect(silentTargets).toHaveLength(1)
      }
    }
  })

  test('the culprit kind varies across seeds', () => {
    const kinds = new Set(
      SEEDS.slice(0, 200).map((s) => {
        const inc = generateIncident(s, pack)
        return inc.changes.find((c) => c.id === inc.culpritId)!.kind
      }),
    )
    expect(kinds.size).toBe(3)
  })
})

test('formatClock', () => {
  expect(formatClock(0)).toBe('00:00')
  expect(formatClock(14 * 60 + 7)).toBe('14:07')
})
