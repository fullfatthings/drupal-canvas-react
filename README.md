# drupal-canvas-react

Use Drupal Canvas to build pages from React components, then render them anywhere.

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

### 2. Create config file

Create `canvas.config.ts` in your project root:

```typescript
import { defineConfig } from 'drupal-canvas-react'

export default defineConfig({
  outDir: '../drupal/web/components',
  components: {
    Hero: {
      path: 'components/Hero.tsx',
      loader: () => import('./components/Hero'),
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

Requires [Drupal Canvas](https://www.drupal.org/project/canvas) and [Canvas External JS](https://www.drupal.org/project/canvas_extjs):

```bash
composer require drupal/canvas drupal/canvas_extjs
drush en canvas canvas_extjs
drush canvas:extjs-register web/components/component-index.json \
  --javascript=https://example.com/components/drupal-canvas.js
```

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

Use `transformProps` to adapt Canvas data to your component's expected format, and set props to `false` to exclude them from the Canvas UI:

```typescript
defineConfig({
  components: {
    Avatar: {
      path: 'components/Avatar.tsx',
      loader: () => import('./components/Avatar'),
      props: {
        size: false,  // Exclude from Canvas UI
        alt: false,   // Derived from image below
        imagePath: { type: 'image', title: 'Image' },
      },
      // Canvas sends { src, alt, width, height }, component expects strings
      transformProps: (props) => ({
        ...props,
        imagePath: props.imagePath?.src,
        alt: props.imagePath?.alt,
      }),
    },
  },
})
```

**Note:** Transform functions must be self-contained arrow functions (they are stringified into the bundle).

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

### Error Handling

By default, missing or broken components are silently skipped. Use `onError` to render a placeholder:

```tsx
await renderCanvasComponents(page.components, config, {
  onError: (error, component) => <div>Error: {error.message}</div>,
})
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
│   └── Hero.tsx
├── canvas.config.ts
├── package.json
└── tsconfig.json

drupal/web/components/
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

## Maintainer

[![Full Fat Things](assets/fullfatthings-logo.svg)](https://www.fullfatthings.com)

Get in touch for commercial support.

## License

MIT
