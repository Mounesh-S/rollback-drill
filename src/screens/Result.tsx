import { useState } from 'react'
import type { Ending } from '../game/round.ts'
import type { Incident } from '../game/types.ts'
import { KIND_LABEL } from '../layouts/labels.ts'
import './screens.css'

export interface ResultSummary {
  ending: Ending | null
  answerId: string | null
  decisionMs: number | null
  correct: boolean
  tabLeft: boolean
}

interface ResultProps {
  incident: Incident
  result: ResultSummary
  practice: boolean
  /** Only offered right after a live round; absent for returning players. */
  onSelfReport?: () => void
  onPractice?: () => void
}

function verdict(r: ResultSummary): { title: string; line: string; tone: 'good' | 'bad' | 'none' } {
  if (r.ending === 'timeout') return { title: 'PAGE TIMED OUT', line: 'No rollback in time. Orders kept failing.', tone: 'bad' }
  if (r.ending === 'abandoned') return { title: 'DRILL ABANDONED', line: 'The round was left unfinished (reload or closed tab).', tone: 'none' }
  return r.correct
    ? { title: 'ROLLBACK CORRECT', line: 'Errors clearing. Orders are flowing again.', tone: 'good' }
    : { title: 'WRONG ROLLBACK', line: 'Errors continue at the failing restaurants.', tone: 'bad' }
}

export function Result({ incident, result, practice, onSelfReport, onPractice }: ResultProps) {
  const [reported, setReported] = useState(false)
  const culprit = incident.changes.find((c) => c.id === incident.culpritId)
  const v = verdict(result)

  return (
    <>
      <header className="topbar">
        <span className="brand">ROLLBACK DRILL</span>
        <span className="dim">{incident.number} · report</span>
      </header>
      <main className="screen">
        {practice && <p className="banner">PRACTICE MODE · nothing was recorded</p>}
        <section className={`verdict v-${v.tone}`}>
          <span className="label">OUTCOME</span>
          <h1>{v.title}</h1>
          <p>{v.line}</p>
        </section>

        <dl className="report">
          <div>
            <dt>YOU ROLLED BACK</dt>
            <dd className="mono">{result.answerId ?? 'nothing'}</dd>
          </div>
          {result.decisionMs !== null && (
            <div>
              <dt>TIME TO DECIDE</dt>
              <dd className="mono">{(result.decisionMs / 1000).toFixed(1)} s</dd>
            </div>
          )}
          {culprit && result.ending !== 'abandoned' && (
            <div>
              <dt>ACTUAL CAUSE</dt>
              <dd>
                <span className="mono">
                  {culprit.id} · {KIND_LABEL[culprit.kind]}
                </span>{' '}
                {culprit.title}
              </dd>
            </div>
          )}
          {!practice && result.ending === 'answered' && (
            <div>
              <dt>COUNTS IN THE TEST</dt>
              <dd>{result.tabLeft ? 'No. You left the drill window during the round.' : 'Yes.'}</dd>
            </div>
          )}
        </dl>

        {onSelfReport && (
          <section className="ask" aria-label="Outside help">
            <span className="label">ONE MORE THING</span>
            <p>Did anything help you decide? AI, a colleague, a search.</p>
            {reported ? (
              <p className="fine">Noted. Thanks for keeping the data clean.</p>
            ) : (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setReported(true)
                  onSelfReport()
                }}
              >
                Yes, I had help
              </button>
            )}
          </section>
        )}

        {onPractice && (
          <button className="btn" type="button" onClick={onPractice}>
            Run a practice incident
          </button>
        )}
      </main>
    </>
  )
}
