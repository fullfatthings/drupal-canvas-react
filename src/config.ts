import * as fs from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'
import type { CanvasConfig } from './types.js'

/**
 * Helper to define a config with type checking.
 */
export function defineConfig(config: CanvasConfig): CanvasConfig {
  return config
}

/**
 * Validate that required config fields are present.
 */
function validateConfig(config: unknown, source: string): CanvasConfig {
  if (!config || typeof config !== 'object') {
    throw new Error(`Invalid config from ${source}: must be an object`)
  }

  const cfg = config as Record<string, unknown>

  if (typeof cfg.componentMap !== 'string') {
    throw new Error(`Invalid config from ${source}: componentMap is required and must be a string`)
  }

  if (typeof cfg.outDir !== 'string') {
    throw new Error(`Invalid config from ${source}: outDir is required and must be a string`)
  }

  return config as CanvasConfig
}

/**
 * Load config from canvas.config.ts, canvas.config.js, or package.json.
 *
 * @param cwd - Working directory to search for config. Defaults to process.cwd().
 * @returns The loaded and validated config.
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<CanvasConfig> {
  // Try canvas.config.ts first
  const tsConfigPath = path.join(cwd, 'canvas.config.ts')
  if (fs.existsSync(tsConfigPath)) {
    const module = await import(pathToFileURL(tsConfigPath).href)
    const config = module.default || module
    return validateConfig(config, tsConfigPath)
  }

  // Try canvas.config.js
  const jsConfigPath = path.join(cwd, 'canvas.config.js')
  if (fs.existsSync(jsConfigPath)) {
    const module = await import(pathToFileURL(jsConfigPath).href)
    const config = module.default || module
    return validateConfig(config, jsConfigPath)
  }

  // Try package.json drupal-canvas field
  const packageJsonPath = path.join(cwd, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    if (packageJson['drupal-canvas']) {
      return validateConfig(packageJson['drupal-canvas'], 'package.json#drupal-canvas')
    }
  }

  throw new Error(
    `No config found. Create canvas.config.ts, canvas.config.js, or add "drupal-canvas" to package.json`
  )
}

/**
 * Resolve a path relative to the config file location.
 *
 * @param configDir - Directory containing the config file.
 * @param relativePath - Path relative to the config file.
 * @returns Absolute path.
 */
export function resolveConfigPath(configDir: string, relativePath: string): string {
  return path.resolve(configDir, relativePath)
}
