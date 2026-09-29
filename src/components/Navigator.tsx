import type { ModuleState } from '../engine/module.ts'
import { eventFor } from '../engine/module.ts'

export function QuestionGrid({
  state,
  onGoto,
  size = 'small',
}: {
  state: ModuleState
  onGoto: (index: number) => void
  size?: 'small' | 'large'
}) {
  return (
    <div className={`qgrid qgrid-${size}`}>
      {state.questions.map((q, i) => {
        const e = eventFor(state, q.id)
        const cls = [
          'qcell',
          e?.selected !== null && e?.selected !== undefined ? 'answered' : 'unanswered',
          e ? '' : 'unseen',
          e?.markedForReview ? 'marked' : '',
          state.phase === 'question' && i === state.index ? 'current' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <button key={q.id} type="button" className={cls} onClick={() => onGoto(i)}>
            {i + 1}
            {e?.markedForReview && <span className="qcell-flag" aria-label="marked for review" />}
          </button>
        )
      })}
    </div>
  )
}

export function GridLegend() {
  return (
    <div className="qlegend">
      <span>
        <i className="qcell current" /> Current
      </span>
      <span>
        <i className="qcell unanswered" /> Unanswered
      </span>
      <span>
        <i className="qcell answered marked">
          <span className="qcell-flag" />
        </i>{' '}
        For review
      </span>
    </div>
  )
}
