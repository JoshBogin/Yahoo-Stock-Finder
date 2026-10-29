import { fireEvent } from '@testing-library/react'
import { cloneElement, useEffect, type ReactElement } from 'react'

export const CHART_WIDTH = 400
export const CHART_HEIGHT = 120

interface FixedSizeContainerProps {
  children: ReactElement
  onResize?: (width: number, height: number) => void
}

/** Draws its chart at CHART_WIDTH × CHART_HEIGHT and reports that size once, like a measured container. */
function FixedSizeContainer({ children, onResize }: FixedSizeContainerProps) {
  useEffect(() => onResize?.(CHART_WIDTH, CHART_HEIGHT), [onResize])
  return (
    <div style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
      {cloneElement(children as ReactElement<{ width?: number; height?: number }>, {
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
      })}
    </div>
  )
}

/**
 * jsdom has no layout, so Recharts' ResponsiveContainer measures 0×0 and draws nothing. Tests that need
 * the SVG mock it with this: `vi.mock('recharts', async (load) => withFixedSizeCharts(await load()))`.
 */
export function withFixedSizeCharts<T extends object>(recharts: T): T {
  return { ...recharts, ResponsiveContainer: FixedSizeContainer }
}

/** Gives an element a layout box, which Recharts reads to turn pointer coordinates into chart positions. */
export function stubBox(element: Element, width = CHART_WIDTH, height = CHART_HEIGHT) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      x: 0,
      y: 0,
      width,
      height,
      right: width,
      bottom: height,
      toJSON: () => ({}),
    }),
  })
}

/** Moves the pointer over a chart at `x` px from its left edge. */
export function hoverChart(wrapper: Element, x: number) {
  stubBox(wrapper)
  fireEvent.mouseMove(wrapper, { clientX: x, clientY: CHART_HEIGHT / 2 })
}
