import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

const TSC_PATH = require.resolve('typescript/bin/tsc');
const FIXTURE_TSCONFIG = path.join(__dirname, 'resources', 'hooks-types', 'tsconfig.json');
const TIMEOUT_MS = 60_000;

describe('Hook types', () => {
  test(
    'untyped hooks keep their types, and typed hooks check handlers and contexts',
    () => {
      const result = spawnSync(process.execPath, [TSC_PATH, '--project', FIXTURE_TSCONFIG], {
        encoding: 'utf8',
        timeout: TIMEOUT_MS,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

      expect({ status: result.status, signal: result.signal }, output).toEqual({
        status: 0,
        signal: null,
      });
    },
    TIMEOUT_MS + 10_000
  );
});
