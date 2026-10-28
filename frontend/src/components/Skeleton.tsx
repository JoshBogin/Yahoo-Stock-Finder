interface SkeletonProps {
  className?: string
}

/** Decorative loading placeholder; pair it with a visually hidden status message. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden="true" />
}
