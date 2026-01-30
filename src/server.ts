import { createElement, type ReactNode } from 'react'
import type { CanvasConfig } from './types.js'
import { resolveComponent } from './utils.js'

/**
 * A component from Drupal Canvas JSON:API response.
 */
export interface DrupalCanvasComponent {
  uuid: string
  parent_uuid: string | null
  slot: string | null
  component_id: string
  inputs: string
}

/**
 * Transform Drupal Canvas component ID to config key.
 * "extjs.acme_text_block" with idPrefix "Acme" → "TextBlock"
 * "extjs.text_block" without idPrefix → "TextBlock"
 */
function componentIdToKey(componentId: string, idPrefix?: string): string {
  const pascalCase = componentId
    .split('.')[1]
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

  // Strip idPrefix if present
  if (idPrefix && pascalCase.startsWith(idPrefix)) {
    return pascalCase.slice(idPrefix.length)
  }
  return pascalCase
}

/**
 * Error handler for component rendering failures.
 * Return a ReactNode to render in place of the failed component, or null/undefined to skip.
 */
export type ComponentErrorHandler = (
  error: Error,
  component: DrupalCanvasComponent
) => ReactNode | void

export interface RenderOptions {
  /** Handler for component rendering errors. If not provided, errors are logged and component is skipped. */
  onError?: ComponentErrorHandler
}

/**
 * Render Drupal Canvas components server-side (RSC compatible).
 *
 * Takes a flat array of components from Drupal's JSON:API and renders
 * them as a nested React tree based on parent_uuid relationships.
 *
 * @param canvasComponents - Flat array of components from Drupal Canvas
 * @param config - Canvas config (or just { components, idPrefix })
 * @param options - Render options including error handler
 * @returns React nodes for the component tree
 *
 * @example
 * ```tsx
 * import { renderCanvasComponents } from 'drupal-canvas-react/server'
 * import config from './canvas.config'
 *
 * export async function CanvasPage({ page }) {
 *   return (
 *     <>
 *       <h1>{page.title}</h1>
 *       {await renderCanvasComponents(page.components, config)}
 *     </>
 *   )
 * }
 * ```
 */
export async function renderCanvasComponents(
  canvasComponents: DrupalCanvasComponent[],
  config: Pick<CanvasConfig, 'components' | 'idPrefix'>,
  options: RenderOptions = {}
): Promise<ReactNode> {
  const { components: componentMap, idPrefix } = config
  const { onError } = options
  function getChildrenBySlot(
    parentUuid: string | null
  ): Map<string, DrupalCanvasComponent[]> {
    const children = canvasComponents.filter((c) => c.parent_uuid === parentUuid)
    const bySlot = new Map<string, DrupalCanvasComponent[]>()
    for (const child of children) {
      const slot = child.slot || 'children'
      if (!bySlot.has(slot)) {
        bySlot.set(slot, [])
      }
      bySlot.get(slot)!.push(child)
    }
    return bySlot
  }

  async function renderComponent(
    component: DrupalCanvasComponent
  ): Promise<ReactNode> {
    try {
      const componentKey = componentIdToKey(component.component_id, idPrefix)
      const entry = componentMap[componentKey]

      if (!entry) {
        throw new Error(`Component "${componentKey}" not found in component map`)
      }

      const Component = await resolveComponent(entry, componentKey)

      const inputs = JSON.parse(component.inputs)
      const props = entry.transformProps ? entry.transformProps(inputs) : inputs

      // Render children for each slot
      const slots: Record<string, ReactNode> = {}
      const childrenBySlot = getChildrenBySlot(component.uuid)
      for (const [slotName, slotChildren] of childrenBySlot) {
        slots[slotName] = await Promise.all(
          slotChildren.map((child) => renderComponent(child))
        )
      }

      return createElement(Component, { key: component.uuid, ...props, ...slots })
    } catch (err) {
      if (onError) {
        const error = err instanceof Error ? err : new Error(String(err))
        return onError(error, component) ?? null
      }
      return null
    }
  }

  const rootComponents = getChildrenBySlot(null).get('children') || []
  return Promise.all(rootComponents.map((c) => renderComponent(c)))
}
