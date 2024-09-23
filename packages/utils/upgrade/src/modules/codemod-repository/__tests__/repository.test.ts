import { vol, fs } from 'memfs';

import { SemVer } from 'semver';
import {
  CodemodRepository,
  parseCodemodKindFromFilename,
  codemodRepositoryFactory,
} from '../repository';

jest.mock('fs', () => fs);

const validCwd = '/__unit_tests__';

const srcFiles = {
  'a.code.ts': 'console.log("a.ts")',
  'b.code.ts': 'console.log("b.ts")',
};

const defaultVolume = { '1.0.0': srcFiles, '2.0.0': srcFiles };

describe('CodemodRepository', () => {
  vol.fromNestedJSON(defaultVolume, validCwd);

  afterAll(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test('constructor initializes with a valid directory', () => {
    expect(() => new CodemodRepository(validCwd)).not.toThrow();
  });

  test('constructor fails with an invalid directory', () => {
    const invalidPath = '/invalid/path';
    expect(() => new CodemodRepository(invalidPath)).toThrow(
      `Invalid codemods directory provided "${invalidPath}"`
    );
  });

  test('refresh method updates the repository', () => {
    const version = new SemVer('1.0.0');
    const repo = new CodemodRepository(validCwd);

    expect(repo.count(version)).toBe(0);

    expect(() => repo.refresh()).not.toThrow();

    expect(repo.count(version)).toBe(2);
  });

  test('count method returns the number of codemods for a given version', () => {
    const version = new SemVer('1.0.0');
    const repo = new CodemodRepository(validCwd);

    expect(repo.count(version)).toBe(0);

    expect(() => repo.refresh()).not.toThrow();

    expect(repo.count(version)).toBe(2);
  });

  test('findByVersion method returns the codemods for a given version', () => {
    const version = new SemVer('1.0.0');
    const repo = new CodemodRepository(validCwd);

    expect(repo.findByVersion(version)).toHaveLength(0);

    expect(() => repo.refresh()).not.toThrow();

    const codemods = repo.findByVersion(version);
    expect(codemods).toHaveLength(2);
    codemods.forEach((codemod) => {
      expect(codemod.version.raw).toBe('1.0.0');
    });
  });
});

test('parseCodemodKindFromFilename returns the correct kind', () => {
  expect(parseCodemodKindFromFilename('test.code.js')).toBe('code');
  expect(parseCodemodKindFromFilename('test.json.js')).toBe('json');
});

test('parseCodemodKindFromFilename throws for invalid filename', () => {
  expect(() => parseCodemodKindFromFilename('test.js')).toThrow();
});

test('versionExists method returns true if the version exists', () => {
  const version = new SemVer('1.0.0');
  const repo = new CodemodRepository(validCwd);

  expect(repo.versionExists(version)).toBe(false);

  expect(() => repo.refresh()).not.toThrow();

  expect(repo.versionExists(version)).toBe(true);
});

test('versionExists method returns false if the version does not exist', () => {
  const version = new SemVer('3.0.0');
  const repo = new CodemodRepository(validCwd);

  expect(repo.versionExists(version)).toBe(false);

  expect(() => repo.refresh()).not.toThrow();

  expect(repo.versionExists(version)).toBe(false);
});

describe('parseCodemodKindFromFilename', () => {
  test('valid filename', () => {
    const codeKind = parseCodemodKindFromFilename('test.code.js');
    const jsonKind = parseCodemodKindFromFilename('test.json.js');
    expect(codeKind).toBe('code');
    expect(jsonKind).toBe('json');
  });

  test('invalid filename', () => {
    const filename = 'invalid.file';
    expect(() => parseCodemodKindFromFilename(filename)).toThrow();
  });
});

describe('codemodRepositoryFactory', () => {
  test('returns a valid CodemodRepository instance', () => {
    const repo = codemodRepositoryFactory(validCwd);
    expect(repo).toBeInstanceOf(CodemodRepository);
  });
});
