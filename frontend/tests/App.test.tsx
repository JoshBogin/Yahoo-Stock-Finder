import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { HttpResponse, http } from 'msw/http'
import { describe, expect, it } from 'vitest'
import App from '../src/App'
import { renderWithClient } from './support/render'
import { sampleSummary, server } from './support/server'

describe('App', () => {
  it('searches for a symbol, shows its detail and records it in the URL', async () => {
    const requested: string[] = []
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', ({ params }) => {
        requested.push(String(params.symbol))
        return HttpResponse.json(sampleSummary())
      }),
    )
    const user = userEvent.setup()
    renderWithClient(<App />)

    await user.type(screen.getByLabelText('Look up a stock symbol'), 'nflx{Enter}')

    expect(await screen.findByRole('heading', { name: 'NFLX', level: 2 })).toBeInTheDocument()
    expect(window.location.search).toBe('?symbol=NFLX')
    expect(requested).toContain('NFLX')
  })

  it('opens the detail for a valid ?symbol= on load', async () => {
    window.history.replaceState(null, '', '/?symbol=msft')
    renderWithClient(<App />)

    expect(await screen.findByRole('heading', { name: 'MSFT', level: 2 })).toBeInTheDocument()
  })

  it('ignores an invalid ?symbol= instead of calling the API with it', async () => {
    window.history.replaceState(null, '', '/?symbol=bad$symbol')
    renderWithClient(<App />)

    await screen.findAllByRole('button', { name: /view details/ })
    expect(screen.queryByRole('button', { name: /Close .* details/ })).not.toBeInTheDocument()
  })

  it('closes the detail and clears the URL', async () => {
    window.history.replaceState(null, '', '/?symbol=TSLA')
    const user = userEvent.setup()
    renderWithClient(<App />)

    await user.click(await screen.findByRole('button', { name: 'Close TSLA details' }))

    expect(screen.queryByRole('heading', { name: 'TSLA', level: 2 })).not.toBeInTheDocument()
    expect(window.location.search).toBe('')
  })

  it('opens a popular stock’s detail from its card', async () => {
    const user = userEvent.setup()
    renderWithClient(<App />)

    await user.click(await screen.findByRole('button', { name: 'AAPL, view details' }))

    expect(await screen.findByRole('heading', { name: 'AAPL', level: 2 })).toBeInTheDocument()
    expect(window.location.search).toBe('?symbol=AAPL')
  })

  it('follows browser back and forward between symbols', async () => {
    const user = userEvent.setup()
    renderWithClient(<App />)
    const search = screen.getByLabelText('Look up a stock symbol')

    await user.type(search, 'aapl{Enter}')
    await screen.findByRole('heading', { name: 'AAPL', level: 2 })
    await user.clear(search)
    await user.type(search, 'msft{Enter}')
    await screen.findByRole('heading', { name: 'MSFT', level: 2 })

    await act(async () => {
      window.history.back()
      await new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }))
    })
    expect(await screen.findByRole('heading', { name: 'AAPL', level: 2 })).toBeInTheDocument()

    await act(async () => {
      window.history.forward()
      await new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }))
    })
    expect(await screen.findByRole('heading', { name: 'MSFT', level: 2 })).toBeInTheDocument()
  })
})
