import { useCallback, useSyncExternalStore } from 'react'
import { normalizeSymbol, validateSymbol } from '../api/symbol'

const PARAM = 'symbol'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

function readSymbol(): string | null {
  const raw = new URLSearchParams(window.location.search).get(PARAM)
  if (raw === null) return null
  const symbol = normalizeSymbol(raw)
  return validateSymbol(symbol) === null ? symbol : null
}

/** The symbol shown in the detail panel, kept in `?symbol=` so it survives refresh and back/forward. */
export function useSelectedSymbol() {
  const symbol = useSyncExternalStore(subscribe, readSymbol)

  const setSymbol = useCallback((next: string | null) => {
    const url = new URL(window.location.href)
    if (next === null) url.searchParams.delete(PARAM)
    else url.searchParams.set(PARAM, next)
    window.history.pushState(null, '', url)
    // pushState doesn't fire popstate; notify subscribers ourselves.
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])

  return [symbol, setSymbol] as const
}
