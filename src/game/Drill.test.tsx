import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Drill, type DrillProps } from './Drill.tsx'
import { EVENT } from './events.ts'
import { generateIncident } from './generate.ts'
import { DEFAULT_PACK } from './packs.ts'

const incident = generateIncident(4821, DEFAULT_PACK)
const wrongId = incident.changes.find((c) => c.id !== incident.culpritId)!.id
let now = 0

beforeEach(() => {
  now = 0
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
})

function setup(overrides: Partial<DrillProps> = {}) {
  const emit = vi.fn()
  const onDone = vi.fn()
  render(
    <Drill
      incident={incident}
      timerSeconds={75}
      practice={false}
      renderEvidence={() => <div data-testid="evidence" />}
      emit={emit}
      clock={() => now}
      onDone={onDone}
      {...overrides}
    />,
  )
  return { emit, onDone }
}

const start = () => fireEvent.click(screen.getByRole('button', { name: /start/i }))
const answer = (id: string, at: number) => {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(id) }))
  now = at
  fireEvent.click(screen.getByRole('button', { name: `Roll back ${id}` }))
}
const names = (emit: ReturnType<typeof vi.fn>) => emit.mock.calls.map(([e]) => e.name)

test('evidence is only rendered after Start', () => {
  setup()
  expect(screen.queryByTestId('evidence')).toBeNull()
  start()
  expect(screen.getByTestId('evidence')).toBeInTheDocument()
})

test('correct answer emits decision time and the primary metric', () => {
  const { emit, onDone } = setup()
  start()
  answer(incident.culpritId, 38_000)
  expect(emit.mock.calls.map(([e]) => e)).toEqual([
    { name: EVENT.decisionSubmitted, value: 38_000 },
    { name: EVENT.correctFirstRollback },
  ])
  expect(screen.getByRole('heading', { name: /rollback correct/i })).toBeInTheDocument()
  expect(onDone).toHaveBeenCalledOnce()
})

test('wrong answer emits only the decision', () => {
  const { emit } = setup()
  start()
  answer(wrongId, 5_000)
  expect(names(emit)).toEqual([EVENT.decisionSubmitted])
  expect(screen.getByRole('heading', { name: /wrong rollback/i })).toBeInTheDocument()
})

test('leaving the tab is reported once and voids the primary metric', () => {
  const { emit } = setup()
  start()
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  fireEvent(document, new Event('visibilitychange'))
  fireEvent(document, new Event('visibilitychange'))
  answer(incident.culpritId, 10_000)
  expect(names(emit)).toEqual([EVENT.tabLeft, EVENT.decisionSubmitted])
  expect(screen.getByText(/left the tab/i)).toBeInTheDocument()
})

test('time running out ends the round with no events', () => {
  vi.useFakeTimers()
  const { emit } = setup()
  start()
  act(() => {
    now = 75_000
    vi.advanceTimersByTime(400)
  })
  expect(screen.getByRole('heading', { name: /timed out/i })).toBeInTheDocument()
  expect(emit).not.toHaveBeenCalled()
})

test('self-report is sent once', () => {
  const { emit } = setup()
  start()
  answer(wrongId, 1_000)
  fireEvent.click(screen.getByRole('button', { name: /i had help/i }))
  expect(names(emit)).toEqual([EVENT.decisionSubmitted, EVENT.selfReportedHelp])
  expect(screen.queryByRole('button', { name: /i had help/i })).toBeNull()
})

test('answer choices include every change exactly once', () => {
  setup()
  start()
  const radios = screen.getAllByRole('radio').map((r) => (r as HTMLInputElement).value)
  expect(radios.sort()).toEqual(incident.changes.map((c) => c.id).sort())
})

test('practice mode does not ask the honesty question', () => {
  setup({ practice: true })
  start()
  answer(wrongId, 1_000)
  expect(screen.queryByRole('button', { name: /i had help/i })).toBeNull()
})

test('keys 1-3 pick a change and Enter rolls it back', () => {
  const { emit } = setup()
  start()
  const radios = screen.getAllByRole('radio') as HTMLInputElement[]
  const index = radios.findIndex((r) => r.value === incident.culpritId)
  fireEvent.keyDown(window, { key: String(index + 1) })
  expect(radios[index]!.checked).toBe(true)
  now = 9_000
  fireEvent.keyDown(window, { key: 'Enter' })
  expect(names(emit)).toEqual([EVENT.decisionSubmitted, EVENT.correctFirstRollback])
})

test('Enter starts the drill from the intro', () => {
  setup()
  fireEvent.keyDown(window, { key: 'Enter' })
  expect(screen.getByTestId('evidence')).toBeInTheDocument()
})
