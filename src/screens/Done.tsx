// Placeholder end screen until the report (step 5). Enough to prove the
// run recorded what it should.
import type { ModuleState } from '../engine/module.ts'
import { isCorrect } from '../engine/module.ts'

function mmss(ms: number) {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Done({ state, onRestart }: { state: ModuleState; onRestart: () => void }) {
  const { run, questions } = state
  const correct = questions.filter((q) => {
    const e = run.events.find((ev) => ev.questionId === q.id)
    return e && isCorrect(q, e.selected)
  }).length
  const answered = run.events.filter((e) => e.selected !== null).length
  return (
    <main className="start">
      <p>Module submitted.</p>
      <p className="muted">
        {correct} of {questions.length} correct · {answered} answered · {mmss(run.submittedAt ?? 0)}{' '}
        used · {run.panics.length} marker{run.panics.length === 1 ? '' : 's'}
      </p>
      <button type="button" className="primary" onClick={onRestart}>
        Back
      </button>
    </main>
  )
}
