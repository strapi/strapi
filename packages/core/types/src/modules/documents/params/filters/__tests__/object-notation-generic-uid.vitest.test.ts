import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

const TSC_PATH = require.resolve('typescript/bin/tsc');
const FIXTURE_TSCONFIG = path.join(__dirname, 'resources', 'generic-uid', 'tsconfig.json');

// The fixture compiles in about 500k instantiations, around half of which load @strapi/types.
// Without the fix, the compiler runs out of heap before it can report a count.
const INSTANTIATIONS_BUDGET = 800_000;
const HEAP_LIMIT_MB = 1024;
const TIMEOUT_MS = 60_000;

const compileFixture = () => {
  const result = spawnSync(
    process.execPath,
    [
      `--max-old-space-size=${HEAP_LIMIT_MB}`,
      TSC_PATH,
      '--project',
      FIXTURE_TSCONFIG,
      '--extendedDiagnostics',
    ],
    { encoding: 'utf8', timeout: TIMEOUT_MS }
  );

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const instantiations = output.match(/^Instantiations:\s+(\d+)$/m);

  return {
    status: result.status,
    signal: result.signal,
    output,
    instantiations: instantiations === null ? undefined : Number(instantiations[1]),
  };
};

describe('Filters.ObjectNotation with a generic schema UID', () => {
  test(
    'nested filters type-check within the memory and instantiation budget',
    () => {
      const { status, signal, output, instantiations } = compileFixture();

      // A crash (heap limit) or a timeout ends the process without an exit code of 0
      expect({ status, signal }, output).toEqual({ status: 0, signal: null });
      expect(instantiations, output).toBeDefined();
      expect(instantiations).toBeLessThan(INSTANTIATIONS_BUDGET);
    },
    TIMEOUT_MS + 10_000
  );
});
