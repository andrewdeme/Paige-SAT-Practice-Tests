// Pure state machine for one module. Every action carries `at`, ms since the
// module started, so the reducer never reads a clock and can be replayed.
import type { Question } from '../questions/schema.ts'
import type { PanicMarker, QuestionEvent, Run } from './types.ts'

export type Phase = 'question' | 'review' | 'submitted'

export type ModuleState = {
  run: Run
  questions: Question[]
  index: number
  phase: Phase
  eliminatorOn: boolean
  timerHidden: boolean
  // Transient: when the open question was last entered. Not part of Run.
  openedAt: number
}

export type ModuleAction =
  | { type: 'goto'; index: number; at: number }
  | { type: 'next'; at: number }
  | { type: 'prev'; at: number }
  | { type: 'select'; choice: number | string; at: number }
  | { type: 'toggleMark' }
  | { type: 'toggleEliminator' }
  | { type: 'toggleEliminate'; choice: number }
  | { type: 'panic'; at: number }
  | { type: 'review'; at: number }
  | { type: 'toggleTimer' }
  | { type: 'submit'; at: number; reason: 'student' | 'timeout' }

export function createModule(opts: {
  questions: Question[]
  section: Run['section']
  moduleIndex: Run['moduleIndex']
  conditionStage: Run['conditionStage']
  contentTier: Run['contentTier']
  allottedMs: number
  startedAt?: Date
}): ModuleState {
  const startedAt = opts.startedAt ?? new Date(Date.now())
  const first = opts.questions[0]
  if (!first) throw new Error('module needs at least one question')
  return {
    run: {
      id: `${startedAt.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: startedAt.toISOString(),
      section: opts.section,
      moduleIndex: opts.moduleIndex,
      conditionStage: opts.conditionStage,
      contentTier: opts.contentTier,
      allottedMs: opts.allottedMs,
      questionIds: opts.questions.map((q) => q.id),
      events: [openEvent(first.id, 0)],
      panics: [],
      completed: false,
    },
    questions: opts.questions,
    index: 0,
    phase: 'question',
    eliminatorOn: false,
    timerHidden: false,
    openedAt: 0,
  }
}

function openEvent(questionId: string, at: number): QuestionEvent {
  return {
    questionId,
    enteredAt: at,
    leftAt: -1,
    visits: 1,
    activeMs: 0,
    selected: null,
    changedFrom: [],
    markedForReview: false,
    eliminated: [],
  }
}

export function eventFor(state: ModuleState, questionId: string): QuestionEvent | undefined {
  return state.run.events.find((e) => e.questionId === questionId)
}

export function currentQuestion(state: ModuleState): Question {
  return state.questions[state.index]!
}

export function currentEvent(state: ModuleState): QuestionEvent {
  return eventFor(state, currentQuestion(state).id)!
}

export function answeredCount(state: ModuleState): number {
  return state.run.events.filter((e) => e.selected !== null).length
}

function updateEvent(
  run: Run,
  questionId: string,
  patch: (e: QuestionEvent) => QuestionEvent,
): Run {
  return { ...run, events: run.events.map((e) => (e.questionId === questionId ? patch(e) : e)) }
}

// Close the open question's visit at `at`.
function leaveCurrent(state: ModuleState, at: number): Run {
  if (state.phase !== 'question') return state.run
  const q = currentQuestion(state)
  return updateEvent(state.run, q.id, (e) => ({
    ...e,
    leftAt: at,
    activeMs: e.activeMs + Math.max(0, at - state.openedAt),
  }))
}

function enter(state: ModuleState, index: number, at: number): ModuleState {
  const run = leaveCurrent(state, at)
  const target = state.questions[index]
  if (!target) return state
  const existing = run.events.find((e) => e.questionId === target.id)
  const nextRun = existing
    ? updateEvent(run, target.id, (e) => ({ ...e, leftAt: -1, visits: e.visits + 1 }))
    : { ...run, events: [...run.events, openEvent(target.id, at)] }
  return { ...state, run: nextRun, index, phase: 'question', openedAt: at }
}

export function moduleReducer(state: ModuleState, action: ModuleAction): ModuleState {
  if (state.phase === 'submitted') return state

  switch (action.type) {
    case 'goto':
      return enter(state, action.index, action.at)

    case 'next':
      if (state.phase !== 'question') return state
      if (state.index === state.questions.length - 1) {
        return { ...state, run: leaveCurrent(state, action.at), phase: 'review' }
      }
      return enter(state, state.index + 1, action.at)

    case 'prev':
      if (state.phase !== 'question' || state.index === 0) return state
      return enter(state, state.index - 1, action.at)

    case 'review':
      if (state.phase !== 'question') return state
      return { ...state, run: leaveCurrent(state, action.at), phase: 'review' }

    case 'select': {
      if (state.phase !== 'question') return state
      const q = currentQuestion(state)
      return {
        ...state,
        run: updateEvent(state.run, q.id, (e) => {
          if (e.selected === action.choice) return e
          const empty = action.choice === ''
          return {
            ...e,
            selected: empty ? null : action.choice,
            answeredAt: e.answeredAt ?? (empty ? undefined : action.at),
            changedFrom: e.selected === null ? e.changedFrom : [...e.changedFrom, e.selected],
            // Picking a crossed-out choice un-crosses it, as in Bluebook.
            eliminated:
              typeof action.choice === 'number'
                ? e.eliminated.filter((c) => c !== action.choice)
                : e.eliminated,
          }
        }),
      }
    }

    case 'toggleMark': {
      if (state.phase !== 'question') return state
      const q = currentQuestion(state)
      return {
        ...state,
        run: updateEvent(state.run, q.id, (e) => ({ ...e, markedForReview: !e.markedForReview })),
      }
    }

    case 'toggleEliminator':
      return { ...state, eliminatorOn: !state.eliminatorOn }

    case 'toggleEliminate': {
      if (state.phase !== 'question') return state
      const q = currentQuestion(state)
      return {
        ...state,
        run: updateEvent(state.run, q.id, (e) => {
          const on = e.eliminated.includes(action.choice)
          return {
            ...e,
            eliminated: on
              ? e.eliminated.filter((c) => c !== action.choice)
              : [...e.eliminated, action.choice],
            // Crossing out the selected answer clears the selection.
            selected: !on && e.selected === action.choice ? null : e.selected,
            changedFrom:
              !on && e.selected === action.choice ? [...e.changedFrom, e.selected] : e.changedFrom,
          }
        }),
      }
    }

    case 'panic': {
      // Records and moves on. No phase change, no UI consequence.
      const marker: PanicMarker = {
        atMs: action.at,
        questionId: state.phase === 'question' ? currentQuestion(state).id : '',
      }
      return { ...state, run: { ...state.run, panics: [...state.run.panics, marker] } }
    }

    case 'toggleTimer':
      return { ...state, timerHidden: !state.timerHidden }

    case 'submit':
      return {
        ...state,
        run: {
          ...leaveCurrent(state, action.at),
          completed: true,
          submittedAt: action.at,
        },
        phase: 'submitted',
      }
  }
}

export function isCorrect(q: Question, selected: number | string | null): boolean {
  if (selected === null) return false
  if (q.type === 'mc') return selected === q.answer
  const given = String(selected).trim()
  return q.answer.split('|').some((a) => a === given || Number(a) === Number(given))
}
