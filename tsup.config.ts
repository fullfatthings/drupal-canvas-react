import { defineConfig } from 'tsup'

export default defineConfig([
  // Main library exports
  {
    entry: [
      'src/index.ts',
      'src/runtime.ts',
      'src/stubs/image.tsx',
      'src/stubs/link.tsx',
    ],
    format: 'esm',
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom'],
  },
  // CLI (shebang is in source file)
  {
    entry: ['src/cli.ts'],
    format: 'esm',
    dts: false,
    splitting: false,
    sourcemap: true,
    external: ['react', 'react-dom', 'tsup'],
  },
])
