import sanityPluginKitOxlint from '@sanity/plugin-kit/oxlint'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [sanityPluginKitOxlint],
  ignorePatterns: sanityPluginKitOxlint.ignorePatterns ?? [],
  overrides: [
    {
      files: ['**/*.test.ts', '**/__fixtures__/**'],
      rules: { 'typescript/no-unsafe-type-assertion': 'off' }
    }
  ]
})
