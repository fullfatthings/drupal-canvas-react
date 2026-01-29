import type { ReactNode, ComponentType } from 'react'

/**
 * Metadata for a component that can be rendered in Drupal Canvas.
 */
export interface ComponentMeta {
  /** Display name of the component in the Canvas UI */
  name: string
  /** Description of the component's purpose */
  description: string
}

/**
 * Definition of a slot that accepts HTML content.
 */
export interface SlotDefinition {
  /** Display name of the slot */
  name: string
  /** Description of what content the slot accepts */
  description?: string
}

/**
 * A component module with its default export and optional metadata.
 */
export interface ComponentModule {
  default: ComponentType<any>
  componentMeta?: ComponentMeta
}

/**
 * Entry in the component map that defines how to load a component.
 */
export interface ComponentEntry {
  /** Relative path to the component file from the component map location */
  path: string
  /** Async loader function that returns the component module */
  loader: () => Promise<ComponentModule>
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
}

/**
 * JSON Schema property definition for component props.
 */
export interface PropertySchema {
  type: 'string' | 'number' | 'boolean'
  title: string
  description?: string
  default?: unknown
}

/**
 * Component definition in the component index.
 */
export interface ComponentDefinition {
  id: string
  name: string
  category: string
  description: string
  status: 'stable' | 'beta' | 'deprecated'
  props: {
    type: 'object'
    properties: Record<string, PropertySchema>
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
