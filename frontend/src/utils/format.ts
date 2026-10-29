import type { DailySummary } from '../api/types'

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const pointsFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const integerFormat = new Intl.NumberFormat('en-US')
const percentFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})
const shortDateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const longDateFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export const formatPrice = (value: number) => priceFormat.format(value)
export const formatPoints = (value: number) => pointsFormat.format(value)

/** Yahoo index symbols start with `^` and are quoted in points, so they get no currency sign. */
export const valueFormatter = (symbol: string) => (symbol.startsWith('^') ? formatPoints : formatPrice)
export const formatVolumeCompact = (value: number) => compactFormat.format(value)
export const formatVolume = (value: number) => integerFormat.format(value)
export const formatPercent = (value: number) => percentFormat.format(value)

// `day` is a calendar date, not an instant: parse and format it in UTC so it never shifts a day.
export const formatShortDate = (day: string) => shortDateFormat.format(new Date(`${day}T00:00:00Z`))
export const formatLongDate = (day: string) => longDateFormat.format(new Date(`${day}T00:00:00Z`))

/** The day's overall average price: the midpoint of its low and high averages. */
export const dayAverage = (row: DailySummary) => (row.lowAverage + row.highAverage) / 2

/**
 * Relative change of a daily value (`highAverage` by default) from the first to the last day,
 * or null with fewer than two days.
 */
export function periodChange(
  rows: DailySummary[],
  value: (row: DailySummary) => number = (row) => row.highAverage,
): number | null {
  const first = rows[0]
  const last = rows.at(-1)
  if (!first || !last || rows.length < 2 || value(first) === 0) return null
  return (value(last) - value(first)) / value(first)
}
