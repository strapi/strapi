import { describe, expect, test } from 'vitest';

import { COMPILE_TIMEOUT_MS, compileFixture } from './compile-fixture.test.utils';

// The fixture compiles in about 330k instantiations, around 250k of which load @strapi/types.
// Without the fix, the compiler runs out of heap before it can report a count.
const INSTANTIATIONS_BUDGET = 800_000;

describe('Filters.ObjectNotation with a generic schema UID', () => {
  test(
    'nested filters type-check within the memory and instantiation budget',
    () => {
      const { status, signal, output, instantiations } = compileFixture('generic-uid');

      // A crash (heap limit) or a timeout ends the process without an exit code of 0
      expect({ status, signal }, output).toEqual({ status: 0, signal: null });
      expect(instantiations, output).toBeDefined();
      expect(instantiations).toBeLessThan(INSTANTIATIONS_BUDGET);
    },
    COMPILE_TIMEOUT_MS + 10_000
  );
});
