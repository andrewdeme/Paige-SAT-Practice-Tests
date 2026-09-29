import { BANK } from './questions/index.ts'

export default function App() {
  const rw = BANK.filter((q) => q.section === 'rw').length
  const math = BANK.length - rw
  return (
    <main>
      <p>Hello from SAT Rehearsal.</p>
      <p>
        Bank loaded: {rw} Reading &amp; Writing, {math} Math.
      </p>
    </main>
  )
}
