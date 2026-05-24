import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  ...pluginVue.configs['flat/recommended'],
  ...tseslint.configs.recommended,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
)
