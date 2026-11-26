// Live play: connect to Flagsmith as this browser's anonymous player, then gate the game.
// The round only starts once flags have come from the server, because Flagsmith records
// an experiment exposure only for server-loaded flags.

import flagsmith from '@flagsmith/flagsmith'
import { FlagsmithProvider, useFlags, useFlagsmith, useFlagsmithLoading } from '@flagsmith/flagsmith/react'
import { useEffect, useMemo, useState } from 'react'
import { Game } from '../Game.tsx'
import type { GameEvent } from '../game/events.ts'
import { practiceUrl, type Mode } from '../lib/mode.ts'
import { getPlayerId } from '../lib/storage.ts'
import { Status } from '../screens/Status.tsx'
import { FLAG, parseDrillConfig } from './config.ts'
import { DebugPanel } from './DebugPanel.tsx'
import { ExperimentEvidence } from './ExperimentEvidence.tsx'
import { flagsmithEmitter, flushOnPageHide } from './track.ts'

const CONNECT_TIMEOUT_MS = 8000

export function LiveRoot({ mode, environmentId }: { mode: Mode; environmentId: string }) {
  const [playerId] = useState(getPlayerId)
  return (
    <FlagsmithProvider
      flagsmith={flagsmith}
      options={{
        environmentID: environmentId,
        identity: playerId,
        cacheFlags: false, // exposures only count for flags loaded from the server
        enableEvents: true,
        eventProcessorConfig: { flushInterval: 1000 },
        enableLogs: import.meta.env.DEV,
      }}
    >
      <LiveGate mode={mode} />
    </FlagsmithProvider>
  )
}

export function LiveGate({ mode }: { mode: Mode }) {
  const client = useFlagsmith()
  const loading = useFlagsmithLoading()
  useFlags([FLAG.gameEnabled, FLAG.drillConfig]) // re-render when these change
  const [timedOut, setTimedOut] = useState(false)
  const [sent, setSent] = useState<GameEvent[]>([])

  useEffect(() => flushOnPageHide(client), [client])
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), CONNECT_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [])
  const emit = useMemo(
    () => flagsmithEmitter(client, import.meta.env.DEV ? (e) => setSent((s) => [...s, e]) : undefined),
    [client],
  )

  const fromServer = loading?.source === 'SERVER' && !loading.isLoading
  const practiceLink = (
    <p>
      <a className="btn btn-ghost" href={practiceUrl()}>
        Run a practice incident
      </a>
    </p>
  )

  if (!fromServer && (loading?.error || timedOut)) {
    return (
      <Status label="UNREACHABLE" title="Can't reach the experiment service">
        <p>Your attempt is safe: nothing was used up. Reload in a minute, or practise meanwhile.</p>
        {practiceLink}
      </Status>
    )
  }
  if (!fromServer) return <Status label="CONNECTING" title="Paging the on-call engineer…" busy />

  // Kill switch: an existing, disabled game_enabled flag closes the drill.
  const killSwitch = client.getAllFlags()[FLAG.gameEnabled]
  if (killSwitch && !killSwitch.enabled) {
    return (
      <Status label="MAINTENANCE" title="The drill is paused">
        <p>We're fixing something. Nothing is being recorded. Please come back shortly.</p>
      </Status>
    )
  }

  const config = parseDrillConfig(client.getValue(FLAG.drillConfig))
  return (
    <>
      <Game mode={mode} timerSeconds={config.timerSeconds} LiveEvidence={ExperimentEvidence} emit={emit} />
      {import.meta.env.DEV && <DebugPanel sent={sent} />}
    </>
  )
}
