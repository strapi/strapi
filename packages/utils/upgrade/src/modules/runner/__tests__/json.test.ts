/* eslint-disable import/first */

import path from 'node:path';
import { vol, fs } from 'memfs';

jest.mock('fs', () => fs);
jest.mock('../json/transform', () => ({ transformJSON: jest.fn() }));

import { jsonRunnerFactory } from '../json';
import { transformJSON } from '../json/transform';
import { codemodFactory } from '../../codemod';
import { semVerFactory } from '../../version';

import type { JSONRunnerConfiguration } from '../json';

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
  'a.json': 'a.json',
  'b.json': 'b.json',
  'c.json': 'c.json',
} as const;

const paths = Object.keys(files).map((filename) => path.join(cwd, filename));

const configuration: JSONRunnerConfiguration = {
  dry: true,
  cwd,
};

describe('Runner (json)', () => {
  const jsonRunner = jsonRunnerFactory(paths, configuration);

  beforeEach(() => {
    vol.reset();
    vol.fromJSON(files, cwd);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  describe('valid()', () => {
    test('Returns true for "json" codemods', () => {
      const isValid = jsonRunner.valid(jsonCodemod);

      expect(isValid).toBe(true);
    });

    test('Returns false for "code" codemods"', () => {
      const isValid = jsonRunner.valid(codeCodemod);

      expect(isValid).toBe(false);
    });
  });

  describe('run()', () => {
    test('Delegate execution to the JSON runner for valid codemods', async () => {
      await jsonRunner.run(jsonCodemod);

      expect(transformJSON).toHaveBeenCalledWith(jsonCodemod.path, paths, configuration);
    });

    test('Throw on invalid codemod', async () => {
      const codemod = codeCodemod;

      await expect(jsonRunner.run(codemod)).rejects.toThrow(
        `Invalid codemod provided to the runner: ${codemod.filename}`
      );
    });
  });
});
