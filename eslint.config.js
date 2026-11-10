import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'server-dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', '.playwright-browsers/**'] },
  { files: ['scripts/*.mjs'], languageOptions: { globals: { Buffer: 'readonly', URL: 'readonly', console: 'readonly', process: 'readonly' } } },
  js.configs.recommended,
  { files: ['scripts/compare-figma.mjs'], languageOptions: { globals: { Image: 'readonly', document: 'readonly' } } },
  ...tseslint.configs.recommended,
  // Classic JSX calls the native DOM factory; ESLint does not infer that usage.
  { files: ['src/ui/figma/*.tsx'], rules: { '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^h$' }] } },
);
