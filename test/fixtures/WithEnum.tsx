interface WithEnumProps {
  /** T-shirt size selection */
  size: 'S' | 'M' | 'L' | 'XL'
  /** Color theme */
  theme?: 'light' | 'dark'
  /** Regular string prop (not an enum) */
  label: string
}

/**
 * A component with enum/union string props.
 */
export default function WithEnum({ size, theme = 'light', label }: WithEnumProps) {
  return (
    <div className={`size-${size} theme-${theme}`}>
      {label}
    </div>
  )
}
