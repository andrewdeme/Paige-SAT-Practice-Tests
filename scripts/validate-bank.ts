// Validates every question bank file and exits non-zero on any malformed item.
// Runs before `vite build`, so a bad item fails the Vercel deploy.
//
//   node scripts/validate-bank.ts              # validate src/questions/bank/*.json
//   node scripts/validate-bank.ts a.json ...   # validate specific files
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { QuestionSchema, type Question } from '../src/questions/schema.ts'

const BANK_DIR = join(import.meta.dirname, '../src/questions/bank')
const MODULE_SIZE = { rw: 27, math: 22 } as const

const files = process.argv.length > 2
  ? process.argv.slice(2)
  : readdirSync(BANK_DIR).filter((f) => f.endsWith('.json')).map((f) => join(BANK_DIR, f))

const errors: string[] = []
const valid: Question[] = []
const seenIds = new Map<string, string>()

for (const file of files) {
  const name = relative(process.cwd(), file)
  let items: unknown
  try {
    items = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    errors.push(`${name}: not valid JSON (${(e as Error).message})`)
    continue
  }
  if (!Array.isArray(items)) {
    errors.push(`${name}: top level must be an array of questions`)
    continue
  }

  items.forEach((item, i) => {
    const rawId = typeof item?.id === 'string' ? item.id : undefined
    const label = `${name}[${i}]${rawId ? ` ${rawId}` : ''}`

    if (rawId) {
      const firstSeen = seenIds.get(rawId)
      if (firstSeen) errors.push(`${label}: duplicate id, first seen in ${firstSeen}`)
      else seenIds.set(rawId, `${name}[${i}]`)
    }

    const result = QuestionSchema.safeParse(item)
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${label}: ${issue.path.join('.') || '(item)'}: ${issue.message}`)
      }
      return
    }
    const q = result.data

    // SPEC §10: anything committed is original. EQB imports live on-device only.
    if (q.source !== 'original') {
      errors.push(`${label}: source is "${q.source}"; only original items may be committed`)
    }

    valid.push(q)
  })
}

if (errors.length) {
  console.error(`\n✗ Question bank invalid — ${errors.length} problem(s):\n`)
  for (const e of errors) console.error(`  ${e}`)
  console.error('')
  process.exit(1)
}

// Coverage summary: section → domain → E/M/H counts.
console.log(`✓ ${valid.length} questions valid across ${files.length} file(s)`)
for (const section of ['rw', 'math'] as const) {
  const qs = valid.filter((q) => q.section === section)
  if (!qs.length) continue
  const spr = qs.filter((q) => q.type === 'spr').length
  console.log(`\n  ${section.toUpperCase()}: ${qs.length}${spr ? ` (${spr} SPR)` : ''}`)
  const byDomain = Map.groupBy(qs, (q) => q.domain)
  for (const [domain, dq] of byDomain) {
    const n = (d: string) => dq.filter((q) => q.difficulty === d).length
    console.log(`    ${domain.padEnd(36)} E ${n('E')}  M ${n('M')}  H ${n('H')}`)
  }
  if (qs.length < MODULE_SIZE[section]) {
    console.warn(`    ⚠ fewer than one module's worth (${MODULE_SIZE[section]})`)
  }
}
