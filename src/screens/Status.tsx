import type { ReactNode } from 'react'
import './screens.css'

interface StatusProps {
  label: string
  title: string
  children?: ReactNode
  busy?: boolean
}

/** Full-page system message: connecting, maintenance, unreachable, misconfigured. */
export function Status({ label, title, children, busy = false }: StatusProps) {
  return (
    <>
      <header className="topbar">
        <span className="brand">ROLLBACK DRILL</span>
        <span className="dim">on-call simulator</span>
      </header>
      <main className="screen" aria-busy={busy}>
        <section className="verdict v-none" role="status">
          <span className="label">{label}</span>
          <h1>{title}</h1>
          {children}
        </section>
      </main>
    </>
  )
}
