import { describe, expect, it } from 'vitest'
import type { DailySummary } from '../../src/api/types'
import {
  dayAverage,
  formatLongDate,
  formatPercent,
  formatPoints,
  formatPrice,
  formatShortDate,
  formatVolume,
  formatVolumeCompact,
  periodChange,
  valueFormatter,
} from '../../src/utils/format'

const row = (day: string, highAverage: number): DailySummary => ({
  day,
  highAverage,
  lowAverage: 0,
  volume: 0,
})

describe('dayAverage', () => {
  it('is the midpoint of the day’s low and high averages', () => {
    expect(
      dayAverage({ day: '2026-09-30', lowAverage: 250.1234, highAverage: 257.1519, volume: 0 }),
    ).toBeCloseTo(253.63765, 10)
  })
})

describe('periodChange', () => {
  it('is the relative change of highAverage from the first to the last day', () => {
    const rows = [row('2026-09-28', 200), row('2026-09-29', 180), row('2026-09-30', 250)]
    expect(periodChange(rows)).toBeCloseTo(0.25, 10)
  })

  it('is negative when the price fell', () => {
    expect(periodChange([row('2026-09-28', 100), row('2026-09-29', 90)])).toBeCloseTo(-0.1, 10)
  })

  it('is zero when the price is unchanged', () => {
    expect(periodChange([row('2026-09-28', 100), row('2026-09-29', 100)])).toBe(0)
  })

  it('is null with fewer than two days', () => {
    expect(periodChange([])).toBeNull()
    expect(periodChange([row('2026-09-28', 100)])).toBeNull()
  })

  it('measures another daily value when given one', () => {
    const rows: DailySummary[] = [
      { day: '2026-09-28', lowAverage: 90, highAverage: 110, volume: 0 },
      { day: '2026-09-29', lowAverage: 100, highAverage: 140, volume: 0 },
    ]
    expect(periodChange(rows, dayAverage)).toBeCloseTo(0.2, 10)
  })

  it('is null when the first price is zero, instead of Infinity', () => {
    expect(periodChange([row('2026-09-28', 0), row('2026-09-29', 10)])).toBeNull()
  })
})

describe('price formatting', () => {
  it('rounds four-decimal prices to cents when formatting currency', () => {
    expect(formatPrice(244.9062)).toBe('$244.91')
    expect(formatPrice(241.3718)).toBe('$241.37')
    expect(formatPrice(1234.5)).toBe('$1,234.50')
  })
})

describe('volume formatting', () => {
  it('groups whole volumes with separators', () => {
    expect(formatVolume(51_873_204)).toBe('51,873,204')
  })

  it('abbreviates compact volumes to one decimal', () => {
    expect(formatVolumeCompact(51_873_204)).toBe('51.9M')
    expect(formatVolumeCompact(3_500_000_000)).toBe('3.5B')
  })
})

describe('formatPoints', () => {
  it('rounds index levels to two decimals with separators and no currency sign', () => {
    expect(formatPoints(51_271.2351)).toBe('51,271.24')
    expect(formatPoints(7708)).toBe('7,708.00')
  })
})

describe('valueFormatter', () => {
  it('quotes index symbols (^) in points and everything else in dollars', () => {
    expect(valueFormatter('^GSPC')(7708)).toBe('7,708.00')
    expect(valueFormatter('AAPL')(257.1519)).toBe('$257.15')
    expect(valueFormatter('ES=F')(5000)).toBe('$5,000.00')
  })
})

describe('formatPercent', () => {
  it('shows two decimals with an explicit sign', () => {
    expect(formatPercent(0.12345)).toBe('+12.35%')
    expect(formatPercent(-0.0512)).toBe('-5.12%')
    expect(formatPercent(0)).toBe('0.00%')
  })
})

describe('date formatting', () => {
  it('formats the trading date without shifting it a day in any time zone', () => {
    expect(formatShortDate('2026-09-28')).toBe('Sep 28')
    expect(formatLongDate('2026-09-28')).toBe('Mon, Sep 28, 2026')
  })
})
