import { ImgHTMLAttributes } from 'react'

/**
 * Stub for next/image that renders a plain img element.
 * Used in standalone builds where Next.js image optimization is not available.
 */
export default function Image(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} />
}
