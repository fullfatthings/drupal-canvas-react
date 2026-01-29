import { parse } from 'react-docgen-typescript'
import * as fs from 'fs'
import * as path from 'path'
import type { CanvasConfig, ComponentIndex, PropertySchema, SlotDefinition } from './types.js'

interface GenerateIndexOptions {
  /**
   * Working directory for resolving paths.
   */
  cwd?: string
}

/**
 * Convert a TypeScript type name to JSON Schema type.
 */
function convertTypeToJsonSchema(type: string): 'string' | 'number' | 'boolean' {
  if (type === 'number') return 'number'
  if (type === 'boolean') return 'boolean'
  return 'string'
}

/**
 * Parse a JSDoc comment to extract title and description.
 *
 * Supports "Title: Description" format, otherwise uses camelCase to sentence case conversion.
 */
function parseTitleAndDescription(
  comment: string | undefined,
  propName: string
): { title: string; description: string | undefined } {
  // Convert camelCase to sentence case (e.g., fullWidth -> Full width)
  const defaultTitle = propName
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase())
    .trim()

  if (!comment) {
    return { title: defaultTitle, description: undefined }
  }

  // Check for "Title: Description" format
  const match = comment.match(/^([^:]+):\s*(.*)$/)
  if (match) {
    return {
      title: match[1].trim(),
      description: match[2].trim() || undefined,
    }
  }

  return { title: defaultTitle, description: comment }
}

/**
 * Generate the component index from the component map.
 *
 * @param config - The canvas config.
 * @param options - Generation options.
 * @returns The generated component index.
 */
/**
 * Check if a type string indicates a ReactNode (slot) type.
 */
function isReactNodeType(typeName: string): boolean {
  return (
    typeName === 'ReactNode' ||
    typeName.includes('ReactNode') ||
    typeName === 'React.ReactNode' ||
    typeName.includes('React.ReactNode')
  )
}

export async function generateComponentIndex(
  config: CanvasConfig,
  options: GenerateIndexOptions = {}
): Promise<ComponentIndex> {
  const cwd = options.cwd || process.cwd()
  const category = config.defaultCategory || 'Components'

  // Use components directly from config
  const components = config.components

  const result = []

  for (const [id, entry] of Object.entries(components)) {
    const filePath = path.resolve(cwd, entry.path)

    // Parse TypeScript props
    const parsed = parse(filePath, {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
    })

    const componentDoc = parsed.length > 0 ? parsed[0] : null

    // Check if we have enough info to include this component
    const hasManualMeta = entry.name || entry.description || entry.props || entry.slots
    if (!componentDoc && !hasManualMeta) {
      console.warn(`No component found in ${filePath} (add name/description to config to include)`)
      continue
    }

    // Build meta from available sources (entry > auto-generated)
    const meta = {
      name: entry.name || componentDoc?.displayName || id,
      description: entry.description || componentDoc?.description || `${id} component`,
    }

    // Convert props to JSON Schema format, auto-detecting slots
    const properties: Record<string, PropertySchema> = {}
    const slots: Record<string, SlotDefinition> = {}

    for (const [propName, propInfo] of Object.entries(componentDoc?.props ?? {})) {
      // Skip props inherited from node_modules (e.g., React.HTMLAttributes)
      // Allow props from the same project (src/) even if via type helpers
      const parent = (propInfo as any).parent
      if (parent && parent.fileName.includes('node_modules')) {
        continue
      }

      const { title, description } = parseTitleAndDescription(propInfo.description, propName)

      // Auto-detect slots from ReactNode type
      if (isReactNodeType(propInfo.type.name)) {
        slots[propName] = {
          name: title,
          description,
        }
        continue
      }

      properties[propName] = {
        type: convertTypeToJsonSchema(propInfo.type.name),
        title,
        description,
        default: propInfo.defaultValue?.value,
      }
    }

    // Merge manual props/slots from config (manual takes precedence)
    const mergedProperties = { ...properties, ...entry.props }
    const mergedSlots = { ...slots, ...entry.slots }

    result.push({
      id,
      name: meta.name,
      category,
      description: meta.description,
      status: 'stable' as const,
      props: {
        type: 'object' as const,
        properties: mergedProperties,
      },
      slots: Object.keys(mergedSlots).length > 0 ? mergedSlots : undefined,
    })
  }

  return {
    version: '1.0',
    components: result,
  }
}

/**
 * Generate and write the component index to the output directory.
 *
 * @param config - The canvas config.
 * @param options - Generation options.
 */
export async function writeComponentIndex(
  config: CanvasConfig,
  options: GenerateIndexOptions = {}
): Promise<void> {
  const cwd = options.cwd || process.cwd()
  const index = await generateComponentIndex(config, options)

  const outDir = path.resolve(cwd, config.outDir)

  // Ensure output directory exists
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const outputPath = path.join(outDir, 'component-index.json')
  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2) + '\n')
  console.log(`Generated ${outputPath}`)
}
