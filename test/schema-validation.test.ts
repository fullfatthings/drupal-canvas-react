import { describe, it, expect, beforeAll } from 'vitest'
import Ajv from 'ajv-draft-04'
import { generateComponentIndex } from '../src/generate-index.js'
import { defineConfig } from '../src/config.js'
import * as path from 'path'

const SCHEMA_URL =
  'https://git.drupalcode.org/project/canvas_extjs/-/raw/1.x/schema/component-index.schema.json'

const fixturesDir = path.join(import.meta.dirname, 'fixtures')

let validate: ReturnType<Ajv['compile']>

beforeAll(async () => {
  const response = await fetch(SCHEMA_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.status}`)
  }

  const schema = await response.json()
  validate = new Ajv({ strict: false }).compile(schema)
})

describe('schema validation', () => {
  it('generates valid component-index.json', async () => {
    const config = defineConfig({
      outDir: './dist',
      defaultCategory: 'Test Components',
      components: {
        Simple: {
          path: path.join(fixturesDir, 'SimpleComponent.tsx'),
          loader: () => import('./fixtures/SimpleComponent.js'),
          name: 'Simple Component',
          description: 'No props or slots',
        },
        WithProps: {
          path: path.join(fixturesDir, 'WithProps.tsx'),
          loader: () => import('./fixtures/WithProps.js'),
          name: 'With Props',
          description: 'Has string, number, boolean props',
          category: 'Custom Category',
        },
        WithSlots: {
          path: path.join(fixturesDir, 'WithSlots.tsx'),
          loader: () => import('./fixtures/WithSlots.js'),
          name: 'With Slots',
          description: 'Has props and auto-detected slots',
        },
      },
    })

    const index = await generateComponentIndex(config)
    const valid = validate(index)

    if (!valid) {
      console.error('Validation errors:', validate.errors)
    }

    expect(valid).toBe(true)
    expect(index.components).toHaveLength(3)
  })
})
