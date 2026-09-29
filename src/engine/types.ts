// Run data model (SPEC §6). Everything the app shows later is derived from
// Run[]; nothing computed is stored.

export type QuestionEvent = {
  questionId: string
  enteredAt: number // ms from module start, first visit
  leftAt: number // ms from module start, last departure (−1 while open)
  visits: number // returns through the navigator count as separate visits
  activeMs: number // total time spent on the question across all visits
  selected: number | string | null
  changedFrom: (number | string)[] // full answer-change history
  markedForReview: boolean
  eliminated: number[] // choices crossed out
}

export type PanicMarker = { atMs: number; questionId: string }

export type Run = {
  id: string
  startedAt: string // ISO
  section: 'rw' | 'math' | 'full'
  moduleIndex: 1 | 2
  conditionStage: 1 | 2 | 3 | 4 | 5 | 6
  contentTier: 1 | 2 | 3 | 4 | 5
  allottedMs: number
  questionIds: string[] // module order, so a run can be replayed from the bank
  events: QuestionEvent[]
  panics: PanicMarker[]
  completed: boolean // false = abandoned
  submittedAt?: number // ms from module start
  routedTo?: 'easy' | 'hard'
}
