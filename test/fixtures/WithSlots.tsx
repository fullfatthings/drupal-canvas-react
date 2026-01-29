import type { ReactNode } from 'react'

interface WithSlotsProps {
  /** Header text */
  header: string
  /** Main content area */
  children: ReactNode
  /** Optional footer content */
  footer?: ReactNode
}

/**
 * A component with props and slot areas.
 */
export default function WithSlots({ header, children, footer }: WithSlotsProps) {
  return (
    <div>
      <h1>{header}</h1>
      <main>{children}</main>
      {footer && <footer>{footer}</footer>}
    </div>
  )
}
