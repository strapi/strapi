import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  COMPILE_TIMEOUT_MS,
  compileFixture,
} from '../filters/__tests__/compile-fixture.test.utils';

const fixture = (name: string) => path.join(__dirname, 'resources', name);

describe('Document Service delete status', () => {
  test(
    'follows the draft and publish option of each content type',
    () => {
      const { status, signal, output } = compileFixture(fixture('delete-status'));

      expect({ status, signal }, output).toEqual({ status: 0, signal: null });
    },
    COMPILE_TIMEOUT_MS + 10_000
  );

  test(
    'accepts every status with a known UID in an app without generated types',
    () => {
      const { status, signal, output } = compileFixture(fixture('delete-status-no-registry'));

      expect({ status, signal }, output).toEqual({ status: 0, signal: null });
    },
    COMPILE_TIMEOUT_MS + 10_000
  );
});
