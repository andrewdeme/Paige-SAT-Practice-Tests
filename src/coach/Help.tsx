// Plain-English guide to the coach view. Written for a parent opening the
// page for the first time, not for whoever built it.
export function Help({ onClose }: { onClose: () => void }) {
  return (
    <article className="report help">
      <header className="report-head">
        <h2>How to use the coach view</h2>
        <p className="muted">
          This page is for you, not for her. She never sees any of it. Read it between sessions, not
          over her shoulder.
        </p>
      </header>

      <section>
        <h3>The one rule</h3>
        <p>
          Everything she hears about a module should be specific and positive. The numbers on this
          page are for you to <em>steer</em> with, not to repeat. Use the <strong>What to say</strong>{' '}
          lines. They're written from her real results and never mention what she got wrong.
        </p>
      </section>

      <section>
        <h3>The runs list (left)</h3>
        <p>
          Every module she's taken, newest first. Each card shows the date, the section, how many
          she got right, how much of the clock she used, and <strong>P</strong>, the number of
          times she pressed the P key.
        </p>
        <ul>
          <li>Click a card to open its report.</li>
          <li>
            <strong>Discard</strong> removes a run from every chart and from anything automatic.
            Use it for a bad day, a sick day, a module she wasn't really taking. It's not deleted
            (Restore brings it back), it just stops counting. She's never told.
          </li>
        </ul>
      </section>

      <section>
        <h3>The P key and pressure markers</h3>
        <p>
          During a module, if she feels the panic starting, she presses <strong>P</strong> once and
          keeps going. Nothing happens on her screen. It records the moment. On the report, those
          moments show up as ochre ticks on the time chart so you can see <em>where</em> the
          pressure lands: early, late, on a particular kind of question. The goal over weeks is
          fewer ticks. If she never presses it, that's fine; the timing still shows the stalls.
        </p>
      </section>

      <section>
        <h3>The trend view</h3>
        <p>
          What you see before you click a run. Three lines across all kept runs: accuracy, pressure
          markers, and how far behind pace she got. Down-and-to-the-right on the last two is the
          whole point of the program. Click any dot to open that run.
        </p>
      </section>

      <section>
        <h3>The report, top to bottom</h3>
        <ul>
          <li>
            <strong>Tiles.</strong> Correct, time used, pressure markers, and a section-score
            estimate. The estimate is a band on purpose: one module is half a section and the real
            test adapts, so a single number would be false precision.
          </li>
          <li>
            <strong>What to say.</strong> Three to five lines you can repeat to her word for word.
            Pick one or two. Don't read the whole list.
          </li>
          <li>
            <strong>Time per question.</strong> One bar per question, in seconds. Ochre bars are
            easier questions she got wrong. Ochre ticks are P presses. Hover a bar for the details.
          </li>
          <li>
            <strong>Pace against target.</strong> Above the line means ahead of the clock, below
            means behind. Within about three questions either way is on track. A dip that recovers
            is a good sign; recovering is the skill.
          </li>
          <li>
            <strong>Donated points.</strong> Easier questions she missed or left blank. These are
            the fastest score gains available, which is why they get their own list.
          </li>
          <li>
            <strong>Answer changes.</strong> When she changed an answer, did it help or hurt? If
            changes mostly go right, her second look is worth trusting. If they mostly go wrong,
            "go with your first read" is the note.
          </li>
          <li>
            <strong>By domain.</strong> Accuracy and average time by question type. The strongest
            row is what you lead with next time.
          </li>
          <li>
            <strong>Every question.</strong> The full table, if you want it.
          </li>
        </ul>
      </section>

      <section>
        <h3>Next module</h3>
        <p>
          Normally the app decides what she gets next. The six buttons let you choose instead:
          Reading &amp; Writing or Math, on a generous clock (150% of real time), tight (125%), or
          real (100%). Set one and her next start screen reflects it. It's used once and then goes
          back to automatic. If she's had a rough week, a generous-clock module is a good way to
          hand her a win.
        </p>
      </section>

      <section>
        <h3>Where the data lives</h3>
        <p>
          On this computer only, inside the browser. No account, nothing uploaded. That means: use
          the same laptop and browser every time, and don't clear the browser's site data or it's
          gone. <strong>Export JSON</strong> downloads everything as a file if you want a backup or
          want to send it to someone.
        </p>
      </section>

      <section>
        <h3>The passcode</h3>
        <p>
          Keeps her from wandering in. It's set once on this computer and asked for once per browser
          session. It's a deterrent, not a lock; if it's forgotten, clearing the site data resets
          it, along with all the runs, so export first.
        </p>
      </section>

      <button type="button" className="primary" onClick={onClose}>
        Back
      </button>
    </article>
  )
}
