// The experiment is only fair if both layouts show the same evidence. This test renders
// both for 500 seeds and fails the build if either one adds, drops or hides anything.

import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { generateIncident } from '../game/generate.ts'
import { DEFAULT_PACK } from '../game/packs.ts'
import { evidenceIds } from '../game/types.ts'
import { Chronological } from './Chronological.tsx'
import { Grouped } from './Grouped.tsx'

afterEach(cleanup)

function shownEvidence(ui: React.ReactElement) {
  const { container, unmount } = render(ui)
  const ids = new Set([...container.querySelectorAll('[data-evidence-id]')].map((el) => el.getAttribute('data-evidence-id')))
  const restaurants = new Set([...container.querySelectorAll('[data-restaurant-id]')].map((el) => el.getAttribute('data-restaurant-id')))
  const text = container.textContent ?? ''
  unmount()
  return { ids, restaurants, text }
}

test('both layouts show exactly the same evidence for 500 seeds', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const incident = generateIncident(seed, DEFAULT_PACK)
    const expected = new Set(evidenceIds(incident))
    const control = shownEvidence(<Chronological incident={incident} />)
    const treatment = shownEvidence(<Grouped incident={incident} />)

    expect(control.ids).toEqual(expected)
    expect(treatment.ids).toEqual(expected)
    expect(treatment.restaurants).toEqual(control.restaurants)

    // Every change title and signal message is visible in both.
    for (const text of [...incident.changes.map((c) => c.title), ...incident.signals.map((s) => s.message)]) {
      expect(control.text).toContain(text)
      expect(treatment.text).toContain(text)
    }
  }
}, 30_000) // renders 1000 layouts; slow when the suite runs in parallel

test('neither layout gives away the answer', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const incident = generateIncident(seed, DEFAULT_PACK)
    for (const ui of [<Chronological key="c" incident={incident} />, <Grouped key="g" incident={incident} />]) {
      const { text } = shownEvidence(ui)
      expect(text.toLowerCase()).not.toMatch(/culprit|root cause|correct/)
    }
  }
})
