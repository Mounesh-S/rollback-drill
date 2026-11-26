// Builds one incident from a seed. Every incident has the same shape and difficulty:
//
//   culprit   reached failing A + failing B + 1 silent       (the right answer)
//   wrong A   reached failing A + shared healthy + 1 silent  (wrong)
//   wrong B   reached failing B + shared healthy + 1 silent  (wrong)
//
// Only the culprit covers every failing restaurant and no healthy one. The structure is
// deliberately symmetric so nothing but the signals gives the answer:
// - every pair of changes shares exactly one restaurant, so "the hub" is not a tell;
// - every change reaches one silent restaurant;
// - time slots (oldest, middle, newest) and change types are dealt at random;
// - restaurant and signal ids are assigned without regard to role.

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

  // Roles are taken by position; ids come from a separate shuffle so they never reveal a role.
  const idOrder = shuffle(rng, Array.from({ length: RESTAURANTS_PER_INCIDENT }, (_, i) => i + 1))
  const picked: Restaurant[] = shuffle(rng, pack.restaurants)
    .slice(0, RESTAURANTS_PER_INCIDENT)
    .map((r, i) => ({ id: `r${idOrder[i]}`, name: r.name, area: r.area }))
  const restaurants = [...picked].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))
  const [failA, failB, okShared, quiet1, quiet2, quiet3, extra1, extra2, extra3] = picked as [
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
  const wrongA = makeChange(rng, pack, wrongAKind, wrongAAt, shuffle(rng, [failA, okShared, quiet2]), ids)
  const wrongB = makeChange(rng, pack, wrongBKind, wrongBAt, shuffle(rng, [failB, okShared, quiet3]), ids)

  // One consistent symptom per incident, like a real outage.
  const symptom = pick(rng, pack.errorMessages)
  const signal = (type: Signal['type'], at: number, r: Restaurant): Omit<Signal, 'id'> => ({
    type,
    at,
    restaurantId: r.id,
    message: type === 'error' ? symptom : pick(rng, pack.healthyMessages),
  })
  const unordered = [
    signal('error', onset, failA),
    signal('error', onset + 1, failB),
    signal('error', onset + 2, failA),
    signal('error', onset + 3, failB),
    // The shared healthy restaurant and one unreached one report twice, two others once.
    ...shuffle(rng, [okShared, okShared, extra1, extra1, extra2, extra3]).map((r, i) => signal('healthy', onset + 1 + (i % 4), r)),
  ]
  // Time order, ties in random order; ids follow display order, so they carry no extra information.
  const signals: Signal[] = shuffle(rng, unordered)
    .sort((a, b) => a.at - b.at)
    .map((sig, i) => ({ id: `sig-${i + 1}`, ...sig }))

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
