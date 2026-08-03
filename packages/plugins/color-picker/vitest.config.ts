/* eslint-disable import/no-extraneous-dependencies */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';
// @ts-expect-error - Vitest config uses bundler resolution
import { unitPreset } from 'vitest-config/presets/unit';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const nm = (...segments: string[]) => path.resolve(rootDir, '../../../node_modules', ...segments);

export default mergeConfig(
  unitPreset,
  defineConfig({
    resolve: {
      // Exact bare imports only — keep subpaths like @strapi/icons/symbols intact.
      // These packages declare "type":"module" but ship CJS at "main"; force ESM entry.
      alias: [
        {
          find: /^@strapi\/design-system$/,
          replacement: nm('@strapi/design-system/dist/index.mjs'),
        },
        { find: /^@strapi\/icons$/, replacement: nm('@strapi/icons/dist/index.mjs') },
        {
          find: /^@strapi\/ui-primitives$/,
          replacement: nm('@strapi/ui-primitives/dist/index.mjs'),
        },
      ],
    },
    test: {
      root: __dirname,
      // React component suites use .tsx; keep .ts for pure helpers
      include: ['**/*.vitest.test.{ts,tsx}'],
      setupFiles: ['./vitest.setup.ts'],
      // ColorPickerInput needs DOM; pure helpers still pass under jsdom
      environment: 'jsdom',
      server: {
        deps: {
          inline: ['@strapi/design-system', '@strapi/icons', '@strapi/ui-primitives'],
        },
      },
    },
  })
);
