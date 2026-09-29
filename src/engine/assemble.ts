// Builds a module from the bank. Step 3 ships only the Balanced mix
// (30% E / 45% M / 25% H, mirroring a real Module 1); tiers and adaptive
// routing arrive in step 7.
import type { Question, Section } from '../questions/schema.ts'
import { MODULE } from './format.ts'

// Bluebook orders RW modules by domain, easy to hard within each.
const RW_DOMAIN_ORDER = [
  'Craft and Structure',
  'Information and Ideas',
  'Expression of Ideas',
  'Standard English Conventions',
]
const MATH_DOMAIN_ORDER = [
  'Algebra',
  'Advanced Math',
  'Problem-Solving and Data Analysis',
  'Geometry and Trigonometry',
]
const DIFF_RANK = { E: 0, M: 1, H: 2 } as const

export function balancedCounts(n: number): Record<'E' | 'M' | 'H', number> {
  const E = Math.round(n * 0.3)
  const H = Math.round(n * 0.25)
  return { E, M: n - E - H, H }
}

// Deterministic PRNG so a seed reproduces the same module.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seenCounts(runs: readonly { questionIds: string[]; discarded?: boolean }[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of runs) {
    if (r.discarded) continue
    for (const id of r.questionIds) m.set(id, (m.get(id) ?? 0) + 1)
  }
  return m
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

// `seen` maps question id -> how many prior runs used it. Least-seen items
// are drawn first, so she cycles through the whole bank before any repeat.
export function assembleModule(
  bank: readonly Question[],
  section: Section,
  seed = Date.now(),
  seen: ReadonlyMap<string, number> = new Map(),
): Question[] {
  const n = MODULE[section].questions
  const want = balancedCounts(n)
  const rand = mulberry32(seed)
  const pool = bank.filter((q) => q.section === section)

  const picked: Question[] = []
  for (const d of ['E', 'M', 'H'] as const) {
    const avail = shuffle(pool.filter((q) => q.difficulty === d), rand).sort(
      (a, b) => (seen.get(a.id) ?? 0) - (seen.get(b.id) ?? 0),
    )
    if (avail.length < want[d]) {
      throw new Error(`bank has ${avail.length} ${section} ${d} items; module needs ${want[d]}`)
    }
    picked.push(...avail.slice(0, want[d]))
  }

  const order = section === 'rw' ? RW_DOMAIN_ORDER : MATH_DOMAIN_ORDER
  return picked.sort(
    (a, b) =>
      order.indexOf(a.domain) - order.indexOf(b.domain) ||
      DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty],
  )
}
