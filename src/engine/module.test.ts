import { describe, expect, it } from 'vitest'
import { BANK } from '../questions/index.ts'
import { assembleModule, balancedCounts, seenCounts } from './assemble.ts'
import { allottedMs } from './format.ts'
import { answeredCount, createModule, eventFor, isCorrect, moduleReducer } from './module.ts'

function fresh() {
  return createModule({
    questions: assembleModule(BANK, 'rw', 42),
    section: 'rw',
    moduleIndex: 1,
    conditionStage: 5,
    contentTier: 3,
    allottedMs: allottedMs('rw', 5),
  })
}

describe('assembleModule', () => {
  it('builds a 27-question balanced RW module in Bluebook domain order', () => {
    const qs = assembleModule(BANK, 'rw', 1)
    expect(qs).toHaveLength(27)
    const counts = { E: 0, M: 0, H: 0 }
    for (const q of qs) counts[q.difficulty]++
    expect(counts).toEqual(balancedCounts(27))
    expect(new Set(qs.map((q) => q.id)).size).toBe(27)
    const firstSec = qs.findIndex((q) => q.domain === 'Standard English Conventions')
    expect(qs.slice(firstSec).every((q) => q.domain === 'Standard English Conventions')).toBe(true)
  })

  it('is deterministic for a seed', () => {
    expect(assembleModule(BANK, 'rw', 7).map((q) => q.id)).toEqual(
      assembleModule(BANK, 'rw', 7).map((q) => q.id),
    )
  })

  it('draws unseen questions before seen ones', () => {
    const first = assembleModule(BANK, 'rw', 1)
    const seen = seenCounts([{ questionIds: first.map((q) => q.id) }])
    const second = assembleModule(BANK, 'rw', 2, seen)
    const unseenInBank = BANK.filter((q) => q.section === 'rw' && !seen.has(q.id)).length
    const overlap = second.filter((q) => seen.has(q.id)).length
    // Every unseen item that fits the mix is used before any repeat.
    expect(second.length - overlap).toBeGreaterThanOrEqual(Math.min(unseenInBank, second.length) - 8)
    expect(seenCounts([{ questionIds: ['a'], discarded: true }]).size).toBe(0)
  })

  it('builds a 22-question math module', () => {
    expect(assembleModule(BANK, 'math', 1)).toHaveLength(22)
  })
})

describe('moduleReducer', () => {
  it('records enter, leave, and visits including navigator revisits', () => {
    let s = fresh()
    const q0 = s.questions[0]!.id
    const q1 = s.questions[1]!.id
    s = moduleReducer(s, { type: 'next', at: 10_000 })
    s = moduleReducer(s, { type: 'goto', index: 0, at: 25_000 })
    s = moduleReducer(s, { type: 'next', at: 30_000 })

    const e0 = eventFor(s, q0)!
    expect(e0.enteredAt).toBe(0)
    expect(e0.visits).toBe(2)
    expect(e0.activeMs).toBe(10_000 + 5_000)
    expect(e0.leftAt).toBe(30_000)

    const e1 = eventFor(s, q1)!
    expect(e1.visits).toBe(2)
    expect(e1.leftAt).toBe(-1) // currently open
  })

  it('tracks answer changes and eliminator interactions', () => {
    let s = fresh()
    s = moduleReducer(s, { type: 'select', choice: 1, at: 1 })
    s = moduleReducer(s, { type: 'select', choice: 2, at: 2 })
    s = moduleReducer(s, { type: 'toggleEliminate', choice: 2 })
    let e = eventFor(s, s.questions[0]!.id)!
    expect(e.selected).toBeNull()
    expect(e.changedFrom).toEqual([1, 2])
    expect(e.eliminated).toEqual([2])

    s = moduleReducer(s, { type: 'select', choice: 2, at: 3 })
    e = eventFor(s, s.questions[0]!.id)!
    expect(e.selected).toBe(2)
    expect(e.eliminated).toEqual([])
    expect(answeredCount(s)).toBe(1)
  })

  it('panic markers record without changing anything else', () => {
    let s = fresh()
    const before = { index: s.index, phase: s.phase }
    s = moduleReducer(s, { type: 'panic', at: 5_000 })
    expect(s.run.panics).toEqual([{ atMs: 5_000, questionId: s.questions[0]!.id }])
    expect({ index: s.index, phase: s.phase }).toEqual(before)
  })

  it('next on the last question goes to review; submit closes the run', () => {
    let s = fresh()
    s = moduleReducer(s, { type: 'goto', index: 26, at: 100 })
    s = moduleReducer(s, { type: 'next', at: 200 })
    expect(s.phase).toBe('review')
    s = moduleReducer(s, { type: 'submit', at: 300, reason: 'timeout' })
    expect(s.phase).toBe('submitted')
    expect(s.run.completed).toBe(true)
    expect(s.run.submittedAt).toBe(300)
    // Frozen afterwards.
    expect(moduleReducer(s, { type: 'goto', index: 0, at: 400 })).toBe(s)
  })
})

describe('isCorrect', () => {
  const spr = BANK.find((q) => q.type === 'spr' && q.answer === '8000')!
  it('accepts numerically equal SPR entries', () => {
    expect(isCorrect(spr, '8000')).toBe(true)
    expect(isCorrect(spr, '8000.0')).toBe(true)
    expect(isCorrect(spr, '800')).toBe(false)
  })
})
