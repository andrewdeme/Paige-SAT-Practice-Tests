import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { assembleModule } from '../engine/assemble.ts'
import { allottedMs } from '../engine/format.ts'
import { createModule, moduleReducer } from '../engine/module.ts'
import { BANK } from '../questions/index.ts'
import { clearActive, db, listRuns, loadActive, saveActive, saveRun } from './db.ts'
import { fromSnapshot, settleExpired, toSnapshot } from './session.ts'

function fresh(startedAt: Date) {
  return createModule({
    questions: assembleModule(BANK, 'rw', 3),
    section: 'rw',
    moduleIndex: 1,
    conditionStage: 5,
    contentTier: 3,
    allottedMs: allottedMs('rw', 5),
    startedAt,
  })
}

describe('snapshot round trip', () => {
  it('drops question text and rehydrates it from the bank', () => {
    let s = fresh(new Date('2026-09-29T10:00:00Z'))
    s = moduleReducer(s, { type: 'select', choice: 2, at: 4000 })
    s = moduleReducer(s, { type: 'next', at: 9000 })
    const snap = toSnapshot(s)
    expect('questions' in snap).toBe(false)
    expect(JSON.stringify(snap).length).toBeLessThan(4000)
    const back = fromSnapshot(snap, BANK)!
    expect(back.questions.map((q) => q.id)).toEqual(s.run.questionIds)
    expect(back.index).toBe(1)
    expect(back.run.events[0]!.selected).toBe(2)
  })

  it('refuses a snapshot whose questions left the bank', () => {
    const s = fresh(new Date())
    const snap = toSnapshot(s)
    snap.run.questionIds[3] = 'rw-ii-e-999'
    expect(fromSnapshot(snap, BANK)).toBeUndefined()
  })
})

describe('resume clock', () => {
  const start = new Date('2026-09-29T10:00:00Z')

  it('keeps running while the tab is closed', () => {
    const s = fresh(start)
    const later = start.getTime() + 10 * 60 * 1000
    expect(settleExpired(s, later)).toBe(s) // still live, untouched
  })

  it('submits at exactly the allotted time if it expired while closed', () => {
    const s = fresh(start)
    const wayLater = start.getTime() + 3 * 60 * 60 * 1000
    const settled = settleExpired(s, wayLater)
    expect(settled.phase).toBe('submitted')
    expect(settled.run.completed).toBe(true)
    expect(settled.run.submittedAt).toBe(s.run.allottedMs)
  })
})

describe('db', () => {
  beforeEach(async () => {
    await db.runs.clear()
    await db.active.clear()
  })

  it('stores and clears the active snapshot', async () => {
    const s = fresh(new Date())
    await saveActive(toSnapshot(s))
    expect((await loadActive())?.run.id).toBe(s.run.id)
    await clearActive()
    expect(await loadActive()).toBeUndefined()
  })

  it('saveRun files the run and clears the active slot atomically', async () => {
    let s = fresh(new Date())
    await saveActive(toSnapshot(s))
    s = moduleReducer(s, { type: 'submit', at: 1000, reason: 'student' })
    await saveRun(s.run)
    expect(await loadActive()).toBeUndefined()
    const runs = await listRuns()
    expect(runs).toHaveLength(1)
    expect(runs[0]!.completed).toBe(true)
  })
})
