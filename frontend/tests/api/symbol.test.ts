import { describe, expect, it } from 'vitest'
import { normalizeSymbol, validateSymbol } from '../../src/api/symbol'

describe('normalizeSymbol', () => {
  it('trims whitespace and upper-cases', () => {
    expect(normalizeSymbol('  aapl \n')).toBe('AAPL')
    expect(normalizeSymbol('brk-b')).toBe('BRK-B')
  })
})

describe('validateSymbol', () => {
  it.each(['AAPL', 'F', 'BRK-B', 'SHOP.TO', '^GSPC', 'ES=F', 'EURUSD=X', 'A'.repeat(15)])(
    'accepts %s',
    (symbol) => {
      expect(validateSymbol(symbol)).toBeNull()
    },
  )

  it('rejects an empty symbol', () => {
    expect(validateSymbol('')).toBe('Enter a stock symbol.')
  })

  it('rejects symbols longer than 15 characters', () => {
    expect(validateSymbol('A'.repeat(16))).toBe('Symbols are at most 15 characters.')
  })

  it.each(['TS$LA', 'AA PL', 'AAPL/../X', 'MSFT?x=1', 'aapl'])('rejects %s', (symbol) => {
    expect(validateSymbol(symbol)).toBe('Use letters, digits, or . - ^ = only.')
  })
})
