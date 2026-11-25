import type { ReactNode } from 'react'
import type { Change, Incident } from '../game/types.ts'
import './screens.css'

const KIND: Record<Change['kind'], string> = { deploy: 'Deploy', flag_rollout: 'Flag rollout', config_change: 'Config change' }

interface PlayProps {
  incident: Incident
  choices: Change[] // already shuffled
  msLeft: number
  selectedId: string | null
  evidence: ReactNode
  onSelect: (changeId: string) => void
  onSubmit: () => void
}

const formatLeft = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Play({ incident, choices, msLeft, selectedId, evidence, onSelect, onSubmit }: PlayProps) {
  const seconds = Math.ceil(msLeft / 1000)
  const announce = seconds === 30 || seconds === 10 ? `${seconds} seconds left` : ''

  return (
    <>
      <header className="play-header">
        <h1>
          Incident {incident.number}: {incident.headline}
        </h1>
        <span className={`timer${seconds <= 15 ? ' timer-warn' : ''}`} role="timer" aria-label="Time left">
          {formatLeft(msLeft)}
        </span>
        <span className="visually-hidden" aria-live="polite">
          {announce}
        </span>
      </header>
      <main className="screen">
        {evidence}
        <form
          className="answer"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <fieldset className="choices">
            <legend>Which change do you roll back first?</legend>
            {choices.map((c) => (
              <label key={c.id} className="choice">
                <input
                  type="radio"
                  name="rollback"
                  value={c.id}
                  checked={selectedId === c.id}
                  onChange={() => onSelect(c.id)}
                />
                <span>
                  <strong>{c.id}</strong>
                  {KIND[c.kind]}
                </span>
              </label>
            ))}
          </fieldset>
          <button className="btn" type="submit" disabled={selectedId === null}>
            {selectedId ? `Roll back ${selectedId}` : 'Pick a change to roll back'}
          </button>
        </form>
      </main>
    </>
  )
}
