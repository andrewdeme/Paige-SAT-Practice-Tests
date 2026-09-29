import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { GridLegend, QuestionGrid } from '../components/Navigator.tsx'
import { PacingRail } from '../components/PacingRail.tsx'
import { QuestionPane } from '../components/QuestionPane.tsx'
import { Rich } from '../components/Rich.tsx'
import { FIVE_MINUTES_MS, MODULE } from '../engine/format.ts'
import {
  answeredCount,
  currentEvent,
  currentQuestion,
  moduleReducer,
  type ModuleState,
} from '../engine/module.ts'

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Module({
  initial,
  onChange,
  onSubmitted,
}: {
  initial: ModuleState
  onChange: (state: ModuleState) => void
  onSubmitted: (state: ModuleState) => void
}) {
  const [state, dispatch] = useReducer(moduleReducer, initial)
  // Clock is anchored on the run's own start time, so a resumed run (step 4)
  // keeps the correct clock. The reducer only ever sees ms-since-start.
  const t0 = new Date(initial.run.startedAt).getTime()
  const now = useCallback(() => Date.now() - t0, [t0])
  const [elapsed, setElapsed] = useState(() => Date.now() - t0)
  const [navOpen, setNavOpen] = useState(false)
  const [fiveMinToast, setFiveMinToast] = useState(false)
  const fiveMinFired = useRef(false)

  const { allottedMs } = state.run
  const remaining = allottedMs - elapsed
  const inFinalFive = remaining <= FIVE_MINUTES_MS

  // Clock. Real time cannot be paused; expiry submits.
  useEffect(() => {
    const id = setInterval(() => setElapsed(now()), 250)
    return () => clearInterval(id)
  }, [now])

  useEffect(() => {
    if (elapsed >= allottedMs && state.phase !== 'submitted') {
      dispatch({ type: 'submit', at: allottedMs, reason: 'timeout' })
    }
  }, [elapsed, allottedMs, state.phase])

  useEffect(() => {
    if (inFinalFive && !fiveMinFired.current) {
      fiveMinFired.current = true
      setFiveMinToast(true)
      const id = setTimeout(() => setFiveMinToast(false), 6000)
      return () => clearTimeout(id)
    }
  }, [inFinalFive])

  // Persist after every action so a closed tab loses nothing.
  useEffect(() => {
    if (state === initial) return
    if (state.phase === 'submitted') onSubmitted(state)
    else onChange(state)
  }, [state, initial, onChange, onSubmitted])

  // P = panic marker. Records and moves on; nothing on screen changes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'p' || e.key === 'P') dispatch({ type: 'panic', at: now() })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [now])

  const goto = (index: number) => {
    dispatch({ type: 'goto', index, at: now() })
    setNavOpen(false)
  }

  const total = state.questions.length
  const format = MODULE[state.run.section === 'math' ? 'math' : 'rw']
  const showTimer = !state.timerHidden || inFinalFive

  return (
    <div className="module">
      <header className="chrome">
        <div className="chrome-left">
          Section 1, Module {state.run.moduleIndex}: {format.title}
        </div>
        <div className="chrome-center">
          <span className="timer" aria-live="off">
            {showTimer ? mmss(remaining) : '—'}
          </span>
          <button
            type="button"
            className="ghost"
            onClick={() => dispatch({ type: 'toggleTimer' })}
            disabled={inFinalFive}
          >
            {state.timerHidden ? 'Show' : 'Hide'}
          </button>
        </div>
        <div className="chrome-right">
          <button
            type="button"
            className="panic"
            aria-label="marker"
            onClick={() => dispatch({ type: 'panic', at: now() })}
          />
        </div>
      </header>

      <PacingRail
        answered={answeredCount(state)}
        total={total}
        elapsedMs={elapsed}
        allottedMs={allottedMs}
      />

      {fiveMinToast && <div className="toast">5 minutes remaining</div>}

      {state.phase === 'question' ? (
        <QuestionBody state={state} dispatch={dispatch} now={now} />
      ) : (
        <main className="review">
          <h2>Check Your Work</h2>
          <p className="muted">
            On test day, you won't be able to move on to the next module until time expires.
            For these practice questions, you can click Next when you're ready to move on.
          </p>
          <GridLegend />
          <QuestionGrid state={state} onGoto={goto} size="large" />
        </main>
      )}

      <footer className="chrome">
        <div className="chrome-left" />
        <div className="chrome-center">
          {state.phase === 'question' && (
            <button
              type="button"
              className="navtoggle"
              onClick={() => setNavOpen((o) => !o)}
              aria-expanded={navOpen}
            >
              Question {state.index + 1} of {total} {navOpen ? '▾' : '▴'}
            </button>
          )}
          {navOpen && state.phase === 'question' && (
            <div className="navpop">
              <div className="navpop-head">
                <strong>
                  Section 1, Module {state.run.moduleIndex}: {format.title} Questions
                </strong>
                <button type="button" className="ghost" onClick={() => setNavOpen(false)}>
                  Close
                </button>
              </div>
              <GridLegend />
              <QuestionGrid state={state} onGoto={goto} />
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  dispatch({ type: 'review', at: now() })
                  setNavOpen(false)
                }}
              >
                Go to Review Page
              </button>
            </div>
          )}
        </div>
        <div className="chrome-right">
          {state.phase === 'question' ? (
            <>
              <button
                type="button"
                className="primary"
                onClick={() => dispatch({ type: 'prev', at: now() })}
                disabled={state.index === 0}
              >
                Back
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => dispatch({ type: 'next', at: now() })}
              >
                Next
              </button>
            </>
          ) : (
            <>
              <button type="button" className="primary" onClick={() => goto(total - 1)}>
                Back
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => dispatch({ type: 'submit', at: now(), reason: 'student' })}
              >
                Submit module
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}

function QuestionBody({
  state,
  dispatch,
  now,
}: {
  state: ModuleState
  dispatch: React.Dispatch<Parameters<typeof moduleReducer>[1]>
  now: () => number
}) {
  const q = currentQuestion(state)
  const e = currentEvent(state)
  return (
    <main className={`body${q.stimulus ? ' split' : ''}`}>
      {q.stimulus && (
        <section className="stimulus">
          <Rich text={q.stimulus} />
        </section>
      )}
      <section className="question">
        <QuestionPane
          question={q}
          number={state.index + 1}
          event={e}
          eliminatorOn={state.eliminatorOn}
          onSelect={(choice) => dispatch({ type: 'select', choice, at: now() })}
          onToggleMark={() => dispatch({ type: 'toggleMark' })}
          onToggleEliminator={() => dispatch({ type: 'toggleEliminator' })}
          onToggleEliminate={(choice) => dispatch({ type: 'toggleEliminate', choice })}
        />
      </section>
    </main>
  )
}
