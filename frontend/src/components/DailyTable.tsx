import type { DailySummary } from '../api/types'
import { formatLongDate, formatPrecisePrice, formatVolume } from '../utils/format'

export function DailyTable({ symbol, data }: { symbol: string; data: DailySummary[] }) {
  // Newest first: the most recent day is what people look for.
  const rows = data.toReversed()

  return (
    // A scrollable region must be focusable so keyboard users can scroll it.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/prefer-tag-over-role
    <div className="table-scroll" tabIndex={0} role="region" aria-label={`${symbol} daily figures`}>
      <table className="daily-table">
        <caption className="visually-hidden">{symbol} daily summary, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Low avg</th>
            <th scope="col">High avg</th>
            <th scope="col">Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day}>
              <th scope="row">{formatLongDate(row.day)}</th>
              <td>{formatPrecisePrice(row.lowAverage)}</td>
              <td>{formatPrecisePrice(row.highAverage)}</td>
              <td>{formatVolume(row.volume)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
