import { expect, test } from 'vitest'
import { parseMode, practiceUrl } from './mode.ts'

test('live play ignores layout and seed overrides', () => {
  expect(parseMode('?layout=grouped&seed=5')).toEqual({ practice: false, layout: null, seed: null })
})

test('practice mode reads layout and seed', () => {
  expect(parseMode('?practice=1&layout=grouped&seed=4821')).toEqual({ practice: true, layout: 'grouped', seed: 4821 })
})

test('invalid practice params fall back to null', () => {
  expect(parseMode('?practice=1&layout=evil&seed=-3')).toEqual({ practice: true, layout: null, seed: null })
  expect(parseMode('?practice=1&seed=abc').seed).toBeNull()
})

test('practiceUrl', () => {
  expect(practiceUrl()).toBe('?practice=1')
  expect(practiceUrl('grouped')).toBe('?practice=1&layout=grouped')
})
