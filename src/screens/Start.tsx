import { useState } from 'react'
import { allottedMs, MODULE } from '../engine/format.ts'
import type { NextModule } from '../store/db.ts'

const TIPS_KEY = 'sat-rehearsal.tips-seen'

function tipsSeen(): boolean {
  try {
    return localStorage.getItem(TIPS_KEY) === '1'
  } catch {
    return false
  }
}

export function Start({ next, onStart }: { next: NextModule; onStart: () => void }) {
  const m = MODULE[next.section]
  const minutes = Math.round(allottedMs(next.section, next.conditionStage) / 60000)
  const [tipsOpen, setTipsOpen] = useState(() => !tipsSeen())

  const start = () => {
    try {
      localStorage.setItem(TIPS_KEY, '1')
    } catch {
      /* private mode; fine */
    }
    onStart()
  }

  return (
    <main className="intro">
      <h1>SAT Rehearsal</h1>
      <p className="lead">
        This is a practice environment built for you. It runs like the real SAT: the same screen,
        the same clock, the same rules. The idea is simple. The more times you sit through a real
        module, the more ordinary it feels on test day.
      </p>

      <section className="how">
        <h2>How it works</h2>
        <ul>
          <li>
            You'll work through a series of practice modules made for this. They start where you
            are and get more demanding as you go, so each one is a step up from the last.
          </li>
          <li>
            Each module is one section at a time, exactly like the SAT. Reading and Writing is{' '}
            {MODULE.rw.questions} questions in {MODULE.rw.minutes} minutes. Math is{' '}
            {MODULE.math.questions} questions in {MODULE.math.minutes} minutes.
          </li>
          <li>
            The clock runs like the real thing. It can't be paused, and when it reaches zero the
            module turns itself in. If you close the window by accident, just open it again. You'll
            be right where you left off.
          </li>
          <li>When you finish, that's it for today. Come back next time and pick up the next one.</li>
        </ul>
      </section>

      <section className="how">
        <button
          type="button"
          className="linklike"
          onClick={() => setTipsOpen((o) => !o)}
          aria-expanded={tipsOpen}
        >
          {tipsOpen ? '▾' : '▸'} Tips for the module
        </button>
        {tipsOpen && (
          <ul>
            <li>
              <strong>Mark for Review</strong> flags a question so you can come back to it. The
              question button at the bottom shows every question and lets you jump to any of them.
            </li>
            <li>
              <strong>ABC</strong> lets you cross out choices you've ruled out. It helps to narrow
              things down.
            </li>
            <li>
              <strong>Hide</strong> tucks the clock away if it's distracting. It comes back on its
              own for the last five minutes.
            </li>
            <li>
              If it starts to get to you, press <strong>P</strong> once and keep going. Nothing
              happens on screen. It just notes the moment so we can see later where the pressure
              tends to land, and work on it.
            </li>
          </ul>
        )}
      </section>

      <div className="today">
        <p>
          Today: {m.title} · {m.questions} questions · {minutes} minutes
        </p>
        <button type="button" className="primary" onClick={start} autoFocus>
          Start module
        </button>
      </div>
    </main>
  )
}
