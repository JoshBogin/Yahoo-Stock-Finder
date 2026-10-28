import type { DailySummary } from '../api/types'

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
// The API's full precision, fixed so columns of figures line up.
const precisePriceFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})
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
export const formatPrecisePrice = (value: number) => precisePriceFormat.format(value)
export const formatVolumeCompact = (value: number) => compactFormat.format(value)
export const formatVolume = (value: number) => integerFormat.format(value)
export const formatPercent = (value: number) => percentFormat.format(value)

// `day` is a calendar date, not an instant: parse and format it in UTC so it never shifts a day.
export const formatShortDate = (day: string) => shortDateFormat.format(new Date(`${day}T00:00:00Z`))
export const formatLongDate = (day: string) => longDateFormat.format(new Date(`${day}T00:00:00Z`))

/** Relative change of `highAverage` from the first to the last day, or null with fewer than two days. */
export function periodChange(rows: DailySummary[]): number | null {
  const first = rows[0]
  const last = rows.at(-1)
  if (!first || !last || rows.length < 2 || first.highAverage === 0) return null
  return (last.highAverage - first.highAverage) / first.highAverage
}
