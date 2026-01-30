/**
 * Shared test components and utilities for preview and server render tests.
 */
import React, { type ReactNode } from 'react'
import type { ComponentMap } from '../../src/types.js'
import type { DrupalCanvasComponent } from '../../src/server.js'

// =============================================================================
// Test Components
// =============================================================================

export interface TestComponentProps {
  title: string
  count?: number
}

/**
 * Simple component with basic props.
 */
export function TestComponent({ title, count }: TestComponentProps) {
  return React.createElement(
    'div',
    { 'data-testid': 'test-component' },
    React.createElement('h1', null, title),
    count !== undefined && React.createElement('span', null, `Count: ${count}`)
  )
}

export interface SlotComponentProps {
  heading: string
  children?: ReactNode
}

/**
 * Component with a single children slot.
 */
export function SlotComponent({ heading, children }: SlotComponentProps) {
  return React.createElement(
    'article',
    { 'data-testid': 'slot-component' },
    React.createElement('h2', null, heading),
    React.createElement('div', { 'data-testid': 'slot-content' }, children)
  )
}

export interface MultiSlotComponentProps {
  title: string
  header?: ReactNode
  footer?: ReactNode
}

/**
 * Component with multiple named slots.
 */
export function MultiSlotComponent({ title, header, footer }: MultiSlotComponentProps) {
  return React.createElement(
    'section',
    null,
    React.createElement('div', { 'data-testid': 'header-slot' }, header),
    React.createElement('h1', null, title),
    React.createElement('div', { 'data-testid': 'footer-slot' }, footer)
  )
}

// =============================================================================
// Component Map Helpers
// =============================================================================

/**
 * Create a component map entry with a loader.
 */
export function componentEntry<T>(component: React.ComponentType<T>, path = 'test.tsx') {
  return {
    path,
    loader: () => Promise.resolve({ default: component }),
  }
}


// =============================================================================
// Canvas Component Helpers (for server tests)
// =============================================================================

/**
 * Create a DrupalCanvasComponent for testing.
 */
export function createCanvasComponent(
  uuid: string,
  componentId: string,
  inputs: Record<string, unknown>,
  parentUuid: string | null = null,
  slot: string | null = null
): DrupalCanvasComponent {
  return {
    uuid,
    parent_uuid: parentUuid,
    slot,
    component_id: componentId,
    inputs: JSON.stringify(inputs),
  }
}
