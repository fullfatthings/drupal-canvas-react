import type { ComponentType } from 'react'
import type { ComponentEntry } from './types.js'

/**
 * Check if a value is a valid React component.
 * Handles regular functions, forwardRef, and memo components.
 */
export function isValidComponent(value: unknown): value is ComponentType<any> {
  if (typeof value === 'function') return true
  // forwardRef and memo components are objects with $$typeof
  if (value && typeof value === 'object' && '$$typeof' in value) return true
  return false
}

/**
 * Resolve a component from a module, supporting default and named exports.
 * Priority: default export > named export matching componentKey > first valid export
 */
export async function resolveComponent(
  entry: ComponentEntry,
  componentKey: string
): Promise<ComponentType<any>> {
  const module = await entry.loader()
  const moduleRecord = module as unknown as Record<string, unknown>

  const Component =
    module.default ||
    moduleRecord[componentKey] ||
    Object.values(moduleRecord).find((exp) => isValidComponent(exp))

  if (!Component || !isValidComponent(Component)) {
    throw new Error(`Component "${componentKey}" has no valid export`)
  }

  return Component
}
