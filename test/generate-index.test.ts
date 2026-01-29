import { describe, it, expect } from 'vitest'
import { generateComponentIndex } from '../src/generate-index.js'
import { defineConfig, loadConfig } from '../src/config.js'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const fixturesDir = path.join(import.meta.dirname, 'fixtures')

describe('generateComponentIndex', () => {
  it('handles a simple component with no props', async () => {
    const config = defineConfig({
      outDir: './dist',
      components: {
        Simple: {
          path: path.join(fixturesDir, 'SimpleComponent.tsx'),
          loader: () => import('./fixtures/SimpleComponent.js'),
          name: 'Simple Component',
          description: 'A basic component',
        },
      },
    })

    const index = await generateComponentIndex(config)

    expect(index.version).toBe('1.0')
    expect(index.components).toHaveLength(1)

    const simple = index.components[0]
    expect(simple.id).toBe('Simple')
    expect(simple.name).toBe('Simple Component')
    expect(simple.description).toBe('A basic component')
    expect(simple.props.properties).toEqual({})
    expect(simple.slots).toBeUndefined()
  })

  it('extracts props with correct types and metadata', async () => {
    const config = defineConfig({
      outDir: './dist',
      components: {
        WithProps: {
          path: path.join(fixturesDir, 'WithProps.tsx'),
          loader: () => import('./fixtures/WithProps.js'),
          name: 'With Props',
          description: 'Component with props',
        },
      },
    })

    const index = await generateComponentIndex(config)
    const component = index.components[0]

    expect(component.props.properties.title).toEqual({
      type: 'string',
      title: 'Title',
      description: 'The title text',
      default: undefined,
    })

    expect(component.props.properties.count).toEqual({
      type: 'number',
      title: 'Count',
      description: 'Number of items to display',
      default: 0,
    })

    expect(component.props.properties.bordered).toEqual({
      type: 'boolean',
      title: 'Bordered',
      description: 'Whether to show a border',
      default: false,
    })

    expect(component.slots).toBeUndefined()
  })

  it('auto-detects ReactNode props as slots', async () => {
    const config = defineConfig({
      outDir: './dist',
      components: {
        WithSlots: {
          path: path.join(fixturesDir, 'WithSlots.tsx'),
          loader: () => import('./fixtures/WithSlots.js'),
          name: 'With Slots',
          description: 'Component with slots',
        },
      },
    })

    const index = await generateComponentIndex(config)
    const component = index.components[0]

    // header should be a prop (string)
    expect(component.props.properties.header).toBeDefined()
    expect(component.props.properties.header.type).toBe('string')

    // children and footer should be slots (ReactNode)
    expect(component.slots).toBeDefined()
    expect(component.slots!.children).toEqual({
      name: 'Children',
      description: 'Main content area',
    })
    expect(component.slots!.footer).toEqual({
      name: 'Footer',
      description: 'Optional footer content',
    })

    // slots should not appear in props
    expect(component.props.properties.children).toBeUndefined()
    expect(component.props.properties.footer).toBeUndefined()
  })

  it('uses defaultCategory from config', async () => {
    const config = defineConfig({
      outDir: './dist',
      defaultCategory: 'My Components',
      components: {
        Simple: {
          path: path.join(fixturesDir, 'SimpleComponent.tsx'),
          loader: () => import('./fixtures/SimpleComponent.js'),
          name: 'Simple',
          description: 'Simple component',
        },
      },
    })

    const index = await generateComponentIndex(config)
    expect(index.components[0].category).toBe('My Components')
  })

  it('allows per-component category override', async () => {
    const config = defineConfig({
      outDir: './dist',
      defaultCategory: 'Default',
      components: {
        Simple: {
          path: path.join(fixturesDir, 'SimpleComponent.tsx'),
          loader: () => import('./fixtures/SimpleComponent.js'),
          name: 'Simple',
          description: 'Uses default category',
        },
        WithProps: {
          path: path.join(fixturesDir, 'WithProps.tsx'),
          loader: () => import('./fixtures/WithProps.js'),
          name: 'With Props',
          description: 'Has custom category',
          category: 'Custom Category',
        },
      },
    })

    const index = await generateComponentIndex(config)
    const simple = index.components.find((c) => c.id === 'Simple')
    const withProps = index.components.find((c) => c.id === 'WithProps')

    expect(simple?.category).toBe('Default')
    expect(withProps?.category).toBe('Custom Category')
  })

  it('falls back to component display name when name not provided', async () => {
    const config = defineConfig({
      outDir: './dist',
      components: {
        WithProps: {
          path: path.join(fixturesDir, 'WithProps.tsx'),
          loader: () => import('./fixtures/WithProps.js'),
          description: 'A component',
        },
      },
    })

    const index = await generateComponentIndex(config)
    // Falls back to the React component's displayName
    expect(index.components[0].name).toBe('WithProps')
  })

  it('allows manual prop overrides', async () => {
    const config = defineConfig({
      outDir: './dist',
      components: {
        WithProps: {
          path: path.join(fixturesDir, 'WithProps.tsx'),
          loader: () => import('./fixtures/WithProps.js'),
          name: 'With Props',
          description: 'Component with props',
          props: {
            customProp: {
              type: 'string',
              title: 'Custom',
              description: 'A manually added prop',
            },
          },
        },
      },
    })

    const index = await generateComponentIndex(config)
    const component = index.components[0]

    // Auto-detected props still present
    expect(component.props.properties.title).toBeDefined()

    // Manual prop added
    expect(component.props.properties.customProp).toEqual({
      type: 'string',
      title: 'Custom',
      description: 'A manually added prop',
    })
  })

  it('allows manual slot overrides', async () => {
    const config = defineConfig({
      outDir: './dist',
      components: {
        Simple: {
          path: path.join(fixturesDir, 'SimpleComponent.tsx'),
          loader: () => import('./fixtures/SimpleComponent.js'),
          name: 'Simple',
          description: 'Simple component',
          slots: {
            content: {
              name: 'Content',
              description: 'Manual slot',
            },
          },
        },
      },
    })

    const index = await generateComponentIndex(config)
    expect(index.components[0].slots).toEqual({
      content: {
        name: 'Content',
        description: 'Manual slot',
      },
    })
  })
})

describe('defineConfig', () => {
  it('returns the config unchanged', () => {
    const config = {
      outDir: './dist',
      components: {},
    }

    expect(defineConfig(config)).toBe(config)
  })
})

describe('loadConfig', () => {
  it('loads canvas.config.ts', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-test-'))
    const configPath = path.join(tmpDir, 'canvas.config.ts')

    fs.writeFileSync(
      configPath,
      `export default {
        outDir: './out',
        components: {
          Test: {
            path: 'test.tsx',
            loader: () => Promise.resolve({ default: () => null }),
          },
        },
      }`
    )

    try {
      const config = await loadConfig(tmpDir)
      expect(config.outDir).toBe('./out')
      expect(config.components.Test).toBeDefined()
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  it('throws when no config found', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-test-'))

    try {
      await expect(loadConfig(tmpDir)).rejects.toThrow('No config found')
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  it('throws when outDir is missing', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-test-'))
    const configPath = path.join(tmpDir, 'canvas.config.ts')

    fs.writeFileSync(configPath, `export default { components: {} }`)

    try {
      await expect(loadConfig(tmpDir)).rejects.toThrow('outDir is required')
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  it('throws when components is missing', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-test-'))
    const configPath = path.join(tmpDir, 'canvas.config.ts')

    fs.writeFileSync(configPath, `export default { outDir: './out' }`)

    try {
      await expect(loadConfig(tmpDir)).rejects.toThrow('components is required')
    } finally {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })
})
