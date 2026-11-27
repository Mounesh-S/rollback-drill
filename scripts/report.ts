// Turns a Flagsmith experiment results export into a Markdown report and applies the
// pre-registered decision rule (docs/PREREGISTRATION.md), so the verdict is mechanical,
// not a judgement made after seeing the data.
//
//   flagsmith api api/v1/environments/<ENV>/experiments/<id>/results/ > results.json
//   node scripts/report.ts results.json > docs/RESULTS.md

import { readFileSync } from 'node:fs'
import { srmPValue } from './srm.ts'

type Role = 'primary' | 'secondary' | 'guardrail' | 'reporting'
type Kind = 'occurrence' | 'mean'
interface MetricInfo { name: string; role: Role; kind: Kind }

/** Metric ids in Production (experiment 567) and Development (validation runs). */
export const METRICS: Record<number, MetricInfo> = {
  475: { name: 'correct_first_rollback', role: 'primary', kind: 'occurrence' },
  476: { name: 'decision_time_ms', role: 'secondary', kind: 'mean' },
  477: { name: 'decision_submitted', role: 'guardrail', kind: 'occurrence' },
  478: { name: 'tab_left', role: 'guardrail', kind: 'occurrence' },
  562: { name: 'self_reported_help', role: 'reporting', kind: 'occurrence' },
  454: { name: 'correct_first_rollback', role: 'primary', kind: 'occurrence' },
  472: { name: 'decision_submitted', role: 'guardrail', kind: 'occurrence' },
  473: { name: 'decision_time_ms', role: 'secondary', kind: 'mean' },
  474: { name: 'tab_left', role: 'guardrail', kind: 'occurrence' },
}

const THRESHOLD = 0.95
const SRM_ALPHA = 0.01
const MIN_PER_ARM = 50 // Flagsmith shows "collecting data" below this
const MIN_CONVERSIONS = 5

interface Arm { n: number; sum: number; sum_squares: number }
interface ResultsFile {
  results: {
    as_of: string
    is_final: boolean
    payload: {
      metrics: {
        metric_id: number
        variants: Record<string, Arm>
        inference: Record<string, { lift: number; ci_low: number; ci_high: number; chance_to_win: number }>
      }[]
      exposures_timeseries: { points: { new_identities: Record<string, number> }[] }
    }
  }
}

export type Verdict = 'ship' | 'keep-inconclusive' | 'keep-guardrail' | 'invalid-srm' | 'not-enough-data'

export interface Report {
  asOf: string
  isFinal: boolean
  control: string
  treatment: string
  exposures: Record<string, number>
  srmP: number
  rows: {
    id: number
    info: MetricInfo
    control: Arm
    treatment: Arm
    lift: number | null
    ciLow: number | null
    ciHigh: number | null
    chanceToWin: number | null
  }[]
  verdict: Verdict
}

export function analyse(file: ResultsFile, control = 'control'): Report {
  const { payload } = file.results
  const exposures: Record<string, number> = {}
  for (const point of payload.exposures_timeseries.points) {
    for (const [arm, n] of Object.entries(point.new_identities)) exposures[arm] = (exposures[arm] ?? 0) + n
  }
  const arms = new Set([...Object.keys(exposures), ...payload.metrics.flatMap((m) => Object.keys(m.variants))])
  const treatment = [...arms].find((a) => a !== control) ?? 'treatment'
  const empty: Arm = { n: 0, sum: 0, sum_squares: 0 }

  const rows = payload.metrics.map((m) => {
    const inf = m.inference[treatment]
    return {
      id: m.metric_id,
      info: METRICS[m.metric_id] ?? { name: `metric ${m.metric_id}`, role: 'reporting' as const, kind: 'occurrence' as const },
      control: m.variants[control] ?? empty,
      treatment: m.variants[treatment] ?? empty,
      lift: inf?.lift ?? null,
      ciLow: inf?.ci_low ?? null,
      ciHigh: inf?.ci_high ?? null,
      chanceToWin: inf?.chance_to_win ?? null,
    }
  })

  const srmP = srmPValue(exposures[control] ?? 0, exposures[treatment] ?? 0)
  return { asOf: file.results.as_of, isFinal: file.results.is_final, control, treatment, exposures, srmP, rows, verdict: decide(rows, srmP) }
}

/** The pre-registered decision rule. `chanceToWin` already accounts for each metric's direction. */
export function decide(rows: Report['rows'], srmP: number): Verdict {
  if (srmP < SRM_ALPHA) return 'invalid-srm'
  const primary = rows.find((r) => r.info.role === 'primary')
  if (!primary || primary.chanceToWin === null) return 'not-enough-data'
  if (primary.control.n < MIN_PER_ARM || primary.treatment.n < MIN_PER_ARM) return 'not-enough-data'
  if (primary.control.sum < MIN_CONVERSIONS || primary.treatment.sum < MIN_CONVERSIONS) return 'not-enough-data'
  if (primary.chanceToWin <= THRESHOLD) return 'keep-inconclusive'
  const guardrailHit = rows.some((r) => r.info.role === 'guardrail' && r.chanceToWin !== null && 1 - r.chanceToWin > THRESHOLD)
  return guardrailHit ? 'keep-guardrail' : 'ship'
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const signedPct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`

function value(arm: Arm, kind: Kind) {
  if (arm.n === 0) return 'n/a'
  if (kind === 'mean') return `${(arm.sum / arm.n / 1000).toFixed(1)} s`
  return `${arm.sum}/${arm.n} (${pct(arm.sum / arm.n)})`
}

const VERDICT_TEXT: Record<Verdict, string> = {
  ship: '**Ship `{t}`.** Its chance to beat control on the primary metric is above 95% and no guardrail moved the wrong way.',
  'keep-inconclusive': '**Keep `{c}`.** The chance to beat control on the primary metric did not reach 95%, so the result is inconclusive.',
  'keep-guardrail': '**Keep `{c}`.** The primary metric passed, but a guardrail moved the wrong way with more than 95% chance.',
  'invalid-srm': '**Invalid.** The sample ratio check failed (p < 0.01), so assignment or tracking is suspect and no verdict is drawn.',
  'not-enough-data': '**Not enough data.** Each arm needs at least 50 players and 5 conversions on the primary metric before the rule applies.',
}

export function toMarkdown(r: Report): string {
  const lines = [
    `Results as of ${r.asOf}${r.isFinal ? ' (final)' : ''}.`,
    '',
    `| Arm | Players exposed |`,
    `|---|---|`,
    `| \`${r.control}\` (control) | ${r.exposures[r.control] ?? 0} |`,
    `| \`${r.treatment}\` (treatment) | ${r.exposures[r.treatment] ?? 0} |`,
    '',
    `Sample ratio check: p = ${r.srmP.toFixed(3)} (${r.srmP < SRM_ALPHA ? 'MISMATCH' : 'ok'}).`,
    '',
    `| Metric | Role | \`${r.control}\` | \`${r.treatment}\` | Lift (95% interval) | Chance \`${r.treatment}\` is better |`,
    `|---|---|---|---|---|---|`,
    ...r.rows.map((row) =>
      [
        `\`${row.info.name}\``,
        row.info.role,
        value(row.control, row.info.kind),
        value(row.treatment, row.info.kind),
        row.lift === null ? 'n/a' : `${signedPct(row.lift)} (${signedPct(row.ciLow!)} to ${signedPct(row.ciHigh!)})`,
        row.chanceToWin === null ? 'n/a' : pct(row.chanceToWin),
      ].join(' | ').replace(/^/, '| ').concat(' |'),
    ),
    '',
    `**Verdict by the pre-registered rule:** ${VERDICT_TEXT[r.verdict].replace('{t}', r.treatment).replace('{c}', r.control)}`,
  ]
  return lines.join('\n') + '\n'
}

if (import.meta.main) {
  const path = process.argv[2]
  if (!path) throw new Error('Usage: node scripts/report.ts <results.json>')
  process.stdout.write(toMarkdown(analyse(JSON.parse(readFileSync(path, 'utf8')) as ResultsFile)))
}
