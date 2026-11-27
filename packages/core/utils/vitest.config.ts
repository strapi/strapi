import { defineConfig, mergeConfig } from 'vitest/config';
import { unitPreset } from 'vitest-config/presets/unit';

export default mergeConfig(
  unitPreset,
  defineConfig({
    test: {
      root: __dirname,
      // Type-check the vitest tests, so `expectTypeOf` assertions fail the run when wrong.
      // `tsconfig.json` excludes `__tests__`, hence a dedicated tsconfig.
      typecheck: {
        enabled: true,
        tsconfig: './tsconfig.vitest.json',
        include: ['**/*.vitest.test.ts'],
      },
    },
  })
);
