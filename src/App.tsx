// Entry point. Practice mode runs entirely offline; live play goes through Flagsmith.

import { Game } from './Game.tsx'
import type { EmitEvent } from './game/events.ts'
import { LiveRoot } from './flags/LiveRoot.tsx'
import { Chronological } from './layouts/Chronological.tsx'
import { parseMode } from './lib/mode.ts'
import { Status } from './screens/Status.tsx'

const mode = parseMode(location.search)
const environmentId = import.meta.env.VITE_FLAGSMITH_ENV_KEY
const noop: EmitEvent = () => {}

export default function App() {
  if (mode.practice) return <Game mode={mode} timerSeconds={75} LiveEvidence={Chronological} emit={noop} />
  if (!environmentId) {
    return (
      <Status label="NOT CONFIGURED" title="Missing Flagsmith environment key">
        <p>Set VITE_FLAGSMITH_ENV_KEY in .env (see .env.example).</p>
      </Status>
    )
  }
  return <LiveRoot mode={mode} environmentId={environmentId} />
}
