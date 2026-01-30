/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { createRenderFunction } from '../src/preview.js'
import type { ComponentMap } from '../src/types.js'
import {
  TestComponent,
  SlotComponent,
  componentEntry,
} from './fixtures/render-components.js'

const testComponents: ComponentMap = {
  Test: componentEntry(TestComponent),
  Slot: componentEntry(SlotComponent),
}

describe('createRenderFunction', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('renders a component with props', async () => {
    const render = createRenderFunction(testComponents)
    await render(container, 'Test', { title: 'Hello World', count: 42 }, {})

    await waitFor(() => {
      expect(container.querySelector('h1')?.textContent).toBe('Hello World')
    })
    expect(container.querySelector('span')?.textContent).toBe('Count: 42')
  })

  it('throws when component not found', async () => {
    const render = createRenderFunction(testComponents)

    await expect(render(container, 'NonExistent', {}, {})).rejects.toThrow(
      'Component NonExistent not found'
    )
  })

  it('renders slots from HTML strings', async () => {
    const render = createRenderFunction(testComponents)
    await render(
      container,
      'Slot',
      { heading: 'Article Title' },
      { children: '<p>This is <strong>rich</strong> content</p>' }
    )

    await waitFor(() => {
      expect(container.querySelector('h2')?.textContent).toBe('Article Title')
    })
    const slotContent = container.querySelector('[data-testid="slot-content"]')
    expect(slotContent?.innerHTML).toContain('<p>')
    expect(slotContent?.innerHTML).toContain('<strong>rich</strong>')
  })

  it('works with prefixed component IDs', async () => {
    const components: ComponentMap = {
      AcmeHero: componentEntry(TestComponent),
    }

    const render = createRenderFunction(components)
    await render(container, 'AcmeHero', { title: 'Hero Title' }, {})

    await waitFor(() => {
      expect(container.querySelector('h1')?.textContent).toBe('Hero Title')
    })

    // Unprefixed name should fail
    await expect(render(container, 'Hero', { title: 'Test' }, {})).rejects.toThrow(
      'Component Hero not found'
    )
  })

  it('applies transformProps to props before rendering', async () => {
    const components: ComponentMap = {
      ImageComponent: {
        ...componentEntry(TestComponent),
        transformProps: (props) => ({
          ...props,
          title: (props.image as { src: string })?.src || 'no image',
        }),
      },
    }

    const render = createRenderFunction(components)
    await render(
      container,
      'ImageComponent',
      { image: { src: 'https://example.com/photo.jpg', alt: 'Photo' } },
      {}
    )

    await waitFor(() => {
      expect(container.querySelector('h1')?.textContent).toBe('https://example.com/photo.jpg')
    })
  })
})
