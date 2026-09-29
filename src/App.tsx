import { useCallback, useState } from 'react'
import { assembleModule } from './engine/assemble.ts'
import { allottedMs } from './engine/format.ts'
import { createModule, type ModuleState } from './engine/module.ts'
import { BANK } from './questions/index.ts'
import { Done } from './screens/Done.tsx'
import { Module } from './screens/Module.tsx'
import { Start } from './screens/Start.tsx'

type Screen = { name: 'start' } | { name: 'module'; state: ModuleState } | { name: 'done'; state: ModuleState }

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
  const [screen, setScreen] = useState<Screen>({ name: 'start' })
  const onSubmitted = useCallback((state: ModuleState) => setScreen({ name: 'done', state }), [])

  switch (screen.name) {
    case 'start':
      return <Start onStart={() => setScreen({ name: 'module', state: newModule() })} />
    case 'module':
      return <Module key={screen.state.run.id} initial={screen.state} onSubmitted={onSubmitted} />
    case 'done':
      return <Done state={screen.state} onRestart={() => setScreen({ name: 'start' })} />
  }
}
