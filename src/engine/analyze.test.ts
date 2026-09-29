import { describe, expect, it } from 'vitest'
import { BANK } from '../questions/index.ts'
import { analyze, pointers } from './analyze.ts'
import { assembleModule } from './assemble.ts'
import { allottedMs } from './format.ts'
import { createModule, moduleReducer, type ModuleState } from './module.ts'

function play(): ModuleState {
  let s = createModule({
    questions: assembleModule(BANK, 'rw', 11),
    section: 'rw',
    moduleIndex: 1,
    conditionStage: 5,
    contentTier: 3,
    allottedMs: allottedMs('rw', 5),
  })
  // Answer every question correctly except: Q1 wrong (easy), Q2 changed
  // wrong->right, Q3 changed right->wrong, Q4 marked and never returned.
  let t = 0
  for (let i = 0; i < s.questions.length; i++) {
    const q = s.questions[i]!
    if (q.type !== 'mc') continue
    const right = q.answer
    const wrong = (right + 1) % 4
    t += 60_000
    if (i === 0) s = moduleReducer(s, { type: 'select', choice: wrong, at: t })
    else if (i === 1) {
      s = moduleReducer(s, { type: 'select', choice: wrong, at: t })
      s = moduleReducer(s, { type: 'select', choice: right, at: t + 1000 })
    } else if (i === 2) {
      s = moduleReducer(s, { type: 'select', choice: right, at: t })
      s = moduleReducer(s, { type: 'select', choice: wrong, at: t + 1000 })
    } else {
      s = moduleReducer(s, { type: 'select', choice: right, at: t })
      if (i === 3) s = moduleReducer(s, { type: 'toggleMark' })
    }
    if (i === 5) s = moduleReducer(s, { type: 'panic', at: t + 500 })
    s = moduleReducer(s, { type: 'next', at: t + 2000 })
  }
  return moduleReducer(s, { type: 'submit', at: t + 5000, reason: 'student' })
}

describe('analyze', () => {
  const s = play()
  const a = analyze(s.run, BANK)!

  it('counts correct, changes, flags, panics', () => {
    expect(a.total).toBe(27)
    expect(a.correct).toBe(25)
    expect(a.changes).toEqual({ toRight: 1, toWrong: 1, wrongToWrong: 0 })
    expect(a.flaggedNeverReturned).toBe(1)
    expect(a.panics).toBe(1)
    expect(a.rows[5]!.panics).toBe(1)
  })

  it('lists donated points (easy items wrong)', () => {
    const q1 = s.questions[0]!
    expect(q1.difficulty).toBe('E')
    expect(a.donated.map((r) => r.n)).toEqual([1])
  })

  it('samples pacing per minute against a linear target', () => {
    expect(a.pacing[0]).toMatchObject({ minute: 1, answered: 1 })
    expect(a.pacing.at(-1)!.answered).toBe(27)
    expect(a.maxBehind).toBeLessThan(2)
  })

  it('gives a score band, never a point', () => {
    expect(a.estimate.low).toBeLessThan(a.estimate.high)
    expect(a.estimate.high).toBeLessThanOrEqual(800)
  })

  it('pointers are specific and never name a wrong count', () => {
    const p = pointers(a)
    expect(p.length).toBeGreaterThan(0)
    expect(p.length).toBeLessThanOrEqual(5)
    expect(p.join(' ')).not.toMatch(/wrong|missed|failed/i)
  })

  it('returns undefined when a question is missing from the bank', () => {
    expect(analyze({ ...s.run, questionIds: ['nope'] }, BANK)).toBeUndefined()
  })
})
