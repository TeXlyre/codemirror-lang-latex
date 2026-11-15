// rollup.config.js
import { copyFileSync } from 'node:fs'
import { dts } from 'rollup-plugin-dts'

for (const file of ['latex.mjs', 'latex.terms.mjs', 'tokens.mjs']) {
  copyFileSync(new URL(`./src/${file}`, import.meta.url), new URL(`./.build/${file}`, import.meta.url))
}

export default [
  {
    input: '.build/index.js',
    output: {
      format: 'es',
      file: 'dist/index.js',
      sourcemap: true
    },
    external: [
      '@codemirror/autocomplete',
      '@codemirror/language',
      '@codemirror/lint',
      '@codemirror/state',
      '@codemirror/view',
      '@lezer/common',
      '@lezer/highlight',
      '@lezer/lr',
      'tslib'
    ]
  },
  {
    input: 'src/index.ts',
    output: {
      format: 'es',
      file: 'dist/index.d.ts'
    },
    plugins: [dts()]
  }
]
