import type { Question } from '../questions/schema.ts'
import type { QuestionEvent } from '../engine/types.ts'
import { Rich } from './Rich.tsx'

const LETTERS = ['A', 'B', 'C', 'D'] as const

export function QuestionPane({
  question,
  number,
  event,
  eliminatorOn,
  onSelect,
  onToggleMark,
  onToggleEliminator,
  onToggleEliminate,
}: {
  question: Question
  number: number
  event: QuestionEvent
  eliminatorOn: boolean
  onSelect: (choice: number | string) => void
  onToggleMark: () => void
  onToggleEliminator: () => void
  onToggleEliminate: (choice: number) => void
}) {
  return (
    <div className="qpane">
      <div className="qbar">
        <span className="qnum">{number}</span>
        <button
          type="button"
          className={`mark${event.markedForReview ? ' on' : ''}`}
          onClick={onToggleMark}
          aria-pressed={event.markedForReview}
        >
          <span className="qcell-flag" /> Mark for Review
        </button>
        {question.type === 'mc' && (
          <button
            type="button"
            className={`elim${eliminatorOn ? ' on' : ''}`}
            onClick={onToggleEliminator}
            aria-pressed={eliminatorOn}
            title="Cross out answer choices"
          >
            <s>ABC</s>
          </button>
        )}
      </div>

      <Rich className="stem" text={question.stem} />

      {question.type === 'mc' ? (
        <ol className="choices">
          {question.choices.map((text, i) => {
            const out = event.eliminated.includes(i)
            const selected = event.selected === i
            return (
              <li key={i} className={`${out ? 'out' : ''}${selected ? ' selected' : ''}`}>
                <button type="button" className="choice" onClick={() => onSelect(i)}>
                  <span className="letter">{LETTERS[i]}</span>
                  <span className="text">{text}</span>
                </button>
                {eliminatorOn && (
                  <button
                    type="button"
                    className="xout"
                    onClick={() => onToggleEliminate(i)}
                    aria-label={out ? `Undo cross out ${LETTERS[i]}` : `Cross out ${LETTERS[i]}`}
                  >
                    {out ? 'Undo' : <s>{LETTERS[i]}</s>}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="spr">
          <input
            type="text"
            inputMode="decimal"
            maxLength={6}
            value={event.selected === null ? '' : String(event.selected)}
            onChange={(e) => onSelect(e.target.value)}
            aria-label="Your answer"
          />
          <p className="spr-preview">Answer preview: {event.selected === null ? '' : String(event.selected)}</p>
        </div>
      )}
    </div>
  )
}
