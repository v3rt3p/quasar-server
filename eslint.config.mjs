// eslint.config.mjs
import node from '@bksp/style-guide/eslint/node'

export default [
  ...node,
  {
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      camelcase: 'off'
    }
  },
  {
    ignores: ['src/protos/protos.js', 'src/protos/protos.d.ts']
  },
]
