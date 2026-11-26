// Builds one incident from a seed. Every incident has the same shape and difficulty:
//
//   culprit   reached both failing restaurants + 1 silent one        (the right answer)
//   wrong A   reached failing A + 1 healthy + 1 silent               (wrong)
//   wrong B   reached failing B + 1 healthy + 1 silent               (wrong)
//
// Only the culprit covers every failing restaurant and no healthy one. Each change is placed
// at random in the oldest, middle or newest time slot, so timing alone never gives the answer
// (the newest wrong change is a natural recency trap). Every change reaches a silent
// restaurant, so "the one with no signal" is not a shortcut either.

import type { ScenarioPack } from './pack.ts'
import { RESTAURANTS_PER_INCIDENT } from './pack.ts'
import { mulberry32, pick, randInt, shuffle, type Rng } from './rng.ts'
import { CHANGE_KINDS, type Change, type ChangeKind, type Incident, type Restaurant, type Signal } from './types.ts'

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)

function makeChange(rng: Rng, pack: ScenarioPack, kind: ChangeKind, at: number, targets: Restaurant[], usedIds: Set<string>): Change {
  let id: string
  do id = `CHG-${randInt(rng, 1000, 9999)}`
  while (usedIds.has(id))
  usedIds.add(id)

  const service = pick(rng, pack.services)
  const title = fill(pick(rng, pack.changeTitles[kind]), {
    service,
    version: `${randInt(rng, 2, 4)}.${randInt(rng, 0, 19)}.${randInt(rng, 0, 9)}`,
    flag: pick(rng, pack.flagNames),
  })
  return { id, kind, title, service, author: pick(rng, pack.authors), at, targets: targets.map((r) => r.id) }
}

export function generateIncident(seed: number, pack: ScenarioPack): Incident {
  const rng = mulberry32(seed)

  const restaurants: Restaurant[] = shuffle(rng, pack.restaurants)
    .slice(0, RESTAURANTS_PER_INCIDENT)
    .map((r, i) => ({ id: `r${i + 1}`, name: r.name, area: r.area }))
  const [failA, failB, ok1, ok2, quiet1, quiet2, quiet3, extra1, extra2] = restaurants as [
    Restaurant, Restaurant, Restaurant, Restaurant, Restaurant, Restaurant, Restaurant, Restaurant, Restaurant,
  ]

  // Times in minutes since midnight. Errors start at `onset`. The three time slots are
  // dealt to the three changes at random.
  const onset = randInt(rng, 9 * 60, 21 * 60)
  const slots = shuffle(rng, [onset - randInt(rng, 14, 25), onset - randInt(rng, 6, 9), onset - randInt(rng, 1, 3)])
  const [culpritAt, wrongAAt, wrongBAt] = slots as [number, number, number]

  // The culprit's kind varies too, so "it's always the flag" is useless.
  const [culpritKind, wrongAKind, wrongBKind] = shuffle(rng, CHANGE_KINDS) as [ChangeKind, ChangeKind, ChangeKind]
  const ids = new Set<string>()
  const culprit = makeChange(rng, pack, culpritKind, culpritAt, shuffle(rng, [failA, failB, quiet1]), ids)
  const wrongA = makeChange(rng, pack, wrongAKind, wrongAAt, shuffle(rng, [failA, ok1, quiet2]), ids)
  const wrongB = makeChange(rng, pack, wrongBKind, wrongBAt, shuffle(rng, [failB, ok2, quiet3]), ids)

  // One consistent symptom per incident, like a real outage.
  const symptom = pick(rng, pack.errorMessages)
  let n = 0
  const signal = (type: Signal['type'], at: number, r: Restaurant): Signal => ({
    id: `sig-${++n}`,
    type,
    at,
    restaurantId: r.id,
    message: type === 'error' ? symptom : pick(rng, pack.healthyMessages),
  })
  const signals: Signal[] = [
    signal('error', onset, failA),
    signal('error', onset + 1, failB),
    signal('error', onset + 2, failA),
    signal('error', onset + 3, failB),
    // Each reached healthy restaurant reports twice; two unreached ones report once.
    ...shuffle(rng, [ok1, ok1, ok2, ok2, extra1, extra2]).map((r, i) => signal('healthy', onset + 1 + (i % 4), r)),
  ].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))

  return {
    seed,
    number: `INC-${String(seed % 10000).padStart(4, '0')}`,
    packId: pack.id,
    platform: pack.platform,
    headline: pick(rng, pack.headlines),
    onset,
    restaurants,
    changes: [culprit, wrongA, wrongB].sort((a, b) => a.at - b.at),
    signals,
    culpritId: culprit.id,
  }
}

/** "14:07" from minutes since midnight. */
export const formatClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
