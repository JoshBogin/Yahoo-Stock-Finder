import { useQueries } from '@tanstack/react-query'
import type { DailySummary } from '../api/types'
import { DASHBOARD_SIZE, POPULAR_STOCK_POOL } from '../config/popularStocks'
import { dailySummaryQuery } from './useDailySummary'

function averageVolume(rows: DailySummary[]): number {
  if (rows.length === 0) return 0
  return rows.reduce((sum, row) => sum + row.volume, 0) / rows.length
}

/**
 * Fetches every symbol in the pool in parallel and returns the top ones by average daily volume.
 * Symbols that fail to load sort last, so a single bad card still shows (with its error) instead of vanishing.
 */
export function usePopularStocks() {
  return useQueries({
    queries: POPULAR_STOCK_POOL.map((symbol) => dailySummaryQuery(symbol)),
    combine: (results) => {
      const isRanking = results.some((result) => result.isPending)
      const symbols = isRanking
        ? POPULAR_STOCK_POOL.slice(0, DASHBOARD_SIZE)
        : POPULAR_STOCK_POOL.map((symbol, i) => ({ symbol, volume: averageVolume(results[i]?.data ?? []) }))
            .toSorted((a, b) => b.volume - a.volume)
            .slice(0, DASHBOARD_SIZE)
            .map((entry) => entry.symbol)
      return { symbols, isRanking }
    },
  })
}
