// URL modes. Live play takes no parameters. Practice (judges) mode lets anyone try either
// layout on any seed, and sends no events: ?practice=1&layout=grouped&seed=4821

export const LAYOUTS = ['chronological', 'grouped'] as const
export type Layout = (typeof LAYOUTS)[number]

export interface Mode {
  practice: boolean
  layout: Layout | null
  seed: number | null
}

export function parseMode(search: string): Mode {
  const params = new URLSearchParams(search)
  const practice = params.get('practice') === '1'
  if (!practice) return { practice: false, layout: null, seed: null } // live play ignores overrides

  const layout = params.get('layout')
  const seed = Number(params.get('seed'))
  return {
    practice: true,
    layout: (LAYOUTS as readonly string[]).includes(layout ?? '') ? (layout as Layout) : null,
    seed: Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff ? seed : null,
  }
}

export function practiceUrl(layout?: Layout): string {
  return `?practice=1${layout ? `&layout=${layout}` : ''}`
}
