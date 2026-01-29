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
 * Returns null if the type is incompatible with Canvas (objects, arrays).
 */
function convertTypeToJsonSchema(
  typeName: string
): { type: 'string' | 'number' | 'boolean'; incompatible?: undefined } | { incompatible: true } {
  // Primitive types are compatible
  if (typeName === 'number') return { type: 'number' }
  if (typeName === 'boolean') return { type: 'boolean' }
  if (typeName === 'string') return { type: 'string' }

  // Enum/union of string literals is compatible (will be type: 'string' with enum)
  if (typeName === 'enum' || /^["']/.test(typeName)) return { type: 'string' }

  // Object types (contains { or is a named type that's not a primitive)
  if (typeName.includes('{') || typeName.includes('[')) {
    return { incompatible: true }
  }

  // Named types (like DrupalImage, ImageTypes, etc.) are likely objects
  // Exception: some types might be string aliases, but we can't know for sure
  if (/^[A-Z]/.test(typeName)) {
    return { incompatible: true }
  }

  // Default to string for anything else
  return { type: 'string' }
}

/**
 * Extract enum values from a type string like '"S" | "M" | "L"' or "'S' | 'M' | 'L'".
 */
function extractEnumValues(typeString: string | undefined): string[] | undefined {
  if (!typeString) return undefined

  // Match quoted string values in union types (double or single quotes)
  const matches = typeString.match(/["']([^"']+)["']/g)
  if (!matches || matches.length === 0) return undefined

  // Remove quotes from matched values
  return matches.map((m) => m.slice(1, -1))
}

/**
 * Extract enum values for a prop directly from source code to preserve original order.
 * Looks for patterns like: propName?: 'S' | 'M' | 'L' or propName: "A" | "B"
 */
function extractEnumFromSource(sourceCode: string, propName: string): string[] | undefined {
  // Match prop definition with union of string literals
  // Handles: propName?: 'A' | 'B' | 'C' or propName: "X" | "Y"
  const pattern = new RegExp(
    `${propName}\\??:\\s*(['"][^'"]+['"](?:\\s*\\|\\s*['"][^'"]+['"])*)`,
    'm'
  )
  const match = sourceCode.match(pattern)
  if (!match) return undefined

  return extractEnumValues(match[1])
}

/**
 * Extract the order of props from source code.
 * Returns prop names in the order they appear in the type definition.
 */
function extractPropOrder(sourceCode: string): string[] {
  // Match prop definitions like: propName?: type or propName: type
  const propPattern = /^\s*(\w+)\??:/gm
  const props: string[] = []
  let match
  while ((match = propPattern.exec(sourceCode)) !== null) {
    if (!props.includes(match[1])) {
      props.push(match[1])
    }
  }
  return props
}

/**
 * Sort properties object to match source order.
 */
function sortPropertiesBySourceOrder(
  properties: Record<string, PropertySchema>,
  sourceOrder: string[]
): Record<string, PropertySchema> {
  const sorted: Record<string, PropertySchema> = {}

  // First add props in source order
  for (const propName of sourceOrder) {
    if (properties[propName]) {
      sorted[propName] = properties[propName]
    }
  }

  // Then add any remaining props not in source (shouldn't happen normally)
  for (const propName of Object.keys(properties)) {
    if (!sorted[propName]) {
      sorted[propName] = properties[propName]
    }
  }

  return sorted
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
  const defaultCategory = config.defaultCategory || 'Components'
  const idPrefix = config.idPrefix || ''

  // Use components directly from config
  const components = config.components

  const result = []

  for (const [id, entry] of Object.entries(components)) {
    const filePath = path.resolve(cwd, entry.path)

    // Parse TypeScript props
    const parsed = parse(filePath, {
      shouldExtractLiteralValuesFromEnum: false,
      shouldRemoveUndefinedFromOptional: true,
    })

    const componentDoc = parsed.length > 0 ? parsed[0] : null
    const sourceCode = fs.readFileSync(filePath, 'utf-8')

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
          title,
          description,
        }
        continue
      }

      // Check if the type is compatible with Canvas
      const typeResult = convertTypeToJsonSchema(propInfo.type.name)
      if (typeResult.incompatible) {
        console.warn(
          `  ⚠ ${id}.${propName}: type "${propInfo.type.name}" is not supported`
        )
        continue
      }

      // Extract enum values from source if this looks like a union of string literals
      // Check if type.name contains quoted strings with | (e.g., "L" | "S" | "M")
      const looksLikeEnum = /["'][^"']+["']\s*\|/.test(propInfo.type.name)
      const enumValues = looksLikeEnum ? extractEnumFromSource(sourceCode, propName) : undefined

      properties[propName] = {
        type: typeResult.type,
        title,
        description,
        default: propInfo.defaultValue?.value,
        enum: enumValues,
      }
    }

    // Merge manual props/slots from config (manual takes precedence)
    // If a prop is manually defined, remove it from slots (can't be both)
    const mergedProperties = { ...properties, ...entry.props }
    const mergedSlots = { ...slots, ...entry.slots }
    for (const propName of Object.keys(entry.props ?? {})) {
      delete mergedSlots[propName]
    }

    // Sort properties to match source order
    const propOrder = extractPropOrder(sourceCode)
    const sortedProperties = sortPropertiesBySourceOrder(mergedProperties, propOrder)

    result.push({
      id: idPrefix + id,
      name: meta.name,
      category: entry.category || defaultCategory,
      description: meta.description,
      status: 'stable' as const,
      props: {
        type: 'object' as const,
        properties: sortedProperties,
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
