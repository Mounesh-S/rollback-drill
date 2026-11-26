// Decides which round to play. Live: one attempt per browser, remembered across reloads.
// Practice: unlimited rounds, chosen layout, nothing recorded or sent.

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
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
import {
  ATTEMPT_KEY,
  isRunningElsewhere,
  loadAttempt,
  markThisTabPlaying,
  resolveAbandoned,
  saveAttempt,
  thisTabWasPlaying,
  type AttemptRecord,
} from './lib/storage.ts'
import { Result } from './screens/Result.tsx'
import { Status } from './screens/Status.tsx'

export interface GameProps {
  mode: Mode
  timerSeconds: number
  /** Evidence for live play. Phase F supplies the Flagsmith experiment here. */
  LiveEvidence: ComponentType<{ incident: Incident }>
  emit: EmitEvent
}

const noop: EmitEvent = () => {}

type LiveView = { kind: 'fresh' } | { kind: 'elsewhere'; until: number } | { kind: 'done'; attempt: AttemptRecord }

/** What a live tab should show, given what this browser has stored. */
function liveView(limitMs: number): LiveView {
  const stored = loadAttempt()
  if (!stored) return { kind: 'fresh' }
  if (!thisTabWasPlaying(stored.seed) && isRunningElsewhere(stored, Date.now(), limitMs)) {
    return { kind: 'elsewhere', until: (stored.startedAt ?? 0) + limitMs + 5000 }
  }
  const resolved = resolveAbandoned(stored)
  if (resolved !== stored) saveAttempt(resolved)
  return { kind: 'done', attempt: resolved }
}

export function Game(props: GameProps) {
  return props.mode.practice ? <PracticeGame {...props} /> : <LiveGame {...props} />
}

function LiveGame({ timerSeconds, LiveEvidence, emit }: GameProps) {
  const limitMs = timerSeconds * 1000
  const [view, setView] = useState(() => liveView(limitMs))
  const [seed] = useState(() => (view.kind === 'done' ? view.attempt.seed : newSeed()))
  const incident = useMemo(() => generateIncident(view.kind === 'done' ? view.attempt.seed : seed, DEFAULT_PACK), [view, seed])
  const goPractice = () => location.assign(practiceUrl())
  const playing = useRef(false)

  // Another tab started or finished the attempt: follow it, unless this tab is the one playing.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ATTEMPT_KEY && !playing.current) setView(liveView(limitMs))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [limitMs])

  // If the other tab was closed mid-round, nothing will write to storage again: re-check once
  // its time is up so this tab moves on to the (abandoned) result instead of waiting forever.
  useEffect(() => {
    if (view.kind !== 'elsewhere') return
    const id = setTimeout(() => setView(liveView(limitMs)), Math.max(0, view.until - Date.now()) + 50)
    return () => clearTimeout(id)
  }, [view, limitMs])

  const onStart = useCallback(() => {
    // Re-check at the last moment: another tab may have used the attempt since this one loaded.
    if (loadAttempt()) {
      setView(liveView(limitMs))
      return false
    }
    playing.current = true
    markThisTabPlaying(seed)
    saveAttempt({
      seed,
      status: 'in-progress',
      startedAt: Date.now(),
      ending: null,
      answerId: null,
      decisionMs: null,
      correct: false,
      counts: false,
      tabLeft: false,
    })
  }, [seed, limitMs])

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

  if (view.kind === 'elsewhere') {
    return (
      <Status label="IN PROGRESS" title="Your drill is running in another tab">
        <p>Finish it there. This tab will show your result when it's done.</p>
      </Status>
    )
  }

  // Returning player: show their result, never a second live round.
  if (view.kind === 'done') {
    return <Result incident={incident} result={view.attempt} practice={false} onPractice={goPractice} />
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
  const incident = useMemo(() => generateIncident(round.seed, DEFAULT_PACK), [round.seed])
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
