import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import type { Change, Incident } from '../game/types.ts'
import { KIND_LABEL } from '../layouts/labels.ts'
import './screens.css'

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
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** 1/2/3 select a change, Enter rolls back. Same in both layouts. */
function useAnswerKeys(choices: Change[], onSelect: (id: string) => void, onSubmit: () => void) {
  const handlers = useRef({ onSelect, onSubmit })
  useLayoutEffect(() => {
    handlers.current = { onSelect, onSubmit }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const index = ['1', '2', '3'].indexOf(e.key)
      const choice = choices[index]
      if (choice) handlers.current.onSelect(choice.id)
      else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) handlers.current.onSubmit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choices])
}

export function Play({ incident, choices, msLeft, selectedId, evidence, onSelect, onSubmit }: PlayProps) {
  useAnswerKeys(choices, onSelect, onSubmit)
  const seconds = Math.ceil(msLeft / 1000)
  const announce = seconds === 30 || seconds === 10 ? `${seconds} seconds left` : ''

  return (
    <>
      <header className="play-head">
        <span className="inc-id">{incident.number} · SEV2 · ONSET {String(Math.floor(incident.onset / 60)).padStart(2, '0')}:{String(incident.onset % 60).padStart(2, '0')}</span>
        <h1>{incident.headline}</h1>
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
          <fieldset>
            <legend className="label">ROLL BACK WHICH CHANGE FIRST?</legend>
            <div className="choices">
              {choices.map((c, i) => (
                <label key={c.id} className="choice">
                  <input
                    type="radio"
                    name="rollback"
                    value={c.id}
                    checked={selectedId === c.id}
                    onChange={() => onSelect(c.id)}
                  />
                  <span>
                    <span className="k">[{i + 1}] {KIND_LABEL[c.kind]}</span>
                    {c.id}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn" type="submit" disabled={selectedId === null}>
            {selectedId ? `Roll back ${selectedId}` : 'Select a change'}
            {selectedId && <kbd aria-hidden="true">Enter</kbd>}
          </button>
        </form>
      </main>
    </>
  )
}
