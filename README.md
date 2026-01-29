# drupal-canvas-react

Build React components for use in Drupal Canvas.

## Installation

```bash
npm install drupal-canvas-react
```

## Quick Start

### 1. Create your components

```tsx
// components/Hero.tsx
interface HeroProps {
  /** Main heading text */
  title: string
  /** Optional subtitle */
  subtitle?: string
}

export default function Hero({ title, subtitle }: HeroProps) {
  return (
    <section className="hero">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </section>
  )
}
```

```tsx
// components/TextBlock.tsx
import type { ReactNode } from 'react'

interface TextBlockProps {
  /** Block heading */
  heading?: string
  /** Rich text content */
  children: ReactNode
}

export default function TextBlock({ heading, children }: TextBlockProps) {
  return (
    <div className="text-block">
      {heading && <h2>{heading}</h2>}
      <div>{children}</div>
    </div>
  )
}
```

### 2. Create config file

Create `canvas.config.mts` in your project root:

```typescript
import { defineConfig } from 'drupal-canvas-react'

export default defineConfig({
  // Where to output the built files
  outDir: '../drupal/web/components',

  // Category shown in Canvas UI
  defaultCategory: 'My Components',

  // Path to tsconfig (optional)
  tsconfig: './tsconfig.json',

  // Component definitions
  components: {
    Hero: {
      path: 'components/Hero.tsx',
      loader: () => import('./components/Hero'),
      name: 'Hero Banner',
      description: 'A hero section with title and subtitle',
    },
    TextBlock: {
      path: 'components/TextBlock.tsx',
      loader: () => import('./components/TextBlock'),
      name: 'Text Block',
      description: 'Rich text content block',
      category: 'Content', // Override default category
    },
  },
})
```

### 3. Build

```bash
npx drupal-canvas-react build
```

This generates:
- `component-index.json` - Component metadata for Canvas
- `drupal-canvas.js` - Bundled runtime with all components

### 4. Register with Drupal

Requires the [Drupal Canvas](https://www.drupal.org/project/canvas) and [Canvas External JS](https://www.drupal.org/project/canvas_extjs) modules:

```bash
composer require drupal/canvas drupal/canvas_extjs
drush en canvas canvas_extjs
```

Then register your components:

```bash
drush canvas:extjs-register relative/path/to/component-index.json --javascript=https://your.domain/path/to/drupal-canvas.js
```

For example:

```bash
drush canvas:extjs-register \
  web/components/component-index.json \
  --javascript=https://www.example.com/components/drupal-canvas.js
```

Your components are now available in Canvas!

## Config Reference

```typescript
defineConfig({
  // Required: Output directory for generated files
  outDir: string

  // Required: Component definitions
  components: {
    [id: string]: {
      // Required: Path to component file (for prop extraction)
      path: string

      // Required: Dynamic import for bundling
      loader: () => Promise<{ default: ComponentType }>

      // Optional: Display name in Canvas UI
      name?: string

      // Optional: Component description
      description?: string

      // Optional: Override default category
      category?: string

      // Optional: Manual prop definitions (merged with auto-detected)
      props?: Record<string, {
        type: 'string' | 'number' | 'boolean' | 'image'
        title: string
        description?: string
        default?: unknown
      }>

      // Optional: Manual slot definitions (merged with auto-detected)
      slots?: Record<string, {
        title: string
        description?: string
      }>

      // Optional: Transform props before passing to component
      transformProps?: (props: Record<string, unknown>) => Record<string, unknown>
    }
  }

  // Optional: Default category for components
  defaultCategory?: string  // Default: 'Components'

  // Optional: Prefix for component IDs (useful for multi-project setups)
  idPrefix?: string  // e.g., 'MyProject' → IDs become 'MyProjectHero'

  // Optional: Output filename
  outputFilename?: string  // Default: 'drupal-canvas.js'

  // Optional: Path to tsconfig.json
  tsconfig?: string

  // Optional: Module stub overrides
  stubs?: Record<string, string>

  // Optional: Minify the output bundle
  minify?: boolean  // Default: true
})
```

## Auto-Detection

The package automatically extracts from your TypeScript components:

- **Props**: Types, titles (from JSDoc or prop name), descriptions, defaults
- **Slots**: Props typed as `ReactNode` become slots

```tsx
interface MyComponentProps {
  /** Page title */           // → description
  title: string               // → type: 'string', title: 'Title'

  /** Item count */
  count?: number              // → type: 'number', title: 'Count'

  /** Show border */
  bordered?: boolean          // → type: 'boolean', title: 'Bordered'

  /** Main content */
  children: ReactNode         // → slot: { title: 'Children', ... }
}
```

## Prop Transforms

Use `transformProps` to adapt Canvas data to your component's expected format. This is useful when:

- Canvas sends objects (like images) but your component expects a string
- You need to rename props
- You need to provide defaults or coerce types

```typescript
defineConfig({
  components: {
    Avatar: {
      path: 'components/Avatar.tsx',
      loader: () => import('./components/Avatar'),
      props: {
        // Tell Canvas to use its image picker
        imagePath: { type: 'image', title: 'Image' },
      },
      // Canvas sends { src, alt, width, height } but component expects a string
      transformProps: (props) => ({
        ...props,
        imagePath: props.imagePath?.src,
      }),
    },

    Card: {
      path: 'components/Card.tsx',
      loader: () => import('./components/Card'),
      // Rename props, set defaults, coerce types
      transformProps: (props) => ({
        title: props.headline,              // rename
        count: Number(props.count) || 0,    // coerce + default
        featured: Boolean(props.featured),  // coerce
      }),
    },
  },
})
```

**Note:** Transform functions must be self-contained arrow functions with no external references (they are stringified into the bundle).

## Next.js Components

For Next.js components using `next/image` or `next/link`, the package provides built-in stubs that render standard HTML elements:

- `next/image` → `<img>`
- `next/link` → `<a>`

To use custom stubs:

```typescript
defineConfig({
  stubs: {
    'next/image': './my-stubs/image.tsx',
    'next/link': './my-stubs/link.tsx',
  },
  // ...
})
```

## CLI Commands

```bash
# Full build (index + bundle)
npx drupal-canvas-react build

# Generate only component-index.json
npx drupal-canvas-react generate-index

# Build only the JS bundle
npx drupal-canvas-react bundle

# Create config template
npx drupal-canvas-react init
```

## Example Project Structure

```
my-project/
├── components/
│   ├── Hero.tsx
│   ├── TextBlock.tsx
│   └── Card.tsx
├── canvas.config.mts
├── package.json
└── tsconfig.json

drupal/
└── web/
    └── components/
        ├── component-index.json  ← generated
        └── drupal-canvas.js      ← generated
```

## CSS / Tailwind

The package only builds JavaScript. For CSS, run your own build process:

```json
{
  "scripts": {
    "build:components": "drupal-canvas-react build && tailwindcss -i src/styles.css -o ../drupal/web/components/styles.css"
  }
}
```

## License

MIT
