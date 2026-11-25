// Entry point. Until the Flagsmith experiment is wired in (Phase F), live play shows the
// control layout and events are only logged in development.

import { Game } from './Game.tsx'
import type { EmitEvent } from './game/events.ts'
import { Chronological } from './layouts/Chronological.tsx'
import { parseMode } from './lib/mode.ts'

const mode = parseMode(location.search)

const devEmit: EmitEvent = (event) => {
  if (import.meta.env.DEV) console.debug('[rollback-drill] event', event)
}

export default function App() {
  return <Game mode={mode} timerSeconds={75} LiveEvidence={Chronological} emit={devEmit} />
}
