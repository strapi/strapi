import type { OxlintOverride } from 'oxlint';

/**
 * Server contract imports (`server/src/registries.ts`).
 *
 * Each import must be a declared dependency, so the package's program follows its Nx build
 * order. The rule comes from the local `strapi-registries` JS plugin.
 */
export const registries = {
  files: ['**/server/src/registries.ts'],
  rules: {
    'strapi-registries/declared-dependencies': 'error',
  },
} satisfies OxlintOverride;
