import { defineConfig, mergeConfig } from 'vitest/config';
import { unitPreset } from 'vitest-config/presets/unit';

export default mergeConfig(
  unitPreset,
  defineConfig({
    test: {
      root: __dirname,
      // Content-type suites import dist/. `test:unit:vitest` builds first.
      // `test:unit:vitest:watch` does not rebuild after source edits. Run the
      // package `watch` script alongside it so those suites do not keep a stale build.
    },
  })
);
