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
  // Output directory for generated files
  outDir: '../back-end/web/components',

  // Default category name for components in the Canvas UI
  defaultCategory: 'My components',

  // Optional: Output filename (default: 'drupal-canvas.js')
  // outputFilename: 'drupal-canvas.js',

  // Optional: Path to tsconfig for compilation
  // tsconfig: './tsconfig.json',

  // Optional: Custom module stubs
  // stubs: {
  //   'next/image': './my-stubs/image.tsx',
  // },

  // Component definitions
  components: {
    // Example component:
    // TextBlock: {
    //   path: 'components/organisms/TextBlock/TextBlock.tsx',
    //   loader: () => import('./components/organisms/TextBlock/TextBlock'),
    // },
  },
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
  console.log('1. Edit canvas.config.ts to add your components')
  console.log('2. Run `npx drupal-canvas-react build` to generate the component index and bundle')
}

async function generateIndex(cwd: string) {
  const config = await loadConfig(cwd)
  await writeComponentIndex(config, { cwd })
}

/**
 * Generate the entry file content for bundling.
 */
function generateEntryCode(config: import('./types.js').CanvasConfig): string {
  const loaderImports: string[] = []
  const componentEntries: string[] = []

  for (const [id, entry] of Object.entries(config.components)) {
    // Extract the import path from the loader function
    const loaderStr = entry.loader.toString()
    const importMatch = loaderStr.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/)

    if (importMatch) {
      const importPath = importMatch[1]
      loaderImports.push(`    ${id}: () => import('${importPath}'),`)
      componentEntries.push(
        `  ${id}: {\n    path: '${entry.path}',\n    loader: loaders.${id},\n  },`
      )
    }
  }

  return `import { createRenderFunction } from 'drupal-canvas-react/runtime'

const loaders = {
${loaderImports.join('\n')}
}

const components = {
${componentEntries.join('\n')}
}

export const render = createRenderFunction(components)

if (typeof window !== 'undefined') {
  ;(window as any).render = render
}
`
}

async function bundle(cwd: string) {
  const config = await loadConfig(cwd)
  const outputFilename = config.outputFilename || 'drupal-canvas.js'

  // Generate temporary entry file
  const entryContent = generateEntryCode(config)
  const tempEntryPath = path.join(cwd, '.drupal-canvas-entry.ts')
  fs.writeFileSync(tempEntryPath, entryContent)

  try {
    const tsupConfig = createTsupConfig(config, { cwd, entry: tempEntryPath, outputFilename })

    const tsup = await import('tsup')
    await tsup.build(tsupConfig)
    console.log(`Built ${outputFilename} to ${config.outDir}`)
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempEntryPath)) {
      fs.unlinkSync(tempEntryPath)
    }
  }
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
