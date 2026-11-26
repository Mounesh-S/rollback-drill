import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary.tsx'

afterEach(cleanup)

function Boom(): never {
  throw new Error('boom')
}

test('shows a message instead of a blank page', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  )
  expect(screen.getByRole('heading', { name: /something broke/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /practice/i })).toHaveAttribute('href', '?practice=1')
  spy.mockRestore()
})

test('renders children when nothing fails', () => {
  render(<ErrorBoundary>ok</ErrorBoundary>)
  expect(screen.getByText('ok')).toBeInTheDocument()
})
