// Mirrors the backend's rule: letters, digits and . - ^ = (e.g. BRK-B, ^GSPC, EURUSD=X).
const SYMBOL_PATTERN = /^[A-Z0-9.\-^=]{1,15}$/

export function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase()
}

/** Returns an error message, or null when the symbol is valid. */
export function validateSymbol(symbol: string): string | null {
  if (symbol.length === 0) return 'Enter a stock symbol.'
  if (symbol.length > 15) return 'Symbols are at most 15 characters.'
  if (!SYMBOL_PATTERN.test(symbol)) return 'Use letters, digits, or . - ^ = only.'
  return null
}
