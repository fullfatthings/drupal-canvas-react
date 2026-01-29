#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { loadConfig } from './config.js'
import { writeComponentIndex } from './generate-index.js'
import { createTsupConfig } from './tsup-config.js'

const HELP = `
drupal-canvas-react - Build React components for Drupal Canvas integration

Usage:
  drupal-canvas-react <command> [options]

Commands:
  build           Full build (index + bundle)
  generate-index  Generate only component-index.json
  bundle          Build only standalone.js
  init            Create canvas.config.ts template

Options:
  --help, -h      Show this help message
  --version, -v   Show version number

Examples:
  npx drupal-canvas-react build
  npx drupal-canvas-react generate-index
  npx drupal-canvas-react init
`

const CONFIG_TEMPLATE = `import { defineConfig } from 'drupal-canvas-react'

export default defineConfig({
  // Path to your component map file
  componentMap: './components/component-map.ts',

  // Output directory for generated files
  outDir: '../back-end/web/components',

  // Category name for components in the Canvas UI
  category: 'My components',

  // Optional: Path to CSS input file
  // cssInput: './components/standalone.css',

  // Optional: Path to tsconfig for compilation
  // tsconfig: './components/tsconfig.json',

  // Optional: Custom module stubs
  // stubs: {
  //   'next/image': './my-stubs/image.tsx',
  // },
})
`

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP)
    process.exit(0)
  }

  if (command === '--version' || command === '-v') {
    const packageJsonPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    console.log(packageJson.version)
    process.exit(0)
  }

  const cwd = process.cwd()

  switch (command) {
    case 'init':
      await init(cwd)
      break

    case 'generate-index':
      await generateIndex(cwd)
      break

    case 'bundle':
      await bundle(cwd)
      break

    case 'build':
      await build(cwd)
      break

    default:
      console.error(`Unknown command: ${command}`)
      console.log(HELP)
      process.exit(1)
  }
}

async function init(cwd: string) {
  const configPath = path.join(cwd, 'canvas.config.ts')

  if (fs.existsSync(configPath)) {
    console.error(`canvas.config.ts already exists at ${configPath}`)
    process.exit(1)
  }

  fs.writeFileSync(configPath, CONFIG_TEMPLATE)
  console.log(`Created ${configPath}`)
  console.log('\nNext steps:')
  console.log('1. Edit canvas.config.ts to match your project structure')
  console.log('2. Create a component map file (see componentMap path)')
  console.log('3. Run `npx drupal-canvas-react build` to generate the component index')
}

async function generateIndex(cwd: string) {
  const config = await loadConfig(cwd)
  await writeComponentIndex(config, { cwd })
}

async function bundle(cwd: string) {
  const config = await loadConfig(cwd)
  const tsupConfig = createTsupConfig(config, { cwd })

  const tsup = await import('tsup')
  await tsup.build(tsupConfig)
  console.log(`Built standalone.js to ${config.outDir}`)
}

async function build(cwd: string) {
  console.log('Generating component index...')
  await generateIndex(cwd)

  console.log('\nBuilding standalone bundle...')
  await bundle(cwd)

  console.log('\nBuild complete!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
