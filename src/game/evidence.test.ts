import { expect, test } from 'vitest'
import { getRestaurant, restaurantStatus } from './evidence.ts'
import { generateIncident } from './generate.ts'
import { DEFAULT_PACK } from './packs.ts'

test('every incident has 2 failing, 6 healthy and 1 silent restaurant', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const counts = { failing: 0, healthy: 0, 'no-signal': 0 }
    for (const s of restaurantStatus(generateIncident(seed, DEFAULT_PACK)).values()) counts[s]++
    expect(counts).toEqual({ failing: 2, healthy: 6, 'no-signal': 1 })
  }
})

test('getRestaurant finds known ids and throws on unknown ones', () => {
  const incident = generateIncident(5, DEFAULT_PACK)
  expect(getRestaurant(incident, 'r1').name).toBeTruthy()
  expect(() => getRestaurant(incident, 'nope')).toThrow()
})
