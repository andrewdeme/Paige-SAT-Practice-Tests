// IndexedDB via Dexie (SPEC §5). No backend, no accounts; nothing leaves
// the device. Two tables: finished runs, and the single in-progress module
// snapshot so a closed tab can resume with the clock correct.
import Dexie, { type EntityTable } from 'dexie'
import type { Run } from '../engine/types.ts'
import type { Snapshot } from './session.ts'

export type StoredRun = Run & {
  // Set by the coach view. A discarded run is kept for the record but is
  // excluded from every chart and from the ramp engine.
  discarded?: boolean
}

type ActiveRow = { key: 'current'; snapshot: Snapshot }

export const db = new Dexie('sat-rehearsal') as Dexie & {
  runs: EntityTable<StoredRun, 'id'>
  active: EntityTable<ActiveRow, 'key'>
}

db.version(1).stores({
  runs: 'id, startedAt, section, completed',
  active: 'key',
})

export async function saveActive(snapshot: Snapshot): Promise<void> {
  await db.active.put({ key: 'current', snapshot })
}

export async function loadActive(): Promise<Snapshot | undefined> {
  return (await db.active.get('current'))?.snapshot
}

export async function clearActive(): Promise<void> {
  await db.active.delete('current')
}

export async function saveRun(run: Run): Promise<void> {
  await db.transaction('rw', db.runs, db.active, async () => {
    await db.runs.put(run)
    await db.active.delete('current')
  })
}

export async function listRuns(): Promise<StoredRun[]> {
  return db.runs.orderBy('startedAt').toArray()
}
