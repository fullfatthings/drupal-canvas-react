# drupal-canvas-react

Build React components for use in Drupal Canvas.

## Package Exports

| Export | Purpose |
|--------|---------|
| `drupal-canvas-react` | Config utilities, types, CLI |
| `drupal-canvas-react/preview` | Browser-side rendering for Canvas UI preview |
| `drupal-canvas-react/server` | Server-side rendering for Next.js / RSC |

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
      // Set to false to exclude an auto-detected prop
      props?: Record<string, {
        type: 'string' | 'number' | 'boolean' | 'image'
        title: string
        description?: string
        default?: unknown
      } | false>

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

## Excluding Props

Set a prop to `false` to exclude it from the Canvas UI. This is useful when:

- A prop has a sensible default and doesn't need to be configurable
- A prop is derived from another prop via `transformProps`
- A prop isn't useful in the Canvas context (e.g., `className`)

```typescript
defineConfig({
  components: {
    Avatar: {
      path: 'components/Avatar.tsx',
      loader: () => import('./components/Avatar'),
      props: {
        // Exclude these auto-detected props
        size: false,
        alt: false,
        // Use Canvas image picker for imagePath
        imagePath: { type: 'image', title: 'Image' },
      },
      // Extract alt from the image object instead
      transformProps: (props) => ({
        ...props,
        imagePath: props.imagePath?.src,
        alt: props.imagePath?.alt,
      }),
    },
  },
})
```

## Server-Side Rendering (Next.js / RSC)

Use the `drupal-canvas-react/server` export to render Canvas pages in Next.js or any React Server Components environment.

```typescript
import {
  renderCanvasComponents,
  type DrupalCanvasComponent,
} from 'drupal-canvas-react/server'
import canvasConfig from './canvas.config'
```

### Usage

```tsx
// app/[...slug]/page.tsx
import { renderCanvasComponents, type DrupalCanvasComponent } from 'drupal-canvas-react/server'
import config from '@/canvas.config'

interface CanvasPage {
  title: string
  components: DrupalCanvasComponent[]
}

export default async function Page({ params }) {
  // Fetch page data from Drupal JSON:API
  const page: CanvasPage = await fetchCanvasPage(params.slug)

  return (
    <>
      <h1>{page.title}</h1>
      {await renderCanvasComponents(page.components, config)}
    </>
  )
}
```

### How It Works

The `renderCanvasComponents` function:

1. Takes a flat array of `DrupalCanvasComponent` objects from Drupal's JSON:API
2. Builds a tree based on `parent_uuid` relationships
3. Recursively renders components using the loaders from your config
4. Places child components into their designated slots

### Error Handling

By default, if a component fails to render (not found, no valid export, etc.), it is silently skipped. Use `onError` to log errors or render a placeholder:

```tsx
import { renderCanvasComponents, type ComponentErrorHandler } from 'drupal-canvas-react/server'

const handleError: ComponentErrorHandler = (error, component) => {
  console.error(`Failed to render ${component.component_id}:`, error.message)

  // Return a placeholder element
  return (
    <div style={{ padding: '1rem', background: '#fee', border: '1px solid #c00' }}>
      Component error: {error.message}
    </div>
  )

  // Or return null/undefined to skip the component
}

await renderCanvasComponents(page.components, config, { onError: handleError })
```

### Component Data Structure

Drupal Canvas sends components as a flat array:

```typescript
interface DrupalCanvasComponent {
  uuid: string           // Unique identifier
  parent_uuid: string | null  // Parent component (null = root)
  slot: string | null    // Which slot to render in (null = 'children')
  component_id: string   // e.g., 'MyProject.text_block'
  inputs: string         // JSON-encoded props
}
```

The `component_id` is transformed to match your config keys. If you use `idPrefix` in your config, it's automatically stripped:
- `extjs.my_project_text_block` with `idPrefix: 'MyProject'` → `TextBlock`
- `extjs.text_block` without idPrefix → `TextBlock`

### Full Example

```tsx
// canvas.config.ts
import { defineConfig } from 'drupal-canvas-react'

export default defineConfig({
  outDir: '../drupal/web/components',
  idPrefix: 'MyProject',
  components: {
    Container: {
      path: 'components/Container.tsx',
      loader: () => import('./components/Container'),
    },
    TextBlock: {
      path: 'components/TextBlock.tsx',
      loader: () => import('./components/TextBlock'),
    },
    Card: {
      path: 'components/Card.tsx',
      loader: () => import('./components/Card'),
      transformProps: (props) => ({
        ...props,
        image: props.image?.src,
      }),
    },
  },
})

// components/drupal/CanvasPage.tsx
import { renderCanvasComponents, type DrupalCanvasComponent } from 'drupal-canvas-react/server'
import config from '@/canvas.config'

interface CanvasPageProps {
  page: {
    title: string
    components: DrupalCanvasComponent[]
  }
}

export async function CanvasPage({ page }: CanvasPageProps) {
  return (
    <>
      <header>
        <h1>{page.title}</h1>
      </header>
      <main>
        {await renderCanvasComponents(page.components, config)}
      </main>
      <footer>...</footer>
    </>
  )
}
```

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
