// Decides which round to play. Live: one attempt per browser, remembered across reloads.
// Practice: unlimited rounds, chosen layout, nothing recorded or sent.

import { useCallback, useState, type ComponentType } from 'react'
import { Drill } from './game/Drill.tsx'
import type { EmitEvent } from './game/events.ts'
import { generateIncident } from './game/generate.ts'
import { DEFAULT_PACK } from './game/packs.ts'
import { newSeed } from './game/rng.ts'
import type { RoundScore, RoundState } from './game/round.ts'
import type { Incident } from './game/types.ts'
import { Chronological } from './layouts/Chronological.tsx'
import { Grouped } from './layouts/Grouped.tsx'
import { practiceUrl, type Mode } from './lib/mode.ts'
import { loadAttempt, resolveAbandoned, saveAttempt, type AttemptRecord } from './lib/storage.ts'
import { Result } from './screens/Result.tsx'

export interface GameProps {
  mode: Mode
  timerSeconds: number
  /** Evidence for live play. Phase F supplies the Flagsmith experiment here. */
  LiveEvidence: ComponentType<{ incident: Incident }>
  emit: EmitEvent
}

const noop: EmitEvent = () => {}

function initialAttempt(): AttemptRecord | null {
  const stored = loadAttempt()
  if (!stored) return null
  const resolved = resolveAbandoned(stored)
  if (resolved !== stored) saveAttempt(resolved)
  return resolved
}

export function Game(props: GameProps) {
  return props.mode.practice ? <PracticeGame {...props} /> : <LiveGame {...props} />
}

function LiveGame({ timerSeconds, LiveEvidence, emit }: GameProps) {
  const [attempt] = useState(initialAttempt)
  const [seed] = useState(() => attempt?.seed ?? newSeed())
  const incident = generateIncident(seed, DEFAULT_PACK)
  const goPractice = () => location.assign(practiceUrl())

  const onStart = useCallback(
    () =>
      saveAttempt({ seed, status: 'in-progress', ending: null, answerId: null, decisionMs: null, correct: false, counts: false, tabLeft: false }),
    [seed],
  )
  const onDone = useCallback(
    (state: RoundState, score: RoundScore) =>
      saveAttempt({
        seed,
        status: 'done',
        ending: state.ending,
        answerId: state.answerId,
        decisionMs: state.decisionMs,
        correct: score.correct,
        counts: score.counts,
        tabLeft: state.tabLeft,
      }),
    [seed],
  )

  // Returning player: show their result, never a second live round.
  if (attempt?.status === 'done') {
    return <Result incident={incident} result={attempt} practice={false} onPractice={goPractice} />
  }

  return (
    <Drill
      incident={incident}
      timerSeconds={timerSeconds}
      practice={false}
      renderEvidence={(inc) => <LiveEvidence incident={inc} />}
      emit={emit}
      onStart={onStart}
      onDone={onDone}
      onPractice={goPractice}
    />
  )
}

function PracticeGame({ mode, timerSeconds }: GameProps) {
  const [round, setRound] = useState(() => ({ key: 0, seed: mode.seed ?? newSeed() }))
  const incident = generateIncident(round.seed, DEFAULT_PACK)
  const Layout = mode.layout === 'grouped' ? Grouped : Chronological

  return (
    <Drill
      key={round.key}
      incident={incident}
      timerSeconds={timerSeconds}
      practice
      renderEvidence={(inc) => <Layout incident={inc} />}
      emit={noop}
      onPractice={() => setRound((r) => ({ key: r.key + 1, seed: newSeed() }))}
    />
  )
}
