import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchDailySummary } from '../api/client'

export function dailySummaryQuery(symbol: string) {
  return queryOptions({
    queryKey: ['daily-summary', symbol],
    queryFn: ({ signal }) => fetchDailySummary(symbol, signal),
  })
}

export function useDailySummary(symbol: string) {
  return useQuery(dailySummaryQuery(symbol))
}
