import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { analyze, fmtMs, pointers, type Analysis } from '../engine/analyze.ts'
import { MODULE } from '../engine/format.ts'
import { BANK } from '../questions/index.ts'
import type { StoredRun } from '../store/db.ts'

// Chart ink. Single-series charts throughout, so no categorical palette:
// one dark mark colour, ochre for the two "attention" encodings (panic
// ticks, donated points), muted grid. Nothing red.
const INK = '#1f1d24'
const OCHRE = '#b8860b'
const GRID = '#e2dfd8'
const MUTED = '#6b6871'

export function Report({ run, prev }: { run: StoredRun; prev?: StoredRun }) {
  const a = analyze(run, BANK)
  const p = prev ? analyze(prev, BANK) : undefined
  if (!a) return <p className="muted">This run references questions no longer in the bank.</p>
  const fmt = MODULE[run.section === 'math' ? 'math' : 'rw']
  const date = new Date(run.startedAt)

  return (
    <article className="report">
      <header className="report-head">
        <h2>
          {fmt.title} · {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
          {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </h2>
        <p className="muted">
          {Math.round(a.allottedMs / 60000)}-minute clock · {run.completed ? 'completed' : 'not finished'}
          {run.discarded ? ' · discarded' : ''}
        </p>
      </header>

      <section className="tiles">
        <Tile label="Correct" value={`${a.correct} / ${a.total}`} sub={`${Math.round(a.accuracy * 100)}%`} />
        <Tile label="Time used" value={fmtMs(a.usedMs)} sub={`of ${fmtMs(a.allottedMs)}`} />
        <Tile label="Pressure markers" value={String(a.panics)} />
        <Tile
          label="Section estimate"
          value={`${a.estimate.low}–${a.estimate.high}`}
          sub="rough, one module"
        />
      </section>

      <section>
        <h3>What to say</h3>
        <ul className="pointers">
          {pointers(a, p).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Time per question</h3>
        <p className="muted small">Bars are seconds on each question. Ochre ticks mark where she pressed P.</p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={a.rows.map((r) => ({ n: r.n, sec: Math.round(r.activeMs / 1000), r }))} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="n" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={32} />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ payload }) => {
                  const d = payload?.[0]?.payload as { r: Analysis['rows'][number] } | undefined
                  if (!d) return null
                  const r = d.r
                  return (
                    <div className="tip">
                      <strong>Q{r.n}</strong> · {r.question.domain} · {r.question.difficulty}
                      <br />
                      {fmtMs(r.activeMs)} · {r.answered ? (r.correct ? 'correct' : 'incorrect') : 'blank'}
                      {r.changed ? ' · changed' : ''}
                      {r.marked ? ' · flagged' : ''}
                      {r.panics ? ` · P ×${r.panics}` : ''}
                    </div>
                  )
                }}
              />
              {a.rows.filter((r) => r.panics > 0).map((r) => (
                <ReferenceLine key={r.n} x={r.n} stroke={OCHRE} strokeWidth={2} />
              ))}
              <Bar dataKey="sec" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {a.rows.map((r) => (
                  <Cell key={r.n} fill={r.answered && !r.correct && r.question.difficulty === 'E' ? OCHRE : INK} fillOpacity={r.answered ? 1 : 0.35} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h3>Pace against target</h3>
        <p className="muted small">Questions ahead (above the line) or behind (below) where the clock said she should be, minute by minute.</p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={a.pacing}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="minute" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={32} domain={[(min: number) => Math.min(-2, Math.floor(min)), (max: number) => Math.max(2, Math.ceil(max))]} />
              <ReferenceLine y={0} stroke={MUTED} />
              <Tooltip
                content={({ payload }) => {
                  const d = payload?.[0]?.payload as Analysis['pacing'][number] | undefined
                  if (!d) return null
                  return (
                    <div className="tip">
                      Minute {d.minute}: {d.answered} answered, target {d.target}
                    </div>
                  )
                }}
              />
              <Line type="monotone" dataKey="deviation" stroke={INK} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="cols">
        <div>
          <h3>Donated points</h3>
          <p className="muted small">Easier questions that slipped. Highest-leverage list on the page.</p>
          {a.donated.length + a.blankEasy.length === 0 ? (
            <p>None. Every easy question was banked.</p>
          ) : (
            <ul className="plain">
              {a.donated.map((r) => (
                <li key={r.n}>
                  <strong>Q{r.n}</strong> · {r.question.skill}
                </li>
              ))}
              {a.blankEasy.map((r) => (
                <li key={r.n} className="muted">
                  <strong>Q{r.n}</strong> · {r.question.skill} · left blank
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3>Answer changes</h3>
          <ul className="plain">
            <li>Changed to the right answer: <strong>{a.changes.toRight}</strong></li>
            <li>Changed away from the right answer: <strong>{a.changes.toWrong}</strong></li>
            <li>Changed, still not there: <strong>{a.changes.wrongToWrong}</strong></li>
            <li>Flagged and never returned: <strong>{a.flaggedNeverReturned}</strong></li>
          </ul>
        </div>
      </section>

      <section>
        <h3>By domain</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Correct</th>
              <th>Avg time</th>
            </tr>
          </thead>
          <tbody>
            {a.byDomain.map((d) => (
              <tr key={d.domain}>
                <td>{d.domain}</td>
                <td>
                  {d.correct} / {d.n}
                </td>
                <td>{fmtMs(d.avgMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <details>
        <summary>Every question</summary>
        <table className="data">
          <thead>
            <tr>
              <th>#</th>
              <th>Domain</th>
              <th>Diff.</th>
              <th>Time</th>
              <th>Result</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {a.rows.map((r) => (
              <tr key={r.n}>
                <td>{r.n}</td>
                <td>{r.question.domain}</td>
                <td>{r.question.difficulty}</td>
                <td>{fmtMs(r.activeMs)}</td>
                <td>{r.answered ? (r.correct ? 'correct' : 'incorrect') : 'blank'}</td>
                <td className="muted">
                  {[r.changed && 'changed', r.marked && 'flagged', r.returned && 'revisited', r.panics && `P ×${r.panics}`]
                    .filter(Boolean)
                    .join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </article>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  )
}
