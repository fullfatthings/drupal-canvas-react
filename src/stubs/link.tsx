import { AnchorHTMLAttributes, ReactNode } from 'react'

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children?: ReactNode
}

/**
 * Stub for next/link that renders a plain anchor element.
 * Used in standalone builds where Next.js routing is not available.
 */
export default function Link({ children, ...props }: LinkProps) {
  return <a {...props}>{children}</a>
}
