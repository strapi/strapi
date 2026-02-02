/* eslint-disable import/first */

import path from 'node:path';
import { vol, fs } from 'memfs';

jest.mock('fs', () => fs);
jest.mock('jscodeshift/src/Runner', () => ({ run: jest.fn() }));

import { run as jscodeshift } from 'jscodeshift/src/Runner';

import { codeRunnerFactory } from '../code';
import { codemodFactory } from '../../codemod';
import { semVerFactory } from '../../version';

import type { CodeRunnerConfiguration } from '../code';

const cwd = '/__tests__';

const jsonCodemod = codemodFactory({
  kind: 'json',
  baseDirectory: cwd,
  filename: 'foo.json',
  version: semVerFactory('1.2.3'),
});

const codeCodemod = codemodFactory({
  kind: 'code',
  baseDirectory: cwd,
  filename: 'foo.ts',
  version: semVerFactory('1.2.3'),
});

const files = {
  'a.js': 'a.js',
  'b.js': 'b.js',
  'c.ts': 'c.ts',
} as const;

const paths = Object.keys(files).map((filename) => path.join(cwd, filename));

const configuration: CodeRunnerConfiguration = {
  dry: true,
  print: false,
  silent: true,
  extensions: 'js,ts',
  runInBand: true,
  verbose: 0,
  babel: true,
};

describe('Runner (code)', () => {
  const codeRunner = codeRunnerFactory(paths, configuration);

  beforeEach(() => {
    vol.reset();
    vol.fromJSON(files, cwd);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  describe('valid()', () => {
    test('Returns true for "code" codemods', () => {
      const isValid = codeRunner.valid(codeCodemod);

      expect(isValid).toBe(true);
    });

    test('Returns false for "json" codemods"', () => {
      const isValid = codeRunner.valid(jsonCodemod);

      expect(isValid).toBe(false);
    });
  });

  describe('run()', () => {
    test('Delegate execution to jscodeshift for valid codemods', async () => {
      await codeRunner.run(codeCodemod);

      expect(jscodeshift).toHaveBeenCalledWith(codeCodemod.path, paths, configuration);
    });

    test('Throw on invalid codemod', async () => {
      await expect(codeRunner.run(jsonCodemod)).rejects.toThrow(
        `Invalid codemod provided to the runner: ${jsonCodemod.filename}`
      );
    });
  });
});
