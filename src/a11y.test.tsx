// Automated accessibility audit (axe-core) of every screen and both evidence layouts.
// Colour contrast cannot be measured in jsdom, so contrast.test.ts checks the tokens instead.

import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import type { ReactElement } from 'react'
import { afterEach, expect, test } from 'vitest'
import { generateIncident } from './game/generate.ts'
import { DEFAULT_PACK } from './game/packs.ts'
import { Chronological } from './layouts/Chronological.tsx'
import { Grouped } from './layouts/Grouped.tsx'
import { Intro } from './screens/Intro.tsx'
import { Play } from './screens/Play.tsx'
import { Result } from './screens/Result.tsx'
import { Status } from './screens/Status.tsx'

afterEach(cleanup)
const incident = generateIncident(4821, DEFAULT_PACK)
const noop = () => {}

async function violations(ui: ReactElement) {
  const { container } = render(ui)
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)
}

const cases: [string, () => ReactElement][] = [
  ['intro', () => <Intro timerSeconds={75} practice={false} onStart={noop} />],
  ['intro (practice)', () => <Intro timerSeconds={75} practice onStart={noop} />],
  ...(['chronological', 'grouped'] as const).map((layout): [string, () => ReactElement] => [
    `play (${layout})`,
    () => <Play
      incident={incident}
      choices={incident.changes}
      msLeft={12_000}
      selectedId={incident.culpritId}
      evidence={layout === 'grouped' ? <Grouped incident={incident} /> : <Chronological incident={incident} />}
      onSelect={noop}
      onSubmit={noop}
    />,
  ]),
  [
    'result (correct)',
    () => <Result
      incident={incident}
      practice={false}
      result={{ ending: 'answered', answerId: incident.culpritId, decisionMs: 9000, correct: true, tabLeft: false }}
      onSelfReport={noop}
      onPractice={noop}
    />,
  ],
  [
    'result (timeout)',
    () => <Result incident={incident} practice result={{ ending: 'timeout', answerId: null, decisionMs: null, correct: false, tabLeft: false }} />,
  ],
  ['status', () => <Status label="CONNECTING" title="Paging the on-call engineer" busy />],
]

test.each(cases)('%s has no axe violations', async (_name, ui) => {
  expect(await violations(ui())).toEqual([])
})
