import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChangeBadge } from '../../src/components/ChangeBadge'

describe('ChangeBadge', () => {
  it.each([
    [0.0523, 'up', '▲', '+5.23%'],
    [-0.0812, 'down', '▼', '-8.12%'],
    [0, 'flat', '■', '0.00%'],
  ])('shows %f as %s with a glyph, not colour alone', (change, direction, glyph, text) => {
    const { container } = render(<ChangeBadge change={change} />)

    const badge = container.querySelector('.change-badge')
    expect(badge).toHaveAttribute('data-direction', direction)
    expect(badge).toHaveTextContent(`${glyph} ${text}`)
    expect(screen.getByText(glyph)).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows a dash when the change is unknown', () => {
    const { container } = render(<ChangeBadge change={null} />)

    expect(container.querySelector('.change-badge')).toHaveTextContent('—')
    expect(container.querySelector('.change-badge')).not.toHaveAttribute('data-direction')
  })
})
