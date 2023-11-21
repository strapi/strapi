/* eslint-disable import/first */

// Prevent fs-extra from writing on the file system during tests
jest.mock('fs-extra', () => ({ writeFileSync: jest.fn() }));

import fse from 'fs-extra';

import { JSONTransform, transformJSON } from '../../core';

const JSON_MODULES_MOCKS = {
  'fake-a.json.ts': { foo: 'bar' },
  'fake-b.json.ts': { bar: 'foo' },
};

const TRANSFORM_FILE_NAME = 'fake.transform.json.ts';

const transformFileContent: JSONTransform = (file, api) => {
  const j = api.json(file.json);

  if (j.has('foo')) {
    j.set('foo', 'baz');
  }

  return j.root();
};

describe('JSON Transform Runner', () => {
  const cwd = '/home/test';

  beforeAll(() => {
    // Register fake json modules
    for (const [fileName, json] of Object.entries(JSON_MODULES_MOCKS)) {
      jest.mock(fileName, () => json, { virtual: true });
    }

    // Register fake transform file
    jest.mock(TRANSFORM_FILE_NAME, () => transformFileContent, { virtual: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Transform invalid json file', async () => {
    const report = await transformJSON(TRANSFORM_FILE_NAME, ['unknown-path.json'], {
      cwd,
      dry: true,
    });

    expect(report.ok).toBe(0);
    expect(report.nochange).toBe(0);
    expect(report.error).toBe(1);
  });

  test('Transform valid json files', async () => {
    const report = await transformJSON(TRANSFORM_FILE_NAME, Object.keys(JSON_MODULES_MOCKS), {
      cwd,
    });

    expect(report.ok).toBe(1); // fake-a should have been modified
    expect(report.nochange).toBe(1); // fake-b shouldn't be modified
    expect(report.error).toBe(0);
  });

  test('Dry mode should prevent file updates', async () => {
    const report = await transformJSON(TRANSFORM_FILE_NAME, Object.keys(JSON_MODULES_MOCKS), {
      cwd,
      dry: true,
    });

    expect(report.ok).toBe(1);
    expect(report.nochange).toBe(1);

    expect(fse.writeFileSync).not.toHaveBeenCalled();
  });

  test('When dry mode is disabled, the file should be updated', async () => {
    const report = await transformJSON(TRANSFORM_FILE_NAME, Object.keys(JSON_MODULES_MOCKS), {
      cwd,
    });

    expect(report.ok).toBe(1);
    expect(report.nochange).toBe(1);

    const expectedFileName = 'fake-a.json.ts';
    const expectedValue = JSON.stringify({ foo: 'baz' }, null, 2);

    expect(fse.writeFileSync).toHaveBeenCalledWith(expectedFileName, expectedValue);
  });
});
