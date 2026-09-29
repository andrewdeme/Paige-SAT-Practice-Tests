// IndexedDB via Dexie (SPEC §5). No backend, no accounts; nothing leaves
// the device. Tables: finished runs, the single in-progress module snapshot
// (so a closed tab can resume with the clock correct), and coach settings.
import Dexie, { type EntityTable } from 'dexie'
import type { Run } from '../engine/types.ts'
import type { Snapshot } from './session.ts'

export type StoredRun = Run & {
  // Set by the coach view. A discarded run is kept for the record but is
  // excluded from every chart and from the ramp engine.
  discarded?: boolean
}

export type NextModule = {
  section: 'rw' | 'math'
  conditionStage: 3 | 4 | 5
}

export type Settings = {
  key: 'settings'
  passcodeHash?: string
  // Coach override for the next module. Cleared once it has been used.
  next?: NextModule
}

type ActiveRow = { key: 'current'; snapshot: Snapshot }

export const db = new Dexie('sat-rehearsal') as Dexie & {
  runs: EntityTable<StoredRun, 'id'>
  active: EntityTable<ActiveRow, 'key'>
  settings: EntityTable<Settings, 'key'>
}

db.version(1).stores({
  runs: 'id, startedAt, section, completed',
  active: 'key',
})
db.version(2).stores({
  runs: 'id, startedAt, section, completed',
  active: 'key',
  settings: 'key',
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

export async function saveRun(run: StoredRun): Promise<void> {
  await db.transaction('rw', db.runs, db.active, async () => {
    await db.runs.put(run)
    await db.active.delete('current')
  })
}

export async function listRuns(): Promise<StoredRun[]> {
  return db.runs.orderBy('startedAt').toArray()
}

export async function setDiscarded(id: string, discarded: boolean): Promise<void> {
  await db.runs.update(id, { discarded })
}

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('settings')) ?? { key: 'settings' }
}

export async function patchSettings(patch: Partial<Omit<Settings, 'key'>>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch }
  await db.settings.put(next)
  return next
}

// Reads and clears the coach override in one go.
export async function takeNextModule(): Promise<NextModule | undefined> {
  const s = await getSettings()
  if (s.next) await db.settings.put({ ...s, next: undefined })
  return s.next
}
