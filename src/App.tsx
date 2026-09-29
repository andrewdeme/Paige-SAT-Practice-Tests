import { useCallback, useEffect, useState } from 'react'
import { Coach } from './coach/Coach.tsx'
import { assembleModule } from './engine/assemble.ts'
import { allottedMs } from './engine/format.ts'
import { createModule, type ModuleState } from './engine/module.ts'
import { BANK } from './questions/index.ts'
import { Done } from './screens/Done.tsx'
import { Module } from './screens/Module.tsx'
import { Resume } from './screens/Resume.tsx'
import { Start } from './screens/Start.tsx'
import { clearActive, getSettings, loadActive, saveActive, saveRun, takeNextModule, type NextModule } from './store/db.ts'
import { fromSnapshot, settleExpired, toSnapshot } from './store/session.ts'

type Screen =
  | { name: 'loading' }
  | { name: 'start'; next: NextModule }
  | { name: 'resume'; state: ModuleState }
  | { name: 'module'; state: ModuleState }
  | { name: 'done'; state: ModuleState }

// Until the ramp engine (step 6): real clock, balanced content, RW, unless
// the coach view has set an override.
const DEFAULT_NEXT: NextModule = { section: 'rw', conditionStage: 5 }

function newModule(next: NextModule): ModuleState {
  return createModule({
    questions: assembleModule(BANK, next.section),
    section: next.section,
    moduleIndex: 1,
    conditionStage: next.conditionStage,
    contentTier: 3,
    allottedMs: allottedMs(next.section, next.conditionStage),
  })
}

export default function App() {
  if (window.location.pathname === '/coach') return <Coach />
  return <Student />
}

function Student() {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' })

  const toStart = useCallback(async () => {
    const s = await getSettings()
    setScreen({ name: 'start', next: s.next ?? DEFAULT_NEXT })
  }, [])

  // On load: if a module is in progress, offer to continue it. The clock
  // kept running while the tab was closed. If it ran out, the run is filed
  // quietly (discarded if she never answered anything) and she gets the
  // normal start page, not a congratulation for something she didn't do.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const snap = await loadActive()
      const restored = snap && fromSnapshot(snap, BANK)
      if (!restored) {
        if (snap) await clearActive()
        if (!cancelled) await toStart()
        return
      }
      const settled = settleExpired(restored)
      if (settled.phase === 'submitted') {
        const untouched = settled.run.events.every((e) => e.selected === null)
        await saveRun({ ...settled.run, discarded: untouched })
        if (!cancelled) await toStart()
      } else if (!cancelled) {
        setScreen({ name: 'resume', state: settled })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [toStart])

  const onChange = useCallback((state: ModuleState) => {
    void saveActive(toSnapshot(state))
  }, [])

  const onSubmitted = useCallback((state: ModuleState) => {
    void saveRun(state.run)
    setScreen({ name: 'done', state })
  }, [])

  const start = async () => {
    const next = (await takeNextModule()) ?? DEFAULT_NEXT
    const state = newModule(next)
    await saveActive(toSnapshot(state))
    setScreen({ name: 'module', state })
  }

  switch (screen.name) {
    case 'loading':
      return null
    case 'start':
      return <Start next={screen.next} onStart={start} />
    case 'resume':
      return (
        <Resume
          state={screen.state}
          onContinue={() => setScreen({ name: 'module', state: screen.state })}
        />
      )
    case 'module':
      return (
        <Module
          key={screen.state.run.id}
          initial={screen.state}
          onChange={onChange}
          onSubmitted={onSubmitted}
        />
      )
    case 'done':
      return <Done onRestart={toStart} />
  }
}
