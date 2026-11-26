import { expect, test } from 'vitest'
import { srmPValue } from './srm.ts'

test('balanced arms are fine', () => expect(srmPValue(500, 500)).toBeCloseTo(1, 5))
test('known chi-square value: 190 vs 211 gives p ~ 0.294', () => expect(srmPValue(190, 211)).toBeCloseTo(0.294, 2))
test('a clear imbalance is flagged', () => expect(srmPValue(400, 600)).toBeLessThan(0.001))
test('no data is not a mismatch', () => expect(srmPValue(0, 0)).toBe(1))
