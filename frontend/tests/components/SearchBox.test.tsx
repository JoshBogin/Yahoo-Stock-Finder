import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchBox } from '../../src/components/SearchBox'

function setup() {
  const onSearch = vi.fn()
  render(<SearchBox onSearch={onSearch} />)
  return {
    onSearch,
    user: userEvent.setup(),
    input: screen.getByLabelText('Look up a stock symbol'),
    button: screen.getByRole('button', { name: 'Search' }),
  }
}

describe('SearchBox', () => {
  it('submits the normalized symbol on Enter', async () => {
    const { user, input, onSearch } = setup()

    await user.type(input, '  tsla {Enter}')

    expect(onSearch).toHaveBeenCalledExactlyOnceWith('TSLA')
    expect(input).toHaveValue('TSLA')
  })

  it('submits with the Search button', async () => {
    const { user, input, button, onSearch } = setup()

    await user.type(input, 'brk-b')
    await user.click(button)

    expect(onSearch).toHaveBeenCalledExactlyOnceWith('BRK-B')
  })

  it('shows an inline error and does not search when empty', async () => {
    const { user, button, input, onSearch } = setup()

    await user.click(button)

    expect(screen.getByText('Enter a stock symbol.')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter a stock symbol.')
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('rejects invalid characters without calling the API', async () => {
    const { user, input, onSearch } = setup()

    await user.type(input, 'ts$la{Enter}')

    expect(screen.getByText('Use letters, digits, or . - ^ = only.')).toBeInTheDocument()
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('clears the error as soon as the user edits the input', async () => {
    const { user, input } = setup()

    await user.type(input, '{Enter}')
    await user.type(input, 'A')

    expect(screen.queryByText('Enter a stock symbol.')).not.toBeInTheDocument()
    expect(input).not.toHaveAttribute('aria-invalid')
  })
})
