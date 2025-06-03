/* eslint-disable import/first */

import path from 'node:path';
import { vol, fs } from 'memfs';

jest.mock('fs', () => fs);
jest.mock('esbuild-register/dist/node', () => ({
  register: jest.fn(() => ({ unregister: jest.fn() })),
}));

const cwd = '/__tests__';

const files = {
  'a.json': '{ "foo": "bar", "nested": { "bar": 42 } }',
  'b.json': '{ "foo": "baz", "nb": 42 }',
} as const;

const paths = Object.keys(files).map((f) => path.join(cwd, f));

const codemodNoReturnValue = {
  path: 'no-return.json.ts',
  handler: jest.fn() satisfies JSONTransform,
};

const codemodNoUpdate = {
  path: 'no-update.json.ts',
  handler: jest.fn((file) => file.json) satisfies JSONTransform,
};

const codemodUpdate = {
  path: 'update.json.ts',
  handler: jest.fn(() => ({ unknown: 'object' })) satisfies JSONTransform,
};

const codemodThrow = {
  path: 'throw.json.ts',
  handler: jest.fn(() => {
    throw new Error();
  }) satisfies JSONTransform,
};

const codemodFullPath = (codemodPath: string) => path.join(cwd, codemodPath);

const allCodemods = [codemodNoReturnValue, codemodNoUpdate, codemodUpdate, codemodThrow];

for (const codemod of allCodemods) {
  jest.mock(codemodFullPath(codemod.path), () => codemod.handler, { virtual: true });
}

for (const filepath of paths) {
  jest.mock(filepath, () => files[path.basename(filepath)], { virtual: true });
}

const configuration: JSONRunnerConfiguration = { dry: true, cwd };

import { transformJSON } from '../json/transform';

import type { JSONRunnerConfiguration, JSONTransform } from '../json';

describe('JSON Transform', () => {
  beforeEach(() => {
    vol.reset();
    vol.fromJSON(files, cwd);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Codemods that return nothing are considered as "errored" state', async () => {
    const codemodPath = codemodFullPath(codemodNoReturnValue.path);

    const report = await transformJSON(codemodPath, paths, configuration);

    expect(report.ok).toBe(0);
    expect(report.nochange).toBe(0);
    expect(report.skip).toBe(0);
    expect(report.error).toBe(2);
  });

  test('Codemods that throw an error are considered as "errored" state', async () => {
    const codemodPath = codemodFullPath(codemodThrow.path);

    const report = await transformJSON(codemodPath, paths, configuration);

    expect(report.ok).toBe(0);
    expect(report.nochange).toBe(0);
    expect(report.skip).toBe(0);
    expect(report.error).toBe(2);
  });

  test('Leaving the JSON object as-is is considered as "unchanged" state', async () => {
    const codemodPath = codemodFullPath(codemodNoUpdate.path);

    const report = await transformJSON(codemodPath, paths, configuration);

    expect(report.ok).toBe(0);
    expect(report.nochange).toBe(2);
    expect(report.skip).toBe(0);
    expect(report.error).toBe(0);
  });

  test('Making updates to the JSON object is considered as "ok" state', async () => {
    const codemodPath = codemodFullPath(codemodUpdate.path);

    const report = await transformJSON(codemodPath, paths, configuration);

    expect(report.ok).toBe(2);
    expect(report.nochange).toBe(0);
    expect(report.skip).toBe(0);
    expect(report.error).toBe(0);
  });

  test('Making updates in non-dry mode changes the file content on the disk', async () => {
    const codemodPath = codemodFullPath(codemodUpdate.path);
    const expected = { unknown: 'object' };

    await transformJSON(codemodPath, paths, { ...configuration, dry: false });

    paths.forEach((filepath) => {
      const fileContent = JSON.parse(vol.readFileSync(filepath).toString());

      expect(fileContent).toStrictEqual(expected);
    });
  });
});
