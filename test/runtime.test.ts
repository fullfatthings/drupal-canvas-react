/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { waitFor } from '@testing-library/react'
import { createRenderFunction } from '../src/runtime.js'
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
  children?: React.ReactNode
}) {
  return React.createElement(
    'article',
    { 'data-testid': 'slot-component' },
    React.createElement('h2', null, heading),
    React.createElement('div', { 'data-testid': 'slot-content' }, children)
  )
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
    const components: ComponentMap = {
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
    }

    const render = createRenderFunction(components)
    await render(container, 'Test', { title: 'Hello World', count: 42 }, {})

    await waitFor(() => {
      expect(container.querySelector('h1')?.textContent).toBe('Hello World')
    })
    expect(container.querySelector('span')?.textContent).toBe('Count: 42')
  })

  it('throws when component not found', async () => {
    const components: ComponentMap = {
      Test: {
        path: 'test.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
    }

    const render = createRenderFunction(components)

    await expect(render(container, 'NonExistent', {}, {})).rejects.toThrow(
      'Component NonExistent not found'
    )
  })

  it('renders slots from HTML strings', async () => {
    const components: ComponentMap = {
      Slot: {
        path: 'slot.tsx',
        loader: () => Promise.resolve({ default: SlotComponent }),
      },
    }

    const render = createRenderFunction(components)
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
      MyProjectHero: {
        path: 'components/Hero.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
      },
    }

    const render = createRenderFunction(components)
    await render(container, 'MyProjectHero', { title: 'Hero Title' }, {})

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
        path: 'image.tsx',
        loader: () => Promise.resolve({ default: TestComponent }),
        transformProps: (props) => ({
          ...props,
          // Simulate extracting src from Canvas image object
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
