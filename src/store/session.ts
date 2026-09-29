// Snapshot <-> ModuleState. Questions are not stored; they're rehydrated
// from the bank by id, so a snapshot is small and the bank stays the single
// source of question text.
import type { ModuleState } from '../engine/module.ts'
import { moduleReducer } from '../engine/module.ts'
import type { Question } from '../questions/schema.ts'

export type Snapshot = Omit<ModuleState, 'questions'>

export function toSnapshot(state: ModuleState): Snapshot {
  const { questions: _questions, ...rest } = state
  return rest
}

// Returns undefined if any question in the run is no longer in the bank.
export function fromSnapshot(snap: Snapshot, bank: readonly Question[]): ModuleState | undefined {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const questions: Question[] = []
  for (const id of snap.run.questionIds) {
    const q = byId.get(id)
    if (!q) return undefined
    questions.push(q)
  }
  return { ...snap, questions }
}

// Clock is wall time since run.startedAt. Closing the tab never stops it.
export function elapsedMs(state: Pick<ModuleState, 'run'>, now = Date.now()): number {
  return now - new Date(state.run.startedAt).getTime()
}

// If the clock ran out while the tab was closed, submit exactly at expiry.
export function settleExpired(state: ModuleState, now = Date.now()): ModuleState {
  if (state.phase === 'submitted') return state
  if (elapsedMs(state, now) < state.run.allottedMs) return state
  return moduleReducer(state, { type: 'submit', at: state.run.allottedMs, reason: 'timeout' })
}
