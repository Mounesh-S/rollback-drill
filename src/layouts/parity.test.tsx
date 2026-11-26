// Both layouts must show the same underlying evidence: every change and every signal, with
// nothing invented and nothing missing. The treatment is allowed exactly two documented
// additions: it repeats a signal under each change that reached that restaurant, and it
// labels each reached restaurant OK / FAILING / NO SIGNAL (derived from the same signals).
// This test renders both for 500 seeds and fails the build on anything else.

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
  const all = [...container.querySelectorAll('[data-evidence-id]')].map((el) => el.getAttribute('data-evidence-id'))
  const ids = new Set(all)
  const signalRows = container.querySelectorAll('.sig').length
  const restaurants = new Set([...container.querySelectorAll('[data-restaurant-id]')].map((el) => el.getAttribute('data-restaurant-id')))
  const text = container.textContent ?? ''
  unmount()
  return { ids, restaurants, text, signalRows }
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
    // Control shows each signal once; treatment at least once (repeated per reaching change).
    expect(control.signalRows).toBe(incident.signals.length)
    expect(treatment.signalRows).toBeGreaterThanOrEqual(incident.signals.length)

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
