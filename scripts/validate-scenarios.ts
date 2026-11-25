// Validates every scenario pack in scenarios/ and proves each one generates solvable incidents.
// Usage: npm run validate-scenarios   (exit code 1 on any problem)

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateIncident } from '../src/game/generate.ts'
import { validatePack, type ScenarioPack } from '../src/game/pack.ts'
import { viableChanges } from '../src/game/solver.ts'

const SEEDS_PER_PACK = 2000
const dir = join(import.meta.dirname, '..', 'scenarios')
let failed = false

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const pack: unknown = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  const problems = validatePack(pack)

  if (problems.length === 0) {
    for (let seed = 1; seed <= SEEDS_PER_PACK; seed++) {
      const incident = generateIncident(seed, pack as ScenarioPack)
      const viable = viableChanges(incident)
      if (viable.length !== 1 || viable[0]!.id !== incident.culpritId) {
        problems.push(`seed ${seed} does not have exactly one correct answer`)
        break
      }
    }
  }

  if (problems.length > 0) {
    failed = true
    console.error(`✗ ${file}`)
    for (const p of problems) console.error(`  - ${p}`)
  } else {
    console.log(`✓ ${file} (${SEEDS_PER_PACK} incidents solvable)`)
  }
}

process.exit(failed ? 1 : 0)
