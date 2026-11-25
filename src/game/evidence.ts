// Helpers that read evidence out of an incident. Pure functions, no UI.

import type { Incident, Restaurant } from './types.ts'

export type RestaurantStatus = 'failing' | 'healthy' | 'no-signal'

/** What the signals say about each restaurant. An error outranks a healthy signal. */
export function restaurantStatus(incident: Incident): Map<string, RestaurantStatus> {
  const status = new Map<string, RestaurantStatus>(incident.restaurants.map((r) => [r.id, 'no-signal']))
  for (const s of incident.signals) {
    if (s.type === 'error') status.set(s.restaurantId, 'failing')
    else if (status.get(s.restaurantId) !== 'failing') status.set(s.restaurantId, 'healthy')
  }
  return status
}

export function getRestaurant(incident: Incident, id: string): Restaurant {
  const restaurant = incident.restaurants.find((r) => r.id === id)
  if (!restaurant) throw new Error(`Unknown restaurant id "${id}" in incident ${incident.number}`)
  return restaurant
}
