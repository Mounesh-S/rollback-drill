// Development-only panel: who am I, which arm, and which events went out.
// Rendered only when import.meta.env.DEV, so it is stripped from production builds.

import { useFlagsmith, useFlagsmithLoading } from '@flagsmith/flagsmith/react'
import { useState } from 'react'
import type { GameEvent } from '../game/events.ts'
import { FLAG } from './config.ts'

export function DebugPanel({ sent }: { sent: GameEvent[] }) {
  const flagsmith = useFlagsmith()
  const loading = useFlagsmithLoading()
  const [open, setOpen] = useState(false)
  const flag = flagsmith.getAllFlags()[FLAG.layout]

  return (
    <aside
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        zIndex: 10,
        maxWidth: 320,
        font: '12px var(--mono)',
        background: 'var(--panel-2)',
        border: '1px dashed var(--amber)',
        padding: 8,
      }}
    >
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ font: 'inherit', color: 'var(--amber)', background: 'none', border: 0, cursor: 'pointer' }}>
        DEBUG {open ? '▾' : '▸'}
      </button>
      {open && (
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(
            {
              identity: flagsmith.getContext().identity?.identifier,
              source: loading?.source,
              variant: flag?.variant ?? null,
              inExperiment: flag?.experiment?.inExperiment ?? false,
              experiment: flag?.experiment?.id ?? null,
              sent,
            },
            null,
            1,
          )}
        </pre>
      )}
    </aside>
  )
}
