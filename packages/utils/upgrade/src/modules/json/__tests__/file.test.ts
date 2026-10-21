/* eslint-disable import/first */

import path from 'node:path';
import { vol, fs } from 'memfs';

jest.mock('fs', () => fs);

import fse from 'fs-extra';

import { readJSON, saveJSON } from '../file';

describe('File (json)', () => {
  const cwd = '/__tests__';
  const obj = { foo: 'bar', bar: { baz: 42 } };

  beforeEach(() => {
    vol.reset();

    jest.spyOn(fse, 'readFile');
    jest.spyOn(fse, 'writeFile');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('readJSON', () => {
    test('Reading a JSON file returns a valid JSON object', async () => {
      const filename = 'a.json';
      const filepath = path.join(cwd, filename);

      vol.fromJSON({ [filepath]: JSON.stringify(obj) }, cwd);

      const json = await readJSON(filepath);

      expect(json).toStrictEqual(obj);
    });

    test('Reading a JSONC file (comments, trailing commas) returns a valid JSON object', async () => {
      const filepath = path.join(cwd, 'tsconfig.json');

      vol.fromJSON(
        {
          [filepath]: '{\n  // comment\n  "foo": "bar", /* block */\n  "bar": { "baz": 42, },\n}\n',
        },
        cwd
      );

      const json = await readJSON(filepath);

      expect(json).toStrictEqual(obj);
    });

    test('Reading an invalid JSON file throws', async () => {
      const filepath = path.join(cwd, 'a.json');

      vol.fromJSON({ [filepath]: '{ "foo": ' }, cwd);

      await expect(() => readJSON(filepath)).rejects.toThrowError(SyntaxError);
    });

    test(`Reading a JSON file which doesn't exist`, async () => {
      vol.fromJSON({}, cwd);

      await expect(() => readJSON('unknown-path.json')).rejects.toThrowError();
    });
  });

  describe('saveJSON', () => {
    test('saveJSON can update an existing file', async () => {
      const updated = { ...obj, other: 'foobar' };

      const filename = 'a.json';
      const filepath = path.join(cwd, filename);

      vol.fromJSON({ [filename]: JSON.stringify(obj) }, cwd);

      const current = await readJSON(filepath);

      expect(current).toStrictEqual(obj);

      await saveJSON(filepath, updated);

      const result = await readJSON(filepath);

      // saveJSON reads the existing file to keep its comments and formatting
      expect(fse.readFile).toHaveBeenCalledTimes(3);
      expect(fse.writeFile).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual(updated);
      expect(current).not.toStrictEqual(updated);
    });

    test('saveJSON keeps the comments and formatting of an existing file', async () => {
      const filepath = path.join(cwd, 'tsconfig.json');
      const source = [
        '{',
        '  "compilerOptions": {',
        '    "module": "CommonJS",',
        '    "moduleResolution": "Node",',
        '    "strict": true',
        '  },',
        '  "include": [',
        '    // Include root files',
        '    "./"',
        '  ]',
        '}',
        '',
      ].join('\n');

      vol.fromJSON({ [filepath]: source }, cwd);

      await saveJSON(filepath, {
        compilerOptions: { module: 'CommonJS', strict: true, outDir: 'dist' },
        include: ['./'],
      });

      expect(vol.readFileSync(filepath).toString()).toBe(
        [
          '{',
          '  "compilerOptions": {',
          '    "module": "CommonJS",',
          '    "strict": true,',
          '    "outDir": "dist"',
          '  },',
          '  "include": [',
          '    // Include root files',
          '    "./"',
          '  ]',
          '}',
          '',
        ].join('\n')
      );
    });

    test('saveJSON can create a new file', async () => {
      const filename = 'a.json';
      const filepath = path.join(cwd, filename);

      vol.mkdirSync(cwd);

      await expect(() => readJSON(filepath)).rejects.toThrowError();

      await saveJSON(filepath, obj);

      const result = await readJSON(filepath);

      expect(fse.readFile).toHaveBeenCalledTimes(2);
      expect(fse.writeFile).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual(obj);
    });
  });
});
