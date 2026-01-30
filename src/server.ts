import { createElement, type ReactNode } from 'react'
import type { ComponentMap } from './types.js'

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
 * "Dignity.text_block" → "TextBlock"
 */
function componentIdToKey(componentId: string): string {
  return componentId
    .split('.')[1]
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

/**
 * Render Drupal Canvas components server-side (RSC compatible).
 *
 * Takes a flat array of components from Drupal's JSON:API and renders
 * them as a nested React tree based on parent_uuid relationships.
 *
 * @param canvasComponents - Flat array of components from Drupal Canvas
 * @param componentMap - Component map from canvas.config
 * @returns React nodes for the component tree
 *
 * @example
 * ```tsx
 * import { renderCanvasComponents } from 'drupal-canvas-react/server'
 * import config from './canvas.config.mts'
 *
 * export async function CanvasPage({ page }) {
 *   return (
 *     <>
 *       <h1>{page.title}</h1>
 *       {await renderCanvasComponents(page.components, config.components)}
 *     </>
 *   )
 * }
 * ```
 */
export async function renderCanvasComponents(
  canvasComponents: DrupalCanvasComponent[],
  componentMap: ComponentMap
): Promise<ReactNode> {
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
    const componentKey = componentIdToKey(component.component_id)
    const entry = componentMap[componentKey]

    if (!entry) {
      throw new Error(`Component "${componentKey}" not found in component map`)
    }

    const module = await entry.loader()
    const Component = module.default
    if (!Component) {
      throw new Error(`Component "${componentKey}" has no default export`)
    }

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
  }

  const rootComponents = getChildrenBySlot(null).get('children') || []
  return Promise.all(rootComponents.map((c) => renderComponent(c)))
}
