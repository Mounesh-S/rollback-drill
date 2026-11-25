import { FlagsmithContext } from '@flagsmith/flagsmith/react'
import type { IFlags, IFlagsmith, LoadingState } from '@flagsmith/flagsmith/types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { LiveGate } from './LiveRoot.tsx'

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const live = { practice: false, layout: null, seed: null } as const

function fakeClient(loadingState: Partial<LoadingState>, flags: IFlags = {}) {
  return {
    loadingState: { isLoading: false, isFetching: false, error: null, source: 'SERVER', ...loadingState },
    eventsEnabled: true,
    getAllFlags: () => flags,
    hasFeature: (k: string) => Boolean(flags[k]?.enabled),
    getValue: (k: string) => flags[k]?.value ?? null,
    getTrait: () => null,
    getContext: () => ({ identity: { identifier: 'player-1' } }),
    getExperimentFlag: vi.fn(),
    trackEvent: vi.fn(),
    flushEvents: vi.fn().mockResolvedValue(undefined),
  } as unknown as IFlagsmith
}

const renderGate = (client: IFlagsmith) =>
  render(
    <FlagsmithContext.Provider value={client}>
      <LiveGate mode={live} />
    </FlagsmithContext.Provider>,
  )

test('waits for server flags before offering the drill', () => {
  renderGate(fakeClient({ isLoading: true, source: 'NONE' as LoadingState['source'] }))
  expect(screen.getByText(/paging/i)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /start/i })).toBeNull()
})

test('cached flags are not enough to start', () => {
  renderGate(fakeClient({ source: 'CACHE' as LoadingState['source'] }))
  expect(screen.queryByRole('button', { name: /start/i })).toBeNull()
})

test('a connection error offers practice without using the attempt', () => {
  renderGate(fakeClient({ error: new Error('offline'), source: 'NONE' as LoadingState['source'] }))
  expect(screen.getByRole('heading', { name: /can't reach/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /practice/i })).toHaveAttribute('href', '?practice=1')
  expect(localStorage.length).toBe(0)
})

test('gives up after 8 seconds of connecting', () => {
  vi.useFakeTimers()
  renderGate(fakeClient({ isLoading: true, source: 'NONE' as LoadingState['source'] }))
  act(() => vi.advanceTimersByTime(8000))
  expect(screen.getByRole('heading', { name: /can't reach/i })).toBeInTheDocument()
})

test('the kill switch shows maintenance', () => {
  renderGate(fakeClient({}, { game_enabled: { enabled: false, value: null } }))
  expect(screen.getByRole('heading', { name: /paused/i })).toBeInTheDocument()
})

test('server flags start the drill with the remote timer', () => {
  renderGate(fakeClient({}, { game_enabled: { enabled: true, value: null }, drill_config: { enabled: true, value: '{"timerSeconds":60}' } }))
  expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
  expect(screen.getByText(/60 seconds/)).toBeInTheDocument()
})

test('missing support flags still start with the default timer', () => {
  renderGate(fakeClient({}))
  expect(screen.getByText(/75 seconds/)).toBeInTheDocument()
})
