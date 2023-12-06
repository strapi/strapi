/* eslint-disable import/first, import/no-duplicates */

jest.mock('../../core/runner/json', () => ({ transformJSON: jest.fn() }));
jest.mock('../../core/runner/code', () => ({ transformCode: jest.fn() }));

import { transformJSON, transformCode, RunnerOptions } from '../../core';

import { createTransformsRunner } from '../../core';

import type { TransformFile } from '../../types';
import type { Logger, RunnerConfiguration } from '../../core';

const transforms = {
  json: [
    {
      fullPath: '/home/transforms/foo.json.ts',
      path: './transforms/foo.json.ts',
      kind: 'json',
      formatted: 'foo',
      version: '5.0.0',
    },
    {
      fullPath: '/home/transforms/bar.json.js',
      path: './transforms/bar.json.js',
      kind: 'json',
      formatted: 'bar',
      version: '5.0.0',
    },
  ],
  code: [
    {
      fullPath: '/home/transforms/foo.code.ts',
      path: './transforms/foo.code.js',
      kind: 'code',
      formatted: 'foo',
      version: '5.0.0',
    },
    {
      fullPath: '/home/transforms/bar.code.ts',
      path: './transforms/bar.code.js',
      kind: 'code',
      formatted: 'bar',
      version: '5.0.0',
    },
  ],
} satisfies Record<string, TransformFile[]>;

const files = {
  json: ['a.json', 'b.json', 'c.json'],
  code: ['a.js', 'b.ts', 'c.js'],
};

const config: RunnerConfiguration = { code: { dry: true }, json: { cwd: '/', dry: true } };

describe('Runner', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const logger = {
    isSilent: true,
    isDebug: false,
    raw: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    errors: 0,
    warnings: 0,
  } as Logger;
  const options: RunnerOptions = { config, logger };

  describe('Run', () => {
    test('Code runner only runs on code files', async () => {
      const runner = createTransformsRunner([...files.json, ...files.code], options);
      const transformFile = transforms.code.at(0);

      await runner.run(transformFile);

      expect(transformJSON).not.toHaveBeenCalled();
      expect(transformCode).toHaveBeenCalledWith(transformFile.fullPath, files.code, config.code);
    });

    test('JSON runner only runs on json files', async () => {
      const runner = createTransformsRunner([...files.json, ...files.code], options);
      const transformFile = transforms.json.at(0);

      await runner.run(transformFile);

      expect(transformCode).not.toHaveBeenCalled();
      expect(transformJSON).toHaveBeenCalledWith(transformFile.fullPath, files.json, config.json);
    });
  });

  describe('RunAll', () => {
    test('Appropriate runners are called depending on the transform files', async () => {
      const runner = createTransformsRunner([...files.json, ...files.code], options);
      const transformFiles = [...transforms.json, ...transforms.code];

      await runner.runAll(transformFiles);

      transforms.code.forEach((transformFile, i) => {
        expect(transformCode).toHaveBeenNthCalledWith(
          i + 1,
          transforms.code.at(i).fullPath,
          files.code,
          config.code
        );
      });

      transforms.json.forEach((transformFile, i) => {
        expect(transformJSON).toHaveBeenNthCalledWith(
          i + 1,
          transforms.json.at(i).fullPath,
          files.json,
          config.json
        );
      });
    });

    test('Event callbacks are called', async () => {
      const runner = createTransformsRunner([...files.json, ...files.code], options);
      const transformFiles = [...transforms.json, ...transforms.code];

      const onRunStart = jest.fn();
      const onRunFinish = jest.fn();

      await runner.runAll(transformFiles, { onRunStart, onRunFinish });

      expect(onRunStart).toHaveBeenCalledTimes(transformFiles.length);
      expect(onRunFinish).toHaveBeenCalledTimes(transformFiles.length);

      transformFiles.forEach((transformFile, i) => {
        expect(onRunStart).toHaveBeenNthCalledWith(i + 1, transformFile, i);
        expect(onRunFinish).toHaveBeenNthCalledWith(i + 1, transformFile, i, undefined);
      });
    });
  });
});
