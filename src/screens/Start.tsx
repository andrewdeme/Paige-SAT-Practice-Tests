import { MODULE } from '../engine/format.ts'

export function Start({ onStart }: { onStart: () => void }) {
  const m = MODULE.rw
  return (
    <main className="start">
      <p>
        Today: {m.questions} questions, {m.minutes} minutes.
      </p>
      <button type="button" className="primary" onClick={onStart} autoFocus>
        Start module
      </button>
    </main>
  )
}
