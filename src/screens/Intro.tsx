import { useEffect, useLayoutEffect, useRef } from 'react'
import './screens.css'

interface IntroProps {
  timerSeconds: number
  practice: boolean
  onStart: () => void
}

export function Intro({ timerSeconds, practice, onStart }: IntroProps) {
  // Enter starts the drill even when the button doesn't have focus (e.g. a freshly opened tab).
  const start = useRef(onStart)
  useLayoutEffect(() => {
    start.current = onStart
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement)) start.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <header className="topbar">
        <span className="brand">ROLLBACK DRILL</span>
        <span className="dim">on-call simulator</span>
      </header>
      <main className="screen">
        {practice && <p className="banner">PRACTICE MODE · nothing is recorded</p>}
        <section className="page" aria-label="Incoming page">
          <div className="page-meta">
            <span className="sev">SEV2</span>
            <span className="label">PAGE · FOOD-DELIVERY PLATFORM · DINNER RUSH</span>
          </div>
          <h1>Orders are failing at some restaurants. You're on call.</h1>
          <p>
            Three changes went out in the last 30 minutes. You have {timerSeconds} seconds to pick the one to roll
            back first.
          </p>
        </section>

        <dl className="rules">
          <div>
            <dt>ATTEMPTS</dt>
            <dd>{practice ? 'Unlimited in practice.' : 'One.'} Your first answer is final.</dd>
          </div>
          <div>
            <dt>FOCUS</dt>
            <dd>Stay on this tab until you answer.</dd>
          </div>
          <div>
            <dt>HELP</dt>
            <dd>None. No AI, no colleagues. We're testing the screen, not you.</dd>
          </div>
          <div>
            <dt>KEYS</dt>
            <dd>
              <kbd>Enter</kbd> starts. <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> pick a change, <kbd>Enter</kbd> rolls it back.
            </dd>
          </div>
        </dl>

        <button className="btn" type="button" onClick={onStart} autoFocus>
          Acknowledge and start
        </button>
        <p className="fine">
          This browser keeps a random ID so you get one attempt. No name, no email, no tracking cookies.
        </p>
      </main>
    </>
  )
}
