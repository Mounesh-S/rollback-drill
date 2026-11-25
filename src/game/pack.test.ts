import { expect, test } from 'vitest'
import { validatePack } from './pack.ts'

test('rejects non-objects', () => {
  expect(validatePack(null)).toEqual(['pack must be a JSON object'])
})

test('lists every missing field', () => {
  expect(validatePack({ id: 'x' }).length).toBeGreaterThan(5)
})

test('rejects duplicate and too few restaurants', () => {
  const errors = validatePack({ restaurants: [{ name: 'A', area: 'X' }, { name: 'A', area: 'Y' }] })
  expect(errors).toContain('restaurant names must be unique')
  expect(errors.some((e) => e.includes('at least'))).toBe(true)
})
