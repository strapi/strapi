import { defineConfig } from '@eloqnt/cli';

export default defineConfig({
  messages: {
    path: './packages/core/admin/admin/src/translations/{locale}',
    sourceLocale: 'en',
    format: 'json',
  },
  lint: {
    overrides: [
      {
        locales: ['sa'],
        rules: {
          // `sa` (Sanskrit) has no CLDR plural data, so Intl.PluralRules('sa')
          // silently falls back to the default locale
          'invalid-locale': 'off',
        },
      },
    ],
  },
});
