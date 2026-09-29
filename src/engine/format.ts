// Test format constants (SPEC §3).
export const MODULE = {
  rw: { questions: 27, minutes: 32, title: 'Reading and Writing' },
  math: { questions: 22, minutes: 35, title: 'Math' },
} as const

export const FIVE_MINUTES_MS = 5 * 60 * 1000

export function allottedMs(section: 'rw' | 'math', stage: number): number {
  const base = MODULE[section].minutes * 60 * 1000
  const factor = stage === 3 ? 1.5 : stage === 4 ? 1.25 : 1
  return Math.round(base * factor)
}
