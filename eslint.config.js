import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', '.next', '.worktrees', '.opencode', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/lib/navigation.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // These modules intentionally sync browser-only state (localStorage) into
    // React state after mount so server and first client render agree.
    files: [
      'src/contexts/**/*.tsx',
      'src/components/layout/Layout.tsx',
      'src/views/settings/SettingsPage.tsx',
      'src/hooks/useApi.ts',
      'src/hooks/useStoredApiToken.ts',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
)
