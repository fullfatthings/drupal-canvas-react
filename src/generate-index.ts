import { parse } from 'react-docgen-typescript'
import * as fs from 'fs'
import * as path from 'path'
import type {
  CanvasConfig,
  ComponentIndex,
  ComponentMeta,
  PropertySchema,
  SlotDefinition,
} from './types.js'

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
 * Extract componentMeta from a source file by parsing the source code.
 * This avoids needing to import .tsx files which Node can't handle natively.
 */
function extractComponentMeta(sourceCode: string): ComponentMeta | null {
  // Find the componentMeta export
  // Handles: export const componentMeta = { ... }
  // And: export const componentMeta: SomeType = { ... }
  const match = sourceCode.match(/export\s+const\s+componentMeta(?:\s*:\s*[^=]+)?\s*=\s*(\{)/)
  if (!match) {
    return null
  }

  const startIndex = match.index! + match[0].length - 1 // Position of opening brace

  // Find matching closing brace
  let braceCount = 0
  let endIndex = startIndex

  for (let i = startIndex; i < sourceCode.length; i++) {
    const char = sourceCode[i]

    // Skip string literals
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      i++
      while (i < sourceCode.length) {
        if (sourceCode[i] === quote && sourceCode[i - 1] !== '\\') {
          break
        }
        // Handle template literal expressions
        if (quote === '`' && sourceCode[i] === '$' && sourceCode[i + 1] === '{') {
          let nestedBraces = 1
          i += 2
          while (i < sourceCode.length && nestedBraces > 0) {
            if (sourceCode[i] === '{') nestedBraces++
            else if (sourceCode[i] === '}') nestedBraces--
            i++
          }
          i--
        }
        i++
      }
      continue
    }

    if (char === '{') {
      braceCount++
    } else if (char === '}') {
      braceCount--
      if (braceCount === 0) {
        endIndex = i
        break
      }
    }
  }

  const objectLiteral = sourceCode.slice(startIndex, endIndex + 1)

  // Evaluate the object literal safely using Function constructor
  // This is safe because componentMeta should only contain static data
  try {
    const fn = new Function(`return ${objectLiteral}`)
    return fn() as ComponentMeta
  } catch (e) {
    console.warn(`Failed to parse componentMeta: ${e}`)
    return null
  }
}

export interface GenerateIndexOptions {
  /**
   * Working directory for resolving paths.
   */
  cwd?: string
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

    if (parsed.length === 0) {
      console.warn(`No component found in ${filePath}`)
      continue
    }

    const componentDoc = parsed[0]

    // Read the source file and extract componentMeta
    const sourceCode = fs.readFileSync(filePath, 'utf-8')
    const meta = extractComponentMeta(sourceCode)

    if (!meta) {
      console.warn(`No componentMeta found in ${filePath}`)
      continue
    }

    // Convert props to JSON Schema format, auto-detecting slots
    const properties: Record<string, PropertySchema> = {}
    const slots: Record<string, SlotDefinition> = {}

    for (const [propName, propInfo] of Object.entries(componentDoc.props)) {
      // Skip props inherited from other files (e.g., React.HTMLAttributes)
      const parent = (propInfo as any).parent
      if (parent && !parent.fileName.endsWith(entry.path)) {
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

    result.push({
      id,
      name: meta.name,
      category,
      description: meta.description,
      status: 'stable' as const,
      props: {
        type: 'object' as const,
        properties,
      },
      slots: Object.keys(slots).length > 0 ? slots : undefined,
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
