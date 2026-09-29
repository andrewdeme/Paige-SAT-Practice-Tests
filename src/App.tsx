import { useCallback, useEffect, useState } from 'react'
import { assembleModule } from './engine/assemble.ts'
import { allottedMs } from './engine/format.ts'
import { createModule, type ModuleState } from './engine/module.ts'
import { BANK } from './questions/index.ts'
import { Done } from './screens/Done.tsx'
import { Module } from './screens/Module.tsx'
import { Start } from './screens/Start.tsx'
import { clearActive, loadActive, saveActive, saveRun } from './store/db.ts'
import { fromSnapshot, settleExpired, toSnapshot } from './store/session.ts'

type Screen =
  | { name: 'loading' }
  | { name: 'start' }
  | { name: 'module'; state: ModuleState }
  | { name: 'done'; state: ModuleState }

// Step 3: condition stage 5 (real timing), balanced content, RW module 1.
function newModule(): ModuleState {
  return createModule({
    questions: assembleModule(BANK, 'rw'),
    section: 'rw',
    moduleIndex: 1,
    conditionStage: 5,
    contentTier: 3,
    allottedMs: allottedMs('rw', 5),
  })
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' })

  // On load: resume an in-progress module if there is one. The clock kept
  // running while the tab was closed; if it ran out, the module is filed
  // as submitted and she lands on the same end screen as always.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const snap = await loadActive()
      const restored = snap && fromSnapshot(snap, BANK)
      if (!restored) {
        if (snap) await clearActive()
        if (!cancelled) setScreen({ name: 'start' })
        return
      }
      const settled = settleExpired(restored)
      if (settled.phase === 'submitted') {
        await saveRun(settled.run)
        if (!cancelled) setScreen({ name: 'done', state: settled })
      } else if (!cancelled) {
        setScreen({ name: 'module', state: settled })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onChange = useCallback((state: ModuleState) => {
    void saveActive(toSnapshot(state))
  }, [])

  const onSubmitted = useCallback((state: ModuleState) => {
    void saveRun(state.run)
    setScreen({ name: 'done', state })
  }, [])

  const start = () => {
    const state = newModule()
    void saveActive(toSnapshot(state))
    setScreen({ name: 'module', state })
  }

  switch (screen.name) {
    case 'loading':
      return null
    case 'start':
      return <Start onStart={start} />
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
      return <Done onRestart={() => setScreen({ name: 'start' })} />
  }
}
