// Horizontal track with two markers: where she is (answered count) and
// where she should be (elapsed share of the module). Ahead or on pace is
// neutral; behind is ochre. Never red.
export function PacingRail({
  answered,
  total,
  elapsedMs,
  allottedMs,
}: {
  answered: number
  total: number
  elapsedMs: number
  allottedMs: number
}) {
  const target = Math.min(total, (elapsedMs / allottedMs) * total)
  const behind = target - answered >= 2
  const pct = (n: number) => `${(n / total) * 100}%`
  return (
    <div
      className={`rail${behind ? ' rail-behind' : ''}`}
      role="img"
      aria-label={`${answered} of ${total} answered; pace target ${Math.floor(target)}`}
    >
      <div className="rail-track" />
      <div className="rail-target" style={{ left: pct(target) }} />
      <div className="rail-you" style={{ left: pct(answered) }} />
    </div>
  )
}
