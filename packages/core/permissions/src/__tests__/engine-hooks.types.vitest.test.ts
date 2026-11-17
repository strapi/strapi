import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

const TSC_PATH = require.resolve('typescript/bin/tsc');
const FIXTURE_DIR = path.join(__dirname, 'resources', 'engine-hooks-types');
const TIMEOUT_MS = 60_000;

describe('Engine hook types', () => {
  // `tsconfig.non-strict.json` compiles the `call` arguments with the server preset of
  // `@strapi/typescript-utils` (`strict: false`), as many applications do
  test.each(['tsconfig.json', 'tsconfig.non-strict.json'])(
    'the engine keeps untyped handlers, and the typed hooks check handlers and contexts (%s)',
    (tsconfig) => {
      const result = spawnSync(
        process.execPath,
        [TSC_PATH, '--project', path.join(FIXTURE_DIR, tsconfig)],
        {
          encoding: 'utf8',
          timeout: TIMEOUT_MS,
        }
      );
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

      expect({ status: result.status, signal: result.signal }, output).toEqual({
        status: 0,
        signal: null,
      });
    },
    TIMEOUT_MS + 10_000
  );
});
