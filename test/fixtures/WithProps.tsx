interface WithPropsProps {
  /** The title text */
  title: string
  /** Number of items to display */
  count?: number
  /** Whether to show a border */
  bordered?: boolean
}

/**
 * A component with various prop types.
 */
export default function WithProps({ title, count = 0, bordered = false }: WithPropsProps) {
  return (
    <div className={bordered ? 'border' : ''}>
      {title}: {count}
    </div>
  )
}
