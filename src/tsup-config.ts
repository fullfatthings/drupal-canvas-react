import * as path from 'path'
import type { Options } from 'tsup'
import type { CanvasConfig } from './types.js'

/**
 * Get the path to the built-in stubs directory.
 * This resolves to the dist/stubs directory in the package.
 */
function getBuiltinStubsDir(): string {
  // When running from dist, __dirname points to dist/
  // The stubs are at dist/stubs/
  return path.join(path.dirname(new URL(import.meta.url).pathname), 'stubs')
}

export interface CreateTsupConfigOptions {
  /**
   * Working directory for resolving paths.
   */
  cwd?: string

  /**
   * Entry file for the standalone bundle.
   * @default './standalone.ts' (relative to component map directory)
   */
  entry?: string
}

/**
 * Create a tsup configuration for building the standalone bundle.
 *
 * @param config - The canvas config.
 * @param options - Additional options.
 * @returns A tsup configuration object.
 *
 * @example
 * ```ts
 * // tsup.config.ts
 * import { createTsupConfig, loadConfig } from 'drupal-canvas-react'
 *
 * export default loadConfig().then(createTsupConfig)
 * ```
 */
export function createTsupConfig(
  config: CanvasConfig,
  options: CreateTsupConfigOptions = {}
): Options {
  const cwd = options.cwd || process.cwd()
  const builtinStubsDir = getBuiltinStubsDir()

  // Resolve paths
  const componentMapDir = path.dirname(path.resolve(cwd, config.componentMap))
  const entryFile = options.entry || path.join(componentMapDir, 'standalone.ts')
  const outDir = path.resolve(cwd, config.outDir)

  // Build alias map
  const alias: Record<string, string> = {
    'next/image': path.join(builtinStubsDir, 'image.js'),
    'next/link': path.join(builtinStubsDir, 'link.js'),
  }

  // Add custom stubs from config
  if (config.stubs) {
    for (const [moduleName, stubPath] of Object.entries(config.stubs)) {
      alias[moduleName] = path.resolve(cwd, stubPath)
    }
  }

  return {
    entry: [entryFile],
    format: 'esm',
    platform: 'browser',
    outDir,
    outExtension: () => ({ js: '.js' }),
    noExternal: [/.*/],
    minify: true,
    splitting: false,
    tsconfig: config.tsconfig ? path.resolve(cwd, config.tsconfig) : undefined,
    esbuildOptions(esbuildOptions) {
      esbuildOptions.alias = alias
    },
  }
}
