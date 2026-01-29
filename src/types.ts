import type { ComponentType } from 'react'

/**
 * Definition of a slot that accepts HTML content.
 */
export interface SlotDefinition {
  /** Display title of the slot */
  title: string
  /** Description of what content the slot accepts */
  description?: string
}

/**
 * A component module with default or named exports.
 */
export interface ComponentModule {
  default?: ComponentType<any>
  [key: string]: ComponentType<any> | undefined
}

/**
 * Entry in the component map that defines how to load a component.
 */
export interface ComponentEntry {
  /** Relative path to the component file from the component map location */
  path: string
  /** Async loader function that returns the component module */
  loader: () => Promise<ComponentModule>
  /**
   * Override the component name in the Canvas UI.
   */
  name?: string
  /**
   * Override the component description.
   */
  description?: string
  /**
   * Override the category for this component.
   */
  category?: string
  /**
   * Manual prop definitions. Merged with auto-detected props (manual takes precedence).
   * Use when auto-detection fails or to override detected values.
   */
  props?: Record<string, PropertySchema>
  /**
   * Manual slot definitions. Merged with auto-detected slots (manual takes precedence).
   * Use when auto-detection fails or to override detected values.
   */
  slots?: Record<string, SlotDefinition>
  /**
   * Transform props before passing to the component.
   * Use to adapt Canvas data shapes to component expectations.
   * Must be a self-contained arrow function (no external references).
   *
   * @example
   * ```ts
   * transformProps: (props) => ({
   *   ...props,
   *   imagePath: props.imagePath?.src,
   * })
   * ```
   */
  transformProps?: (props: Record<string, unknown>) => Record<string, unknown>
}

/**
 * Map of component IDs to their entries.
 */
export type ComponentMap = Record<string, ComponentEntry>

/**
 * Configuration for drupal-canvas-react.
 */
export interface CanvasConfig {
  /**
   * Output directory for generated files (relative to config file).
   * @example '../back-end/web/components'
   */
  outDir: string

  /**
   * Component definitions - maps component IDs to their entries.
   * @example
   * ```ts
   * components: {
   *   TextBlock: {
   *     path: 'components/organisms/TextBlock/TextBlock.tsx',
   *     loader: () => import('./components/organisms/TextBlock/TextBlock'),
   *   },
   * }
   * ```
   */
  components: ComponentMap

  /**
   * Default category name for components in the Canvas UI.
   * @default 'Components'
   */
  defaultCategory?: string

  /**
   * Prefix for component IDs in the output.
   * Helps distinguish components from different projects.
   * @example 'MyProject' → component IDs become 'MyProjectHero', 'MyProjectCard'
   */
  idPrefix?: string

  /**
   * Output filename for the bundled JavaScript.
   * @default 'drupal-canvas.js'
   */
  outputFilename?: string

  /**
   * Path to CSS input file for Tailwind processing.
   * If provided, CSS will be built to outDir/standalone.css.
   * @example './components/standalone.css'
   */
  cssInput?: string

  /**
   * Path to tsconfig.json for component compilation.
   * @example './components/tsconfig.json'
   */
  tsconfig?: string

  /**
   * Custom stub mappings for module aliasing.
   * Keys are module names, values are paths to stub files.
   * @example { 'next/image': './my-stubs/image.tsx' }
   */
  stubs?: Record<string, string>

  /**
   * Whether to minify the output bundle.
   * Set to false for easier debugging.
   * @default true
   */
  minify?: boolean

  /**
   * Additional esbuild plugins for the bundle.
   * @example
   * ```ts
   * import svgr from 'esbuild-plugin-svgr'
   * esbuildPlugins: [svgr()]
   * ```
   */
  esbuildPlugins?: import('esbuild').Plugin[]
}

/**
 * JSON Schema property definition for component props (input config).
 * Use 'image' type for Canvas image picker fields.
 */
export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'image'
  title: string
  description?: string
  default?: unknown
  /** Allowed values for enum/union string types */
  enum?: string[]
}

/**
 * JSON Schema property definition as output to component-index.json.
 */
export interface OutputPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object'
  title: string
  description?: string
  default?: unknown
  enum?: string[]
  $ref?: string
}

/**
 * Component definition in the component index.
 */
export interface ComponentDefinition {
  id: string
  name: string
  category: string
  description: string
  status: 'experimental' | 'stable' | 'deprecated' | 'obsolete'
  props: {
    type: 'object'
    properties: Record<string, OutputPropertySchema>
  }
  slots?: Record<string, SlotDefinition>
}

/**
 * The component index output format.
 */
export interface ComponentIndex {
  version: string
  components: ComponentDefinition[]
}

/**
 * Render function type for the standalone bundle.
 */
export type RenderFunction = (
  container: HTMLElement,
  componentName: string,
  props: Record<string, unknown>,
  slots: Record<string, string>
) => Promise<HTMLElement>
