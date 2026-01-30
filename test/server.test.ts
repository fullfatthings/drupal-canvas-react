import { describe, it, expect } from 'vitest'
import { isValidElement, type ReactNode } from 'react'
import { renderCanvasComponents } from '../src/server.js'
import type { ComponentMap } from '../src/types.js'
import {
  TestComponent,
  SlotComponent,
  MultiSlotComponent,
  componentEntry,
  testComponentMap,
  createCanvasComponent,
} from './fixtures/render-components.js'

describe('renderCanvasComponents', () => {
  it('renders a single root component', async () => {
    const components: ComponentMap = {
      Test: componentEntry(TestComponent),
    }

    const canvasComponents = [
      createCanvasComponent('1', 'Project.test', { title: 'Hello World', count: 42 }),
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
    const canvasComponents = [
      createCanvasComponent('1', 'Project.test', { title: 'First' }),
      createCanvasComponent('2', 'Project.test', { title: 'Second' }),
      createCanvasComponent('3', 'Project.test', { title: 'Third' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, testComponentMap)

    expect(Array.isArray(result)).toBe(true)
    expect((result as ReactNode[]).length).toBe(3)
  })

  it('renders nested components in slots', async () => {
    const canvasComponents = [
      createCanvasComponent('parent', 'Project.slot', { heading: 'Parent' }),
      createCanvasComponent('child', 'Project.test', { title: 'Child' }, 'parent', 'children'),
    ]

    const result = await renderCanvasComponents(canvasComponents, testComponentMap)

    expect((result as ReactNode[]).length).toBe(1)
    const parent = (result as ReactNode[])[0] as React.ReactElement
    expect(parent.props.heading).toBe('Parent')
    expect(Array.isArray(parent.props.children)).toBe(true)
    expect(parent.props.children.length).toBe(1)
  })

  it('renders components in named slots', async () => {
    const canvasComponents = [
      createCanvasComponent('parent', 'Project.multi_slot', { title: 'Main' }),
      createCanvasComponent('header-child', 'Project.test', { title: 'Header Content' }, 'parent', 'header'),
      createCanvasComponent('footer-child', 'Project.test', { title: 'Footer Content' }, 'parent', 'footer'),
    ]

    const result = await renderCanvasComponents(canvasComponents, testComponentMap)

    const parent = (result as ReactNode[])[0] as React.ReactElement
    expect(parent.props.title).toBe('Main')
    expect(Array.isArray(parent.props.header)).toBe(true)
    expect(Array.isArray(parent.props.footer)).toBe(true)
  })

  it('transforms component_id to component key (snake_case to PascalCase)', async () => {
    const components: ComponentMap = {
      TextBlock: componentEntry(TestComponent),
      CardGrid: componentEntry(TestComponent),
    }

    const canvasComponents = [
      createCanvasComponent('1', 'Project.text_block', { title: 'Text' }),
      createCanvasComponent('2', 'Project.card_grid', { title: 'Grid' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, components)

    expect((result as ReactNode[]).length).toBe(2)
  })

  it('throws when component not found', async () => {
    const canvasComponents = [
      createCanvasComponent('1', 'Project.nonexistent', { title: 'Test' }),
    ]

    await expect(renderCanvasComponents(canvasComponents, testComponentMap)).rejects.toThrow(
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

    const canvasComponents = [
      createCanvasComponent('1', 'Project.test', { title: 'Test' }),
    ]

    await expect(renderCanvasComponents(canvasComponents, components)).rejects.toThrow(
      'Component "Test" has no default export'
    )
  })

  it('applies transformProps before rendering', async () => {
    const components: ComponentMap = {
      Test: {
        ...componentEntry(TestComponent),
        transformProps: (props) => ({
          title: (props.image as { src: string })?.src || 'no image',
          count: 99,
        }),
      },
    }

    const canvasComponents = [
      createCanvasComponent('1', 'Project.test', {
        image: { src: 'https://example.com/photo.jpg' },
      }),
    ]

    const result = await renderCanvasComponents(canvasComponents, components)

    const element = (result as ReactNode[])[0] as React.ReactElement
    expect(element.props.title).toBe('https://example.com/photo.jpg')
    expect(element.props.count).toBe(99)
  })

  it('returns empty array for empty input', async () => {
    const result = await renderCanvasComponents([], {})

    expect(Array.isArray(result)).toBe(true)
    expect((result as ReactNode[]).length).toBe(0)
  })

  it('sets key prop on rendered elements', async () => {
    const canvasComponents = [
      createCanvasComponent('uuid-123', 'Project.test', { title: 'Test' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, testComponentMap)

    const element = (result as ReactNode[])[0] as React.ReactElement
    expect(element.key).toBe('uuid-123')
  })
})
