import { describe, it, expect, vi } from 'vitest'
import { createElement, isValidElement, type ReactNode } from 'react'
import { renderCanvasComponents } from '../src/server.js'
import type { ComponentMap } from '../src/types.js'
import {
  TestComponent,
  SlotComponent,
  MultiSlotComponent,
  componentEntry,
  createCanvasComponent,
} from './fixtures/render-components.js'

const testComponents: ComponentMap = {
  Test: componentEntry(TestComponent),
  Slot: componentEntry(SlotComponent),
  MultiSlot: componentEntry(MultiSlotComponent),
}

describe('renderCanvasComponents', () => {
  it('renders root components with props', async () => {
    const canvasComponents = [
      createCanvasComponent('1', 'extjs.test', { title: 'First', count: 42 }),
      createCanvasComponent('2', 'extjs.test', { title: 'Second' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, {
      components: testComponents,
    })

    expect(Array.isArray(result)).toBe(true)
    expect((result as ReactNode[]).length).toBe(2)
    const element = (result as ReactNode[])[0]
    expect(isValidElement(element)).toBe(true)
    expect((element as React.ReactElement).props.title).toBe('First')
    expect((element as React.ReactElement).props.count).toBe(42)
    expect((element as React.ReactElement).key).toBe('1')
  })

  it('renders nested components in children slot', async () => {
    const canvasComponents = [
      createCanvasComponent('parent', 'extjs.slot', { heading: 'Parent' }),
      createCanvasComponent('child', 'extjs.test', { title: 'Child' }, 'parent', 'children'),
    ]

    const result = await renderCanvasComponents(canvasComponents, {
      components: testComponents,
    })

    expect((result as ReactNode[]).length).toBe(1)
    const parent = (result as ReactNode[])[0] as React.ReactElement
    expect(parent.props.heading).toBe('Parent')
    expect(Array.isArray(parent.props.children)).toBe(true)
    expect(parent.props.children.length).toBe(1)
  })

  it('renders components in named slots', async () => {
    const canvasComponents = [
      createCanvasComponent('parent', 'extjs.multi_slot', { title: 'Main' }),
      createCanvasComponent('header-child', 'extjs.test', { title: 'Header' }, 'parent', 'header'),
      createCanvasComponent('footer-child', 'extjs.test', { title: 'Footer' }, 'parent', 'footer'),
    ]

    const result = await renderCanvasComponents(canvasComponents, {
      components: testComponents,
    })

    const parent = (result as ReactNode[])[0] as React.ReactElement
    expect(parent.props.title).toBe('Main')
    expect(Array.isArray(parent.props.header)).toBe(true)
    expect(Array.isArray(parent.props.footer)).toBe(true)
  })

  it('transforms snake_case component_id to PascalCase', async () => {
    const components: ComponentMap = {
      TextBlock: componentEntry(TestComponent),
      CardGrid: componentEntry(TestComponent),
    }

    const canvasComponents = [
      createCanvasComponent('1', 'extjs.text_block', { title: 'Text' }),
      createCanvasComponent('2', 'extjs.card_grid', { title: 'Grid' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, { components })

    expect((result as ReactNode[]).length).toBe(2)
  })

  it('strips idPrefix from component_id', async () => {
    const components: ComponentMap = {
      TextBlock: componentEntry(TestComponent),
    }

    const canvasComponents = [
      createCanvasComponent('1', 'extjs.acme_text_block', { title: 'Text' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, {
      components,
      idPrefix: 'Acme',
    })

    expect((result as ReactNode[]).length).toBe(1)
    expect((result as ReactNode[])[0]).not.toBeNull()
  })

  it('resolves named export when no default export', async () => {
    const components: ComponentMap = {
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ Test: TestComponent }),
      },
    }

    const canvasComponents = [createCanvasComponent('1', 'extjs.test', { title: 'Named Export' })]

    const result = await renderCanvasComponents(canvasComponents, { components })

    const element = (result as ReactNode[])[0] as React.ReactElement
    expect(element.props.title).toBe('Named Export')
  })

  it('applies transformProps before rendering', async () => {
    const components: ComponentMap = {
      Test: {
        ...componentEntry(TestComponent),
        transformProps: (props) => ({
          title: (props.image as { src: string })?.src || 'no image',
        }),
      },
    }

    const canvasComponents = [
      createCanvasComponent('1', 'extjs.test', {
        image: { src: 'https://example.com/photo.jpg' },
      }),
    ]

    const result = await renderCanvasComponents(canvasComponents, { components })

    const element = (result as ReactNode[])[0] as React.ReactElement
    expect(element.props.title).toBe('https://example.com/photo.jpg')
  })

  it('silently skips missing components', async () => {
    const canvasComponents = [createCanvasComponent('1', 'extjs.nonexistent', { title: 'Test' })]

    const result = await renderCanvasComponents(canvasComponents, { components: testComponents })

    expect((result as ReactNode[])[0]).toBeNull()
  })

  it('calls onError and renders returned node or null', async () => {
    const onErrorWithNode = vi
      .fn()
      .mockReturnValue(createElement('div', { 'data-testid': 'error' }, 'Error'))
    const onErrorWithNull = vi.fn().mockReturnValue(undefined)

    const canvasComponents = [createCanvasComponent('1', 'extjs.missing', { title: 'Test' })]

    // Returns custom element
    const result1 = await renderCanvasComponents(
      canvasComponents,
      { components: testComponents },
      { onError: onErrorWithNode }
    )
    expect(onErrorWithNode).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ uuid: '1' })
    )
    expect((result1 as React.ReactElement[])[0].props['data-testid']).toBe('error')

    // Returns null when handler returns undefined
    const result2 = await renderCanvasComponents(
      canvasComponents,
      { components: testComponents },
      { onError: onErrorWithNull }
    )
    expect((result2 as ReactNode[])[0]).toBeNull()
  })
})
