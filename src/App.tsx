// Temporary development preview: both layouts side by side for one seed.
// Open /?seed=4821 to pick a seed. Replaced by the game flow in Phase E.

import { generateIncident } from './game/generate.ts'
import { DEFAULT_PACK } from './game/packs.ts'
import { Chronological } from './layouts/Chronological.tsx'
import { Grouped } from './layouts/Grouped.tsx'

const seed = Number(new URLSearchParams(location.search).get('seed') ?? 4821)

export default function App() {
  const incident = generateIncident(seed, DEFAULT_PACK)
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <h1>
        Incident {incident.number}: {incident.headline}
      </h1>
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <section>
          <h2>Control: chronological</h2>
          <Chronological incident={incident} />
        </section>
        <section>
          <h2>Treatment: grouped by change</h2>
          <Grouped incident={incident} />
        </section>
      </div>
    </main>
  )
}
