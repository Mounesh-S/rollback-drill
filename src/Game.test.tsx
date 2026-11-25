import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Game } from './Game.tsx'
import { generateIncident } from './game/generate.ts'
import { DEFAULT_PACK } from './game/packs.ts'
import { loadAttempt, saveAttempt } from './lib/storage.ts'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

const Live = () => <div data-testid="live-evidence" />
const live = { practice: false, layout: null, seed: null } as const

test('a live round persists in-progress then done, with events', () => {
  const emit = vi.fn()
  render(<Game mode={live} timerSeconds={75} LiveEvidence={Live} emit={emit} />)
  fireEvent.click(screen.getByRole('button', { name: /start/i }))
  expect(screen.getByTestId('live-evidence')).toBeInTheDocument()
  expect(loadAttempt()?.status).toBe('in-progress')

  const { seed } = loadAttempt()!
  const culprit = generateIncident(seed, DEFAULT_PACK).culpritId
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(culprit) }))
  fireEvent.click(screen.getByRole('button', { name: `Roll back ${culprit}` }))

  expect(loadAttempt()).toMatchObject({ seed, status: 'done', correct: true, counts: true })
  expect(emit).toHaveBeenCalled()
})

test('a returning player sees their result, not a new round', () => {
  saveAttempt({ seed: 99, status: 'done', ending: 'answered', answerId: 'CHG-1', decisionMs: 5000, correct: false, counts: false, tabLeft: false })
  render(<Game mode={live} timerSeconds={75} LiveEvidence={Live} emit={vi.fn()} />)
  expect(screen.queryByRole('button', { name: /start/i })).toBeNull()
  expect(screen.getByRole('heading', { name: /wrong rollback/i })).toBeInTheDocument()
})

test('reloading mid-round counts as abandoned', () => {
  saveAttempt({ seed: 99, status: 'in-progress', ending: null, answerId: null, decisionMs: null, correct: false, counts: false, tabLeft: false })
  render(<Game mode={live} timerSeconds={75} LiveEvidence={Live} emit={vi.fn()} />)
  expect(screen.getByRole('heading', { name: /abandoned/i })).toBeInTheDocument()
  expect(loadAttempt()?.ending).toBe('abandoned')
})

test('practice mode uses the chosen layout, records nothing and sends nothing', () => {
  const emit = vi.fn()
  render(<Game mode={{ practice: true, layout: 'grouped', seed: 4821 }} timerSeconds={75} LiveEvidence={Live} emit={emit} />)
  expect(screen.getByText(/practice mode/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /start/i }))
  expect(document.querySelector('[data-layout="grouped"]')).not.toBeNull()
  const culprit = generateIncident(4821, DEFAULT_PACK).culpritId
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(culprit) }))
  fireEvent.click(screen.getByRole('button', { name: `Roll back ${culprit}` }))
  expect(emit).not.toHaveBeenCalled()
  expect(loadAttempt()).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /practice incident/i }))
  expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
})
