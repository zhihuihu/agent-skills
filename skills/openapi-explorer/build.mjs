import { build } from 'esbuild'

await build({
  entryPoints: ['src/openapi-explorer.mjs'],
  outfile: 'scripts/openapi-explorer.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  legalComments: 'inline',
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);"
  }
})
