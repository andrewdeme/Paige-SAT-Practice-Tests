// Renders stimulus/stem text: blank-line paragraphs, single newlines as
// line breaks, and pipe tables. No markdown library; the bank is ours.
import { Fragment } from 'react'

function Table({ lines }: { lines: string[] }) {
  const rows = lines
    .filter((l) => !/^\|?\s*-{2,}/.test(l))
    .map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
  const [head, ...body] = rows
  return (
    <table className="rich-table">
      {head && (
        <thead>
          <tr>
            {head.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {body.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function Rich({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => l.trim().startsWith('|'))) return <Table key={i} lines={lines} />
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {l}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
