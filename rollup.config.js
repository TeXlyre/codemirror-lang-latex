// rollup.config.js
import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'

export default [
  {
    input: 'src/index.ts',
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
    ],
    plugins: [
      typescript({
        sourceMap: true,
        inlineSources: true
      })
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
