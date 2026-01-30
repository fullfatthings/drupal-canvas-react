import parse from 'html-react-parser'
import React from 'react'
import { createRoot } from 'react-dom/client'
import type { ComponentMap, RenderFunction } from './types.js'
import { resolveComponent } from './utils.js'

// Expose React globally for components using classic JSX transform
if (typeof window !== 'undefined') {
  ;(window as any).React = React
}

/**
 * Create a render function for standalone component rendering in the browser.
 *
 * @param components - The component map to use for rendering.
 * @returns A render function that can be called from the browser.
 *
 * @example
 * ```ts
 * import { createRenderFunction } from 'drupal-canvas-react/preview'
 * import { components } from './component-map'
 *
 * export const render = createRenderFunction(components)
 *
 * if (typeof window !== 'undefined') {
 *   ;(window as any).render = render
 * }
 * ```
 */
export function createRenderFunction(components: ComponentMap): RenderFunction {
  return async function render(
    container: HTMLElement,
    componentName: string,
    props: Record<string, unknown>,
    slots: Record<string, string>
  ): Promise<HTMLElement> {
    const entry = components[componentName]
    if (!entry) {
      throw new Error(`Component ${componentName} not found`)
    }

    const Component = await resolveComponent(entry, componentName)

    // Convert HTML strings in slots to React elements
    const parsedSlots: Record<string, React.ReactNode> = {}
    for (const [slotName, html] of Object.entries(slots)) {
      parsedSlots[slotName] = parse(html)
    }

    // Apply transformProps if defined
    const finalProps = entry.transformProps ? entry.transformProps(props) : props

    const el = React.createElement(
      Component as React.ComponentType<Record<string, unknown>>,
      { ...finalProps, ...parsedSlots }
    )
    createRoot(container).render(el)

    return container
  }
}
