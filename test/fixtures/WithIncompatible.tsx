interface ImageType {
  src: string
  alt: string
}

interface WithIncompatibleProps {
  /** Simple string prop */
  title: string
  /** Object prop - should be skipped */
  image: ImageType
  /** Array prop - should be skipped */
  items: string[]
  /** Another compatible prop */
  enabled?: boolean
}

/**
 * Component with some incompatible prop types.
 */
export default function WithIncompatible({
  title,
  image,
  items,
  enabled = false,
}: WithIncompatibleProps) {
  return (
    <div>
      <h1>{title}</h1>
      <img src={image.src} alt={image.alt} />
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      {enabled && <span>Enabled</span>}
    </div>
  )
}
