import path from 'node:path';
import { vol, fs } from 'memfs';

jest.mock('fs', () => fs);

// eslint-disable-next-line import/first
import { fileScannerFactory } from '../scanner';

const FILES = {
  'a.ts': 'console.log("a.ts");',
  'b.mjs': 'console.log("a.ts");',
  'c.js': 'console.log("a.ts");',
  'd.js': 'console.log("a.ts");',
  'e.json': 'console.log("a.ts");',
  '.gitignore': 'console.log("a.ts");',
};

const cwd = '/__tests__';
const prefixed = (filename: string) => path.join(cwd, filename);

describe('Scanner', () => {
  beforeEach(() => {
    vol.reset();
    vol.fromJSON(FILES, cwd);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Scan returns an empty list for empty patterns', () => {
    const scanner = fileScannerFactory(cwd);
    const files = scanner.scan([]);

    expect(files).toHaveLength(0);
    expect(files).toStrictEqual([]);
  });

  test.each([
    [['*.js'], ['c.js', 'd.js']],
    [['*.ts'], ['a.ts']],
    [['*.{js,json}'], ['c.js', 'd.js', 'e.json']],
    [
      ['*.{js,json}', '.gitignore'],
      ['c.js', 'd.js', 'e.json', '.gitignore'],
    ],
  ])('Scan returns a list of files matching %s', (patterns, expected) => {
    const scanner = fileScannerFactory(cwd);
    const files = scanner.scan(patterns);

    expect(files).toHaveLength(expected.length);
    expect(files).toStrictEqual(expect.arrayContaining(expected.map(prefixed)));
  });
});
