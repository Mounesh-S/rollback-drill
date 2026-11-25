import { expect, test } from 'vitest'
import { mulberry32, pick, randInt, shuffle } from './rng.ts'

test('mulberry32 is deterministic and in [0, 1)', () => {
  const a = mulberry32(7)
  const b = mulberry32(7)
  for (let i = 0; i < 1000; i++) {
    const x = a()
    expect(x).toBe(b())
    expect(x).toBeGreaterThanOrEqual(0)
    expect(x).toBeLessThan(1)
  }
})

test('randInt stays within inclusive bounds and reaches both ends', () => {
  const rng = mulberry32(1)
  const seen = new Set<number>()
  for (let i = 0; i < 500; i++) seen.add(randInt(rng, 3, 6))
  expect([...seen].sort()).toEqual([3, 4, 5, 6])
})

test('shuffle keeps every item and does not mutate the input', () => {
  const input = [1, 2, 3, 4, 5]
  const out = shuffle(mulberry32(9), input)
  expect(out.sort()).toEqual([1, 2, 3, 4, 5])
  expect(input).toEqual([1, 2, 3, 4, 5])
})

test('pick throws on an empty list', () => {
  expect(() => pick(mulberry32(1), [])).toThrow()
})
