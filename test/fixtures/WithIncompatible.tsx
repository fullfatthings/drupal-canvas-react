interface MediaAsset {
  url: string
  caption: string
}

interface WithIncompatibleProps {
  /** Simple string prop */
  title: string
  /** Object prop - should be skipped */
  asset: MediaAsset
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
  asset,
  items,
  enabled = false,
}: WithIncompatibleProps) {
  return (
    <div>
      <h1>{title}</h1>
      <figure>
        <a href={asset.url}>{asset.caption}</a>
      </figure>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      {enabled && <span>Enabled</span>}
    </div>
  )
}
