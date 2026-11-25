// Runs one round: wires the state machine to the screens, the timer and tab tracking,
// and emits typed analytics events. It knows nothing about Flagsmith or which layout
// is under test; both are passed in.

import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { useCountdown } from '../hooks/useCountdown.ts'
import { useTabLeave } from '../hooks/useTabLeave.ts'
import { Intro } from '../screens/Intro.tsx'
import { Play } from '../screens/Play.tsx'
import { Result } from '../screens/Result.tsx'
import { EVENT, type EmitEvent } from './events.ts'
import { mulberry32, shuffle } from './rng.ts'
import { initialRound, roundReducer, scoreRound, type RoundScore, type RoundState } from './round.ts'
import type { Incident } from './types.ts'

export interface DrillProps {
  incident: Incident
  timerSeconds: number
  practice: boolean
  /** Renders the evidence for the layout under test. Called only on the play screen. */
  renderEvidence: (incident: Incident) => ReactNode
  emit: EmitEvent
  clock?: () => number
  onStart?: () => void
  onDone?: (state: RoundState, score: RoundScore) => void
  onPractice?: () => void
}

const defaultClock = () => performance.now()

export function Drill({
  incident,
  timerSeconds,
  practice,
  renderEvidence,
  emit,
  clock = defaultClock,
  onStart,
  onDone,
  onPractice,
}: DrillProps) {
  const [state, dispatch] = useReducer(roundReducer, initialRound)
  const sent = useRef({ tabLeft: false, done: false, help: false })

  // Answer order is shuffled per incident, independent of the change timeline.
  const choices = useMemo(() => shuffle(mulberry32(incident.seed ^ 0x9e3779b9), incident.changes), [incident])

  const msLeft = useCountdown(state.startedAt, timerSeconds * 1000, clock, () => dispatch({ type: 'timeout' }))

  useTabLeave(state.phase === 'playing', () => {
    dispatch({ type: 'tabLeft' })
    if (!sent.current.tabLeft) {
      sent.current.tabLeft = true
      emit({ name: EVENT.tabLeft })
    }
  })

  // Emit outcome events exactly once, from the reducer's final state.
  useEffect(() => {
    if (state.phase !== 'done' || sent.current.done) return
    sent.current.done = true
    const score = scoreRound(state, incident.culpritId)
    if (state.ending === 'answered' && state.decisionMs !== null) {
      emit({ name: EVENT.decisionSubmitted, value: state.decisionMs })
      if (score.counts) emit({ name: EVENT.correctFirstRollback })
    }
    onDone?.(state, score)
  }, [state, incident.culpritId, emit, onDone])

  const start = useCallback(() => {
    dispatch({ type: 'start', now: clock() })
    onStart?.()
  }, [clock, onStart])

  if (state.phase === 'intro') return <Intro timerSeconds={timerSeconds} practice={practice} onStart={start} />

  if (state.phase === 'playing') {
    return (
      <Play
        incident={incident}
        choices={choices}
        msLeft={msLeft}
        selectedId={state.selectedId}
        evidence={renderEvidence(incident)}
        onSelect={(changeId) => dispatch({ type: 'select', changeId })}
        onSubmit={() => dispatch({ type: 'submit', now: clock() })}
      />
    )
  }

  const score = scoreRound(state, incident.culpritId)
  return (
    <Result
      incident={incident}
      practice={practice}
      result={{ ...state, correct: score.correct }}
      onSelfReport={
        state.ending === 'answered'
          ? () => {
              if (sent.current.help) return
              sent.current.help = true
              emit({ name: EVENT.selfReportedHelp })
            }
          : undefined
      }
      onPractice={onPractice}
    />
  )
}
