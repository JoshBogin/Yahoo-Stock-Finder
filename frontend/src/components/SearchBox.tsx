import { useId, useState, type FormEvent } from 'react'
import { normalizeSymbol, validateSymbol } from '../api/symbol'

interface SearchBoxProps {
  onSearch: (symbol: string) => void
}

export function SearchBox({ onSearch }: SearchBoxProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const errorId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const symbol = normalizeSymbol(value)
    const validationError = validateSymbol(symbol)
    setError(validationError)
    if (validationError) return
    setValue(symbol)
    onSearch(symbol)
  }

  return (
    <search className="search-box">
      <form onSubmit={handleSubmit} noValidate>
        <label className="search-box__label" htmlFor={inputId}>
          Look up a stock symbol
        </label>
        <div className="search-box__row">
          <input
            id={inputId}
            className="search-box__input"
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              if (error) setError(null)
            }}
            placeholder="e.g. AAPL"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={15}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          <button type="submit" className="button">
            Search
          </button>
        </div>
        {error && (
          <p id={errorId} className="search-box__error">
            {error}
          </p>
        )}
      </form>
    </search>
  )
}
