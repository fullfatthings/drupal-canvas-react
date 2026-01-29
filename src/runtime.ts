import parse from 'html-react-parser'
import React from 'react'
import { createRoot } from 'react-dom/client'
import type { ComponentMap, RenderFunction } from './types.js'

// Expose React globally for components using classic JSX transform
if (typeof window !== 'undefined') {
  ;(window as any).React = React
}

/**
 * Check if a value is a valid React component.
 * Handles regular functions, forwardRef, and memo components.
 */
function isValidComponent(value: unknown): boolean {
  if (typeof value === 'function') return true
  // forwardRef and memo components are objects with $$typeof
  if (value && typeof value === 'object' && '$$typeof' in value) return true
  return false
}

/**
 * Create a render function for standalone component rendering in the browser.
 *
 * @param components - The component map to use for rendering.
 * @returns A render function that can be called from the browser.
 *
 * @example
 * ```ts
 * import { createRenderFunction } from 'drupal-canvas-react/runtime'
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

    const module = await entry.loader()
    const moduleRecord = module as unknown as Record<string, unknown>

    // Support both default and named exports
    // Priority: default export > named export matching component name > first named export
    const Component =
      module.default ||
      moduleRecord[componentName] ||
      Object.values(moduleRecord).find((exp) => isValidComponent(exp))

    if (!Component || !isValidComponent(Component)) {
      throw new Error(`Component ${componentName} has no valid export`)
    }

    // Convert HTML strings in slots to React elements
    const parsedSlots: Record<string, React.ReactNode> = {}
    for (const [slotName, html] of Object.entries(slots)) {
      parsedSlots[slotName] = parse(html)
    }

    const el = React.createElement(
      Component as React.ComponentType<Record<string, unknown>>,
      { ...props, ...parsedSlots }
    )
    createRoot(container).render(el)

    return container
  }
}
