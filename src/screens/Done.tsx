// Every module ends the same way, whatever happened in it. No numbers here;
// results live in the coach view only.
export function Done({ onRestart }: { onRestart: () => void }) {
  return (
    <main className="start">
      <p>Module complete.</p>
      <p className="muted">That's one more in the bank. Good work today.</p>
      <button type="button" className="primary" onClick={onRestart} autoFocus>
        Done
      </button>
    </main>
  )
}
