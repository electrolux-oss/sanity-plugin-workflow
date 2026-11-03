import pluginKitOxfmt from '@sanity/plugin-kit/oxfmt'
import { defineConfig } from 'oxfmt'

export default defineConfig({
  ...pluginKitOxfmt,
  arrowParens: 'avoid',
  bracketSpacing: true,
  quoteProps: 'as-needed',
  trailingComma: 'none'
})
