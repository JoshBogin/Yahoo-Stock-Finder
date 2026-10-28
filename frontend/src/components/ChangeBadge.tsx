import { formatPercent } from '../utils/format'

/** Period change with a direction glyph, so gain/loss never relies on color alone. */
export function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) return <span className="change-badge">—</span>
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
  const glyph = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■'
  return (
    <span className="change-badge" data-direction={direction}>
      <span aria-hidden="true">{glyph}</span> {formatPercent(change)}
    </span>
  )
}
