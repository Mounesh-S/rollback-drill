// Sample ratio mismatch check. With a 50/50 split, a large imbalance in exposures between
// the arms means assignment or exposure tracking is broken and results should not be trusted.
// Flagsmith returned srm_p_value: null in our runs, so we compute it ourselves.
//
//   node scripts/srm.ts docs/validation/aa-1-results.json

import { readFileSync } from 'node:fs'

/** Chi-square goodness-of-fit p-value for two arms with expected shares (df = 1). */
export function srmPValue(control: number, treatment: number, treatmentShare = 0.5): number {
  const total = control + treatment
  if (total === 0) return 1
  const expected = [total * (1 - treatmentShare), total * treatmentShare] as const
  const chi2 = ((control - expected[0]) ** 2) / expected[0] + ((treatment - expected[1]) ** 2) / expected[1]
  return erfc(Math.sqrt(chi2 / 2)) // survival function of chi-square with 1 degree of freedom
}

/** Complementary error function (Numerical Recipes approximation, |error| < 1.2e-7). */
function erfc(x: number): number {
  const t = 1 / (1 + 0.5 * Math.abs(x))
  const y =
    t *
    Math.exp(
      -x * x -
        1.26551223 +
        t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    )
  return x >= 0 ? y : 2 - y
}

if (import.meta.main) {
  const file = process.argv[2]
  if (!file) throw new Error('Usage: node scripts/srm.ts <results.json>')
  const results = JSON.parse(readFileSync(file, 'utf8')) as {
    results: { payload: { exposures_timeseries: { points: { new_identities: Record<string, number> }[] } } }
  }
  const totals: Record<string, number> = {}
  for (const point of results.results.payload.exposures_timeseries.points) {
    for (const [arm, n] of Object.entries(point.new_identities)) totals[arm] = (totals[arm] ?? 0) + n
  }
  const control = totals.control ?? 0
  const treatment = Object.entries(totals).find(([arm]) => arm !== 'control')?.[1] ?? 0
  const p = srmPValue(control, treatment)
  console.log(`control ${control}, treatment ${treatment}, SRM p = ${p.toFixed(4)} -> ${p < 0.01 ? 'MISMATCH: do not trust results' : 'ok'}`)
}
