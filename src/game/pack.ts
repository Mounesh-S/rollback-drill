// Scenario packs: the reusable part of the drill kit. A pack is plain JSON, so a team
// can write its own incidents as JSON and register them in packs.ts. See scenarios/README.md.

import { CHANGE_KINDS, type ChangeKind } from './types.ts'

export interface ScenarioPack {
  id: string
  name: string
  platform: string
  restaurants: { name: string; area: string }[]
  services: string[]
  authors: string[]
  flagNames: string[]
  headlines: string[]
  errorMessages: string[]
  healthyMessages: string[]
  /** Title templates per change kind. Placeholders: {service} {version} {flag} */
  changeTitles: Record<ChangeKind, string[]>
}

/** Restaurants a single incident needs (2 affected, 4 healthy, 1 quiet, 2 untargeted). */
export const RESTAURANTS_PER_INCIDENT = 9

const nonEmptyStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string' && v.trim() !== '')

/** Returns a list of problems; an empty list means the pack is valid. */
export function validatePack(input: unknown): string[] {
  if (typeof input !== 'object' || input === null) return ['pack must be a JSON object']
  const p = input as Record<string, unknown>
  const errors: string[] = []

  for (const key of ['id', 'name', 'platform']) {
    if (typeof p[key] !== 'string' || (p[key] as string).trim() === '') errors.push(`"${key}" must be a non-empty string`)
  }
  for (const key of ['services', 'authors', 'flagNames', 'headlines', 'errorMessages', 'healthyMessages']) {
    if (!nonEmptyStrings(p[key])) errors.push(`"${key}" must be a non-empty list of strings`)
  }

  const restaurants = p.restaurants
  if (!Array.isArray(restaurants)) {
    errors.push('"restaurants" must be a list')
  } else {
    const names = restaurants.map((r) => (r as { name?: unknown }).name)
    if (restaurants.length < RESTAURANTS_PER_INCIDENT) {
      errors.push(`"restaurants" needs at least ${RESTAURANTS_PER_INCIDENT} entries`)
    }
    if (!restaurants.every((r) => typeof r?.name === 'string' && typeof r?.area === 'string')) {
      errors.push('every restaurant needs a "name" and an "area"')
    }
    if (new Set(names).size !== names.length) errors.push('restaurant names must be unique')
  }

  const titles = p.changeTitles as Record<string, unknown> | undefined
  for (const kind of CHANGE_KINDS) {
    if (!nonEmptyStrings(titles?.[kind])) errors.push(`"changeTitles.${kind}" must be a non-empty list of strings`)
  }
  return errors
}
