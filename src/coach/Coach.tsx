import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { analyze, fmtMs } from '../engine/analyze.ts'
import { MODULE } from '../engine/format.ts'
import { BANK } from '../questions/index.ts'
import {
  getSettings,
  listRuns,
  patchSettings,
  setDiscarded,
  type NextModule,
  type Settings,
  type StoredRun,
} from '../store/db.ts'
import { hashCode, isUnlocked, setUnlocked } from './passcode.ts'
import { Report } from './Report.tsx'

const INK = '#1f1d24'
const GRID = '#e2dfd8'
const MUTED = '#6b6871'

export function Coach() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [unlocked, setUnlockedState] = useState(isUnlocked())

  useEffect(() => {
    void getSettings().then(setSettings)
  }, [])

  if (!settings) return null
  if (!settings.passcodeHash) {
    return (
      <Gate
        title="Set a passcode"
        hint="Four digits or more. This keeps the coach view out of the way; it isn't a vault."
        onSubmit={async (code) => {
          const next = await patchSettings({ passcodeHash: await hashCode(code) })
          setSettings(next)
          setUnlocked(true)
          setUnlockedState(true)
          return true
        }}
      />
    )
  }
  if (!unlocked) {
    return (
      <Gate
        title="Coach view"
        onSubmit={async (code) => {
          const ok = (await hashCode(code)) === settings.passcodeHash
          if (ok) {
            setUnlocked(true)
            setUnlockedState(true)
          }
          return ok
        }}
      />
    )
  }
  return <Dashboard settings={settings} onSettings={setSettings} />
}

function Gate({
  title,
  hint,
  onSubmit,
}: {
  title: string
  hint?: string
  onSubmit: (code: string) => Promise<boolean>
}) {
  const [code, setCode] = useState('')
  const [bad, setBad] = useState(false)
  return (
    <main className="gate">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (code.length < 4) return
          const ok = await onSubmit(code)
          if (!ok) {
            setBad(true)
            setCode('')
          }
        }}
      >
        <h1>{title}</h1>
        {hint && <p className="muted">{hint}</p>}
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setBad(false)
          }}
          aria-label="Passcode"
        />
        {bad && <p className="muted">That's not it.</p>}
        <button type="submit" className="primary" disabled={code.length < 4}>
          Continue
        </button>
      </form>
    </main>
  )
}

function Dashboard({ settings, onSettings }: { settings: Settings; onSettings: (s: Settings) => void }) {
  const [runs, setRuns] = useState<StoredRun[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const reload = () => listRuns().then((r) => setRuns(r.reverse()))
  useEffect(() => {
    void reload()
  }, [])

  const kept = runs.filter((r) => !r.discarded)
  const current = runs.find((r) => r.id === selected)
  const prevOf = (run: StoredRun) => kept.find((r) => r.startedAt < run.startedAt && r.section === run.section)

  const toggleDiscard = async (run: StoredRun) => {
    await setDiscarded(run.id, !run.discarded)
    await reload()
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), runs }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sat-rehearsal-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="coach">
      <aside className="coach-side">
        <h1>Coach</h1>
        <NextModuleControl settings={settings} onSettings={onSettings} />
        <h2>Runs</h2>
        {runs.length === 0 && <p className="muted">No modules yet.</p>}
        <ul className="runlist">
          {runs.map((r) => {
            const a = analyze(r, BANK)
            const d = new Date(r.startedAt)
            return (
              <li key={r.id} className={`${r.id === selected ? 'sel' : ''}${r.discarded ? ' disc' : ''}`}>
                <button type="button" className="runbtn" onClick={() => setSelected(r.id)}>
                  <span className="run-date">
                    {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                    <span className="muted">{d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                  </span>
                  <span className="run-meta">
                    {MODULE[r.section === 'math' ? 'math' : 'rw'].title} · {a ? `${a.correct}/${a.total}` : '—'} ·{' '}
                    {fmtMs(r.submittedAt ?? r.allottedMs)} · P {r.panics.length}
                    {!r.completed && ' · not finished'}
                    {r.discarded && ' · discarded'}
                  </span>
                </button>
                <button type="button" className="ghost tiny" onClick={() => toggleDiscard(r)}>
                  {r.discarded ? 'Restore' : 'Discard'}
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" className="ghost" onClick={exportJson} disabled={runs.length === 0}>
          Export JSON
        </button>
        <p className="muted small">
          Discarded runs stay in the export but count for nothing. Everything here lives on this computer only.
        </p>
      </aside>

      <main className="coach-main">
        {current ? (
          <Report run={current} prev={prevOf(current)} />
        ) : (
          <Trend runs={kept} onPick={setSelected} />
        )}
      </main>
    </div>
  )
}

function NextModuleControl({ settings, onSettings }: { settings: Settings; onSettings: (s: Settings) => void }) {
  const cur = settings.next
  const set = async (next: NextModule | undefined) => onSettings(await patchSettings({ next }))
  const stages: { stage: NextModule['conditionStage']; label: string }[] = [
    { stage: 3, label: 'Generous clock (150%)' },
    { stage: 4, label: 'Tight clock (125%)' },
    { stage: 5, label: 'Real clock (100%)' },
  ]
  return (
    <section className="nextctl">
      <h2>Next module</h2>
      <p className="muted small">
        {cur
          ? `Override set: ${MODULE[cur.section].title}, ${stages.find((s) => s.stage === cur.conditionStage)?.label}. Used once, then cleared.`
          : 'Automatic. Set an override to choose what she gets next time.'}
      </p>
      <div className="nextgrid">
        {(['rw', 'math'] as const).map((section) =>
          stages.map(({ stage, label }) => {
            const on = cur?.section === section && cur.conditionStage === stage
            return (
              <button
                key={`${section}-${stage}`}
                type="button"
                className={`ghost tiny${on ? ' on' : ''}`}
                onClick={() => set(on ? undefined : { section, conditionStage: stage })}
              >
                {section === 'rw' ? 'R&W' : 'Math'} · {label.split(' ')[0]}
              </button>
            )
          }),
        )}
      </div>
    </section>
  )
}

function Trend({ runs, onPick }: { runs: StoredRun[]; onPick: (id: string) => void }) {
  const points = [...runs]
    .reverse()
    .map((r, i) => {
      const a = analyze(r, BANK)
      return a && { i: i + 1, id: r.id, accuracy: Math.round(a.accuracy * 100), panics: a.panics, behind: a.maxBehind }
    })
    .filter((p): p is NonNullable<typeof p> => !!p)

  if (points.length === 0) {
    return (
      <div className="empty">
        <p>Pick a run on the left to see its report.</p>
      </div>
    )
  }

  const chart = (key: 'accuracy' | 'panics' | 'behind', title: string, note: string) => (
    <section>
      <h3>{title}</h3>
      <p className="muted small">{note}</p>
      <div className="chart">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart
            data={points}
            onClick={(e) => {
              const idx = typeof e?.activeIndex === 'number' ? e.activeIndex : Number(e?.activeIndex)
              const p = points[idx]
              if (p) onPick(p.id)
            }}
          >
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="i" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip content={({ payload }) => {
              const d = payload?.[0]?.payload as (typeof points)[number] | undefined
              return d ? <div className="tip">Run {d.i}: {d[key]}</div> : null
            }} />
            <Line type="monotone" dataKey={key} stroke={INK} strokeWidth={2} dot={{ r: 4, fill: INK }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )

  return (
    <article className="report">
      <header className="report-head">
        <h2>Across {points.length} run{points.length === 1 ? '' : 's'}</h2>
        <p className="muted">Discarded runs are left out. Click a point to open that run.</p>
      </header>
      {chart('accuracy', 'Accuracy', 'Percent correct per run.')}
      {chart('panics', 'Pressure markers', 'Times she pressed P per run. Down and to the right is the goal.')}
      {chart('behind', 'Furthest behind pace', 'Worst pacing deficit in questions. Within 3 is on track.')}
    </article>
  )
}
