// Flag names and remote config parsing. Names must match the Flagsmith project exactly.

export const FLAG = {
  /** The experiment. Variants: control ("chronological") and "grouped". Locked while running. */
  layout: 'incident_evidence_layout',
  /** Kill switch. Disabled = maintenance screen, nothing recorded. Missing = treated as on. */
  gameEnabled: 'game_enabled',
  /** Remote config JSON, e.g. {"timerSeconds":75}. Frozen once the experiment starts. */
  drillConfig: 'drill_config',
} as const

export const LAYOUT_TREATMENT_VARIANT = 'grouped'

export interface DrillConfig {
  timerSeconds: number
}

export const DEFAULT_CONFIG: DrillConfig = { timerSeconds: 75 }

/** Bad or missing remote config never breaks the game: fall back to safe defaults. */
export function parseDrillConfig(value: unknown): DrillConfig {
  if (typeof value !== 'string' || value.trim() === '') return DEFAULT_CONFIG
  try {
    const parsed = JSON.parse(value) as Partial<DrillConfig>
    const t = parsed.timerSeconds
    return {
      timerSeconds: typeof t === 'number' && Number.isInteger(t) && t >= 30 && t <= 180 ? t : DEFAULT_CONFIG.timerSeconds,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}
