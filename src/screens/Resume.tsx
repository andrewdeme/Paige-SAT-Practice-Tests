import { useEffect, useState } from 'react'
import { MODULE } from '../engine/format.ts'
import type { ModuleState } from '../engine/module.ts'
import { elapsedMs } from '../store/session.ts'

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Shown when a module is still running from before. The clock does not
// wait for her here; it just tells her where things stand.
export function Resume({ state, onContinue }: { state: ModuleState; onContinue: () => void }) {
  const [left, setLeft] = useState(() => state.run.allottedMs - elapsedMs(state))
  useEffect(() => {
    const id = setInterval(() => setLeft(state.run.allottedMs - elapsedMs(state)), 500)
    return () => clearInterval(id)
  }, [state])
  useEffect(() => {
    if (left <= 0) onContinue() // the module will file itself
  }, [left, onContinue])

  const m = MODULE[state.run.section === 'math' ? 'math' : 'rw']
  const answered = state.run.events.filter((e) => e.selected !== null).length
  return (
    <main className="start">
      <p>You have a {m.title} module in progress.</p>
      <p className="muted">
        {answered} of {state.questions.length} answered · {mmss(left)} left on the clock
      </p>
      <button type="button" className="primary" onClick={onContinue} autoFocus>
        Continue
      </button>
    </main>
  )
}
