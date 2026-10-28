import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchPopularSymbols } from '../api/client'

export const popularSymbolsQuery = queryOptions({
  queryKey: ['popular-symbols'],
  queryFn: ({ signal }) => fetchPopularSymbols(signal),
  // The list comes from server config, so it won't change while the page is open.
  staleTime: Infinity,
})

export function usePopularStocks() {
  return useQuery(popularSymbolsQuery)
}
