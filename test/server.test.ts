import { describe, it, expect } from 'vitest'
import React, { isValidElement, type ReactNode } from 'react'
import { renderCanvasComponents, type DrupalCanvasComponent } from '../src/server.js'
import type { ComponentMap } from '../src/types.js'

// Simple test component
function TestComponent({ title, count }: { title: string; count?: number }) {
  return React.createElement(
    'div',
    { 'data-testid': 'test-component' },
    React.createElement('h1', null, title),
    count !== undefined && React.createElement('span', null, `Count: ${count}`)
  )
}

// Component with slots (children)
function SlotComponent({
  heading,
  children,
}: {
  heading: string
  children?: ReactNode
}) {
  return React.createElement(
    'article',
    { 'data-testid': 'slot-component' },
    React.createElement('h2', null, heading),
    React.createElement('div', { 'data-testid': 'slot-content' }, children)
  )
}

// Component with multiple slots
function MultiSlotComponent({
  title,
  header,
  footer,
}: {
  title: string
  header?: ReactNode
  footer?: ReactNode
}) {
  return React.createElement(
    'section',
    null,
    React.createElement('div', { 'data-testid': 'header-slot' }, header),
    React.createElement('h1', null, title),
    React.createElement('div', { 'data-testid': 'footer-slot' }, footer)
  )
}

function createComponent(
  id: string,
  componentId: string,
  inputs: Record<string, unknown>,
  parentUuid: string | null = null,
  slot: string | null = null
): DrupalCanvasComponent {
  return {
    uuid: id,
    parent_uuid: parentUuid,
    slot,
    component_id: componentId,
    inputs: JSON.stringify(inputs),
  }
}

describe('renderCanvasComponents', () => {
  it('renders a single root component', async () => {
    const components: ComponentMap = {
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
    }

    const canvasComponents: DrupalCanvasComponent[] = [
      createComponent('1', 'Project.test', { title: 'Hello World', count: 42 }),
    ]

    const result = await renderCanvasComponents(canvasComponents, components)

    expect(Array.isArray(result)).toBe(true)
    expect((result as ReactNode[]).length).toBe(1)
    const element = (result as ReactNode[])[0]
    expect(isValidElement(element)).toBe(true)
    expect((element as React.ReactElement).props.title).toBe('Hello World')
    expect((element as React.ReactElement).props.count).toBe(42)
  })

  it('renders multiple root components', async () => {
    const components: ComponentMap = {
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
    }

    const canvasComponents: DrupalCanvasComponent[] = [
      createComponent('1', 'Project.test', { title: 'First' }),
      createComponent('2', 'Project.test', { title: 'Second' }),
      createComponent('3', 'Project.test', { title: 'Third' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, components)

    expect(Array.isArray(result)).toBe(true)
    expect((result as ReactNode[]).length).toBe(3)
  })

  it('renders nested components in slots', async () => {
    const components: ComponentMap = {
      Slot: {
        path: 'slot.tsx',
        loader: () => Promise.resolve({ default: SlotComponent }),
      },
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
    }

    const canvasComponents: DrupalCanvasComponent[] = [
      createComponent('parent', 'Project.slot', { heading: 'Parent' }),
      createComponent('child', 'Project.test', { title: 'Child' }, 'parent', 'children'),
    ]

    const result = await renderCanvasComponents(canvasComponents, components)

    expect((result as ReactNode[]).length).toBe(1)
    const parent = (result as ReactNode[])[0] as React.ReactElement
    expect(parent.props.heading).toBe('Parent')
    expect(Array.isArray(parent.props.children)).toBe(true)
    expect(parent.props.children.length).toBe(1)
  })

  it('renders components in named slots', async () => {
    const components: ComponentMap = {
      MultiSlot: {
        path: 'multi.tsx',
        loader: () => Promise.resolve({ default: MultiSlotComponent }),
      },
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
    }

    const canvasComponents: DrupalCanvasComponent[] = [
      createComponent('parent', 'Project.multi_slot', { title: 'Main' }),
      createComponent('header-child', 'Project.test', { title: 'Header Content' }, 'parent', 'header'),
      createComponent('footer-child', 'Project.test', { title: 'Footer Content' }, 'parent', 'footer'),
    ]

    const result = await renderCanvasComponents(canvasComponents, components)

    const parent = (result as ReactNode[])[0] as React.ReactElement
    expect(parent.props.title).toBe('Main')
    expect(Array.isArray(parent.props.header)).toBe(true)
    expect(Array.isArray(parent.props.footer)).toBe(true)
  })

  it('transforms component_id to component key (snake_case to PascalCase)', async () => {
    const components: ComponentMap = {
      TextBlock: {
        path: 'text-block.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
      CardGrid: {
        path: 'card-grid.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
    }

    const canvasComponents: DrupalCanvasComponent[] = [
      createComponent('1', 'Project.text_block', { title: 'Text' }),
      createComponent('2', 'Project.card_grid', { title: 'Grid' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, components)

    expect((result as ReactNode[]).length).toBe(2)
  })

  it('throws when component not found', async () => {
    const components: ComponentMap = {
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
    }

    const canvasComponents: DrupalCanvasComponent[] = [
      createComponent('1', 'Project.nonexistent', { title: 'Test' }),
    ]

    await expect(renderCanvasComponents(canvasComponents, components)).rejects.toThrow(
      'Component "Nonexistent" not found in component map'
    )
  })

  it('throws when component has no default export', async () => {
    const components: ComponentMap = {
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ named: TestComponent } as any),
      },
    }

    const canvasComponents: DrupalCanvasComponent[] = [
      createComponent('1', 'Project.test', { title: 'Test' }),
    ]

    await expect(renderCanvasComponents(canvasComponents, components)).rejects.toThrow(
      'Component "Test" has no default export'
    )
  })

  it('applies transformProps before rendering', async () => {
    const components: ComponentMap = {
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
        transformProps: (props) => ({
          title: (props.image as { src: string })?.src || 'no image',
          count: 99,
        }),
      },
    }

    const canvasComponents: DrupalCanvasComponent[] = [
      createComponent('1', 'Project.test', {
        image: { src: 'https://example.com/photo.jpg' },
      }),
    ]

    const result = await renderCanvasComponents(canvasComponents, components)

    const element = (result as ReactNode[])[0] as React.ReactElement
    expect(element.props.title).toBe('https://example.com/photo.jpg')
    expect(element.props.count).toBe(99)
  })

  it('returns empty array for empty input', async () => {
    const components: ComponentMap = {}
    const canvasComponents: DrupalCanvasComponent[] = []

    const result = await renderCanvasComponents(canvasComponents, components)

    expect(Array.isArray(result)).toBe(true)
    expect((result as ReactNode[]).length).toBe(0)
  })

  it('sets key prop on rendered elements', async () => {
    const components: ComponentMap = {
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
    }

    const canvasComponents: DrupalCanvasComponent[] = [
      createComponent('uuid-123', 'Project.test', { title: 'Test' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, components)

    const element = (result as ReactNode[])[0] as React.ReactElement
    expect(element.key).toBe('uuid-123')
  })
})
