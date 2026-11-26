// Last line of defence: an unexpected error shows a plain message instead of a blank page.
// Nothing is retried automatically, so a crash can never send duplicate events.

import { Component, type ReactNode } from 'react'
import { practiceUrl } from './lib/mode.ts'
import { Status } from './screens/Status.tsx'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[rollback-drill] crashed', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <Status label="ERROR" title="Something broke on our side">
        <p>Sorry about that. Reload the page, or try a practice incident.</p>
        <p>
          <a className="btn btn-ghost" href={practiceUrl()}>
            Run a practice incident
          </a>
        </p>
      </Status>
    )
  }
}
