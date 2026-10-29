export interface MarketIndex {
  /** Yahoo Finance symbol; index symbols start with `^`. */
  symbol: string
  name: string
}

/** The major US indexes shown above the popular stocks. Fixed, so they live here rather than in the API. */
export const MARKET_INDEXES: readonly MarketIndex[] = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'Nasdaq Composite' },
  { symbol: '^DJI', name: 'Dow Jones' },
]

/** The display name for a known index symbol, or undefined for anything else. */
export const indexName = (symbol: string) => MARKET_INDEXES.find((index) => index.symbol === symbol)?.name
