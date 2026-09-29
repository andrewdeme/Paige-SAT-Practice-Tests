// Everything the coach view shows is derived here from a Run plus the bank.
// Pure functions, no storage, no React.
import type { Question } from '../questions/schema.ts'
import { isCorrect } from './module.ts'
import type { QuestionEvent, Run } from './types.ts'

export type QuestionRow = {
  n: number
  question: Question
  event: QuestionEvent | undefined
  activeMs: number
  answered: boolean
  correct: boolean
  changed: boolean
  marked: boolean
  returned: boolean
  panics: number
}

export type Analysis = {
  rows: QuestionRow[]
  total: number
  answered: number
  correct: number
  accuracy: number // 0..1 of total
  usedMs: number
  allottedMs: number
  panics: number
  // Deviation (answered − target) sampled at each minute. Negative = behind.
  pacing: { minute: number; answered: number; target: number; deviation: number }[]
  maxBehind: number
  donated: QuestionRow[] // easy items answered wrong
  blankEasy: QuestionRow[] // easy items left blank
  changes: { toRight: number; toWrong: number; wrongToWrong: number }
  flaggedNeverReturned: number
  byDomain: { domain: string; n: number; correct: number; accuracy: number; avgMs: number }[]
  estimate: { low: number; high: number } // section score, rough
}

export function analyze(run: Run, bank: readonly Question[]): Analysis | undefined {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const questions: Question[] = []
  for (const id of run.questionIds) {
    const q = byId.get(id)
    if (!q) return undefined
    questions.push(q)
  }
  const events = new Map(run.events.map((e) => [e.questionId, e]))
  const panicsByQ = new Map<string, number>()
  for (const p of run.panics) panicsByQ.set(p.questionId, (panicsByQ.get(p.questionId) ?? 0) + 1)

  const rows: QuestionRow[] = questions.map((question, i) => {
    const event = events.get(question.id)
    const answered = !!event && event.selected !== null
    return {
      n: i + 1,
      question,
      event,
      activeMs: event?.activeMs ?? 0,
      answered,
      correct: !!event && isCorrect(question, event.selected),
      changed: !!event && event.changedFrom.length > 0,
      marked: !!event?.markedForReview,
      returned: !!event && event.visits > 1,
      panics: panicsByQ.get(question.id) ?? 0,
    }
  })

  const total = rows.length
  const correct = rows.filter((r) => r.correct).length
  const usedMs = run.submittedAt ?? run.allottedMs

  // Pacing: answered-by-minute vs. linear target.
  const answerTimes = rows
    .map((r) => r.event?.answeredAt ?? (r.answered ? r.event?.leftAt : undefined))
    .filter((t): t is number => typeof t === 'number' && t >= 0)
    .sort((a, b) => a - b)
  const minutes = Math.ceil(usedMs / 60_000)
  const pacing = []
  for (let m = 1; m <= minutes; m++) {
    const t = Math.min(m * 60_000, usedMs)
    const answered = answerTimes.filter((a) => a <= t).length
    const target = Math.min(total, (t / run.allottedMs) * total)
    pacing.push({ minute: m, answered, target: round1(target), deviation: round1(answered - target) })
  }
  const maxBehind = Math.max(0, ...pacing.map((p) => -p.deviation))

  const changes = { toRight: 0, toWrong: 0, wrongToWrong: 0 }
  for (const r of rows) {
    if (!r.changed || !r.event) continue
    const priorRight = r.event.changedFrom.some((v) => isCorrect(r.question, v))
    if (r.correct) changes.toRight++
    else if (priorRight) changes.toWrong++
    else changes.wrongToWrong++
  }

  const domains = [...new Set(rows.map((r) => r.question.domain))]
  const byDomain = domains.map((domain) => {
    const rs = rows.filter((r) => r.question.domain === domain)
    const c = rs.filter((r) => r.correct).length
    return {
      domain,
      n: rs.length,
      correct: c,
      accuracy: c / rs.length,
      avgMs: rs.reduce((s, r) => s + r.activeMs, 0) / rs.length,
    }
  })

  return {
    rows,
    total,
    answered: rows.filter((r) => r.answered).length,
    correct,
    accuracy: total ? correct / total : 0,
    usedMs,
    allottedMs: run.allottedMs,
    panics: run.panics.length,
    pacing,
    maxBehind,
    donated: rows.filter((r) => r.question.difficulty === 'E' && r.answered && !r.correct),
    blankEasy: rows.filter((r) => r.question.difficulty === 'E' && !r.answered),
    changes,
    flaggedNeverReturned: rows.filter((r) => r.marked && !r.returned).length,
    byDomain,
    estimate: estimateSection(correct, total),
  }
}

// One module is half a section and the real scale is adaptive, so this is
// deliberately a band, not a number. Linear 200–800 on raw accuracy, ±40.
function estimateSection(correct: number, total: number): { low: number; high: number } {
  if (!total) return { low: 200, high: 200 }
  const mid = 200 + 600 * (correct / total)
  const r10 = (x: number) => Math.round(x / 10) * 10
  return { low: Math.max(200, r10(mid - 40)), high: Math.min(800, r10(mid + 40)) }
}

function round1(x: number) {
  return Math.round(x * 10) / 10
}

export function fmtMs(ms: number): string {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Specific, true, and positive. These are what a parent says next time.
// Never mentions a wrong count; the numbers are elsewhere on the page.
export function pointers(a: Analysis, prev?: Analysis): string[] {
  const out: string[] = []
  const best = [...a.byDomain].sort((x, y) => y.accuracy - x.accuracy || x.avgMs - y.avgMs)[0]
  if (best && best.accuracy >= 0.6) {
    out.push(
      `${best.domain} is a strength: ${best.correct} of ${best.n} right at about ${fmtMs(best.avgMs)} each. Start there next time and bank that momentum.`,
    )
  }
  const fastAccurate = a.byDomain.filter((d) => d.accuracy >= 0.7 && d.avgMs < 60_000)
  if (fastAccurate.length > 1) {
    out.push(`She's both quick and accurate on ${fastAccurate.map((d) => d.domain).join(' and ')}. That's the pattern to trust under time.`)
  }
  if (a.changes.toRight > a.changes.toWrong) {
    out.push(
      `When she changed an answer, it went right ${a.changes.toRight} time${a.changes.toRight === 1 ? '' : 's'}. Her second look is worth trusting.`,
    )
  } else if (a.changes.toWrong > 0 && a.changes.toRight === 0) {
    out.push('Her first instinct held up better than her second guess this time. "Go with your first read" is the note.')
  }
  if (a.maxBehind <= 2) {
    out.push('Pace stayed within two questions of target the whole way. That is exactly the habit.')
  } else if (a.pacing.length) {
    const worst = a.pacing.reduce((w, p) => (p.deviation < w.deviation ? p : w))
    const back = a.pacing.slice(a.pacing.indexOf(worst)).find((p) => p.deviation > worst.deviation + 1)
    if (back) out.push(`She fell behind around minute ${worst.minute} and pulled it back by minute ${back.minute}. Recovering is the skill; she has it.`)
  }
  if (a.panics === 0) out.push('No pressure markers this run.')
  else if (prev && a.panics < prev.panics) out.push(`Pressure markers down from ${prev.panics} to ${a.panics}. It's working.`)
  if (prev && a.accuracy > prev.accuracy) {
    out.push(`Accuracy up from ${Math.round(prev.accuracy * 100)}% to ${Math.round(a.accuracy * 100)}% on the previous run.`)
  }
  if (a.flaggedNeverReturned > 0) {
    out.push(`She flagged ${a.flaggedNeverReturned} question${a.flaggedNeverReturned === 1 ? '' : 's'} and didn't get back. A quick pass through the flags in the last three minutes is free points.`)
  }
  if (a.donated.length > 0) {
    out.push(`${a.donated.length} of the easier questions slipped. Those are the fastest wins on the board; a second look at the easy ones before submitting pays off.`)
  }
  return out.slice(0, 5)
}
