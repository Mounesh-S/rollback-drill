import { FlagsmithContext } from '@flagsmith/flagsmith/react'
import type { IFlagsmith, IFlagsmithFeature } from '@flagsmith/flagsmith/types'
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { generateIncident } from '../game/generate.ts'
import { DEFAULT_PACK } from '../game/packs.ts'
import { ExperimentEvidence } from './ExperimentEvidence.tsx'

afterEach(cleanup)
const incident = generateIncident(4821, DEFAULT_PACK)

function renderWith(flag: IFlagsmithFeature | undefined) {
  const getExperimentFlag = vi.fn(() => flag ?? null)
  const client = {
    eventsEnabled: true,
    getAllFlags: () => (flag ? { incident_evidence_layout: flag } : {}),
    getContext: () => ({ identity: { identifier: 'player-1' } }),
    getExperimentFlag,
  } as unknown as IFlagsmith
  const { container } = render(
    <FlagsmithContext.Provider value={client}>
      <ExperimentEvidence incident={incident} />
    </FlagsmithContext.Provider>,
  )
  return { layout: container.querySelector('[data-layout]')?.getAttribute('data-layout'), getExperimentFlag }
}

const experiment = { id: 478, name: 'Rollback Drill: evidence layout', inExperiment: true }

test('treatment variant shows the grouped layout and records one exposure', () => {
  const r = renderWith({ enabled: true, value: 'grouped', variant: 'grouped', experiment })
  expect(r.layout).toBe('grouped')
  expect(r.getExperimentFlag).toHaveBeenCalledOnce()
})

test('control variant shows the chronological layout and records one exposure', () => {
  const r = renderWith({ enabled: true, value: 'chronological', variant: 'control', experiment })
  expect(r.layout).toBe('chronological')
  expect(r.getExperimentFlag).toHaveBeenCalledOnce()
})

test('not enrolled: control layout, no exposure', () => {
  const r = renderWith({ enabled: true, value: 'chronological', variant: 'control' })
  expect(r.layout).toBe('chronological')
  expect(r.getExperimentFlag).not.toHaveBeenCalled()
})

test('missing flag falls back to control', () => {
  expect(renderWith(undefined).layout).toBe('chronological')
})
