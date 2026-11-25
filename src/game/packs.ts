import foodDelivery from '../../scenarios/food-delivery.json' with { type: 'json' }
import type { ScenarioPack } from './pack.ts'

/** All packs bundled into the game. Add a pack here after `npm run validate-scenarios` passes. */
export const PACKS: readonly ScenarioPack[] = [foodDelivery]

export const DEFAULT_PACK: ScenarioPack = foodDelivery
