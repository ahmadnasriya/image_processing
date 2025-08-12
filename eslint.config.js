import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginPrettier from 'eslint-plugin-prettier'

export default defineConfig([
    // Base JavaScript recommended rules
    js.configs.recommended,

    // TypeScript recommended rules
    ...tseslint.configs.recommended,

    // Disable ESLint rules that conflict with Prettier
    eslintConfigPrettier,

    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: {
            prettier: eslintPluginPrettier
        },
        rules: {
            semi: 'error',
            'prefer-const': 'error',
            'prettier/prettier': 'error', // Prettier errors in ESLint
            "@typescript-eslint/no-namespace": [
                "error",
                { "allowDeclarations": true }
            ]
        }
    }
])