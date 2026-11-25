import { useState } from 'react'
import type { Ending } from '../game/round.ts'
import type { Incident } from '../game/types.ts'
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

function verdict(r: ResultSummary): string {
  if (r.ending === 'timeout') return '⏱ Time ran out'
  if (r.ending === 'abandoned') return 'This drill was left unfinished'
  return r.correct ? '✅ Right call' : '❌ Not that one'
}

export function Result({ incident, result, practice, onSelfReport, onPractice }: ResultProps) {
  const [reported, setReported] = useState(false)
  const culprit = incident.changes.find((c) => c.id === incident.culpritId)

  return (
    <main className="screen">
      {practice && <p className="banner">Practice mode: nothing was recorded.</p>}
      <h1 className="verdict">{verdict(result)}</h1>
      <ul className="facts">
        {result.answerId && <li>You rolled back {result.answerId}.</li>}
        {result.decisionMs !== null && <li>You decided in {(result.decisionMs / 1000).toFixed(1)} seconds.</li>}
        {culprit && (
          <li>
            The cause was <strong>{culprit.id}</strong>: {culprit.title}.
          </li>
        )}
        {result.tabLeft && <li>You left the tab during the drill, so this round doesn't count for the experiment.</li>}
      </ul>

      {onSelfReport && (
        <div className="panel">
          <p>Honesty check: did you use any outside help (AI, a friend, another tab)?</p>
          {reported ? (
            <p className="fine">Thanks, noted. It keeps the experiment honest.</p>
          ) : (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setReported(true)
                onSelfReport()
              }}
            >
              Yes, I had help
            </button>
          )}
        </div>
      )}

      <div className="actions">
        {onPractice && (
          <button className="btn" type="button" onClick={onPractice}>
            Practice another incident
          </button>
        )}
      </div>
    </main>
  )
}
