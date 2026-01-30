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
  it('renders a single root component', async () => {
    const canvasComponents = [
      createCanvasComponent('1', 'extjs.test', { title: 'Hello World', count: 42 }),
    ]

    const result = await renderCanvasComponents(canvasComponents, {
      components: testComponents,
    })

    expect(Array.isArray(result)).toBe(true)
    expect((result as ReactNode[]).length).toBe(1)
    const element = (result as ReactNode[])[0]
    expect(isValidElement(element)).toBe(true)
    expect((element as React.ReactElement).props.title).toBe('Hello World')
    expect((element as React.ReactElement).props.count).toBe(42)
  })

  it('renders multiple root components', async () => {
    const canvasComponents = [
      createCanvasComponent('1', 'extjs.test', { title: 'First' }),
      createCanvasComponent('2', 'extjs.test', { title: 'Second' }),
      createCanvasComponent('3', 'extjs.test', { title: 'Third' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, {
      components: testComponents,
    })

    expect(Array.isArray(result)).toBe(true)
    expect((result as ReactNode[]).length).toBe(3)
  })

  it('renders nested components in slots', async () => {
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
      createCanvasComponent('header-child', 'extjs.test', { title: 'Header Content' }, 'parent', 'header'),
      createCanvasComponent('footer-child', 'extjs.test', { title: 'Footer Content' }, 'parent', 'footer'),
    ]

    const result = await renderCanvasComponents(canvasComponents, {
      components: testComponents,
    })

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
      createCanvasComponent('1', 'extjs.text_block', { title: 'Text' }),
      createCanvasComponent('2', 'extjs.card_grid', { title: 'Grid' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, { components })

    expect((result as ReactNode[]).length).toBe(2)
  })

  it('silently skips when component not found', async () => {
    const canvasComponents = [
      createCanvasComponent('1', 'extjs.nonexistent', { title: 'Test' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, { components: testComponents })

    expect((result as ReactNode[]).length).toBe(1)
    expect((result as ReactNode[])[0]).toBeNull()
  })

  it('resolves named export when no default export', async () => {
    const components: ComponentMap = {
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ Test: TestComponent }),
      },
    }

    const canvasComponents = [
      createCanvasComponent('1', 'extjs.test', { title: 'Named Export' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, { components })

    expect((result as ReactNode[]).length).toBe(1)
    const element = (result as ReactNode[])[0] as React.ReactElement
    expect(element.props.title).toBe('Named Export')
  })

  it('calls onError handler and renders returned node', async () => {
    const onError = vi.fn().mockReturnValue(
      createElement('div', { 'data-testid': 'error' }, 'Error occurred')
    )

    const canvasComponents = [
      createCanvasComponent('1', 'extjs.missing', { title: 'Test' }),
    ]

    const result = await renderCanvasComponents(
      canvasComponents,
      { components: testComponents },
      { onError }
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ uuid: '1' })
    )
    const element = (result as ReactNode[])[0] as React.ReactElement
    expect(element.props['data-testid']).toBe('error')
  })

  it('skips component when onError returns undefined', async () => {
    const onError = vi.fn().mockReturnValue(undefined)

    const canvasComponents = [
      createCanvasComponent('1', 'extjs.missing', { title: 'Test' }),
    ]

    const result = await renderCanvasComponents(
      canvasComponents,
      { components: testComponents },
      { onError }
    )

    expect(onError).toHaveBeenCalled()
    expect((result as ReactNode[])[0]).toBeNull()
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
      createCanvasComponent('1', 'extjs.test', {
        image: { src: 'https://example.com/photo.jpg' },
      }),
    ]

    const result = await renderCanvasComponents(canvasComponents, { components })

    const element = (result as ReactNode[])[0] as React.ReactElement
    expect(element.props.title).toBe('https://example.com/photo.jpg')
    expect(element.props.count).toBe(99)
  })

  it('returns empty array for empty input', async () => {
    const result = await renderCanvasComponents([], { components: {} })

    expect(Array.isArray(result)).toBe(true)
    expect((result as ReactNode[]).length).toBe(0)
  })

  it('sets key prop on rendered elements', async () => {
    const canvasComponents = [
      createCanvasComponent('uuid-123', 'extjs.test', { title: 'Test' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, {
      components: testComponents,
    })

    const element = (result as ReactNode[])[0] as React.ReactElement
    expect(element.key).toBe('uuid-123')
  })

  it('strips idPrefix from component_id when matching config keys', async () => {
    const components: ComponentMap = {
      TextBlock: componentEntry(TestComponent),
      CardGrid: componentEntry(TestComponent),
    }

    // Drupal sends prefixed IDs like "extjs.acme_text_block"
    const canvasComponents = [
      createCanvasComponent('1', 'extjs.acme_text_block', { title: 'Text' }),
      createCanvasComponent('2', 'extjs.acme_card_grid', { title: 'Grid' }),
    ]

    // With idPrefix "Acme", "AcmeTextBlock" becomes "TextBlock"
    const result = await renderCanvasComponents(canvasComponents, {
      components,
      idPrefix: 'Acme',
    })

    expect((result as ReactNode[]).length).toBe(2)
  })

  it('works without idPrefix for unprefixed component IDs', async () => {
    const components: ComponentMap = {
      TextBlock: componentEntry(TestComponent),
    }

    const canvasComponents = [
      createCanvasComponent('1', 'extjs.text_block', { title: 'Text' }),
    ]

    const result = await renderCanvasComponents(canvasComponents, { components })

    expect((result as ReactNode[]).length).toBe(1)
  })
})
