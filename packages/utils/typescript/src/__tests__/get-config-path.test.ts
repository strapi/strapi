import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { getConfigPath } from '../utils/get-config-path';

describe('getConfigPath', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'strapi-config-path-'));
    writeFileSync(path.join(root, 'tsconfig.json'), '{}');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it.each(['ts', 'tsconfig', 'app'])('does not accept a parent config for directory %s', (name) => {
    const directory = path.join(root, name);
    mkdirSync(directory);

    expect(getConfigPath(directory)).toBeUndefined();
  });

  it('still permits ancestor lookup when explicitly requested', () => {
    const directory = path.join(root, 'ts');
    mkdirSync(directory);

    expect(getConfigPath(directory, { ancestorsLookup: true })).toBe(
      path.join(root, 'tsconfig.json')
    );
  });

  it('prefers the local config over a parent config', () => {
    const directory = path.join(root, 'ts');
    mkdirSync(directory);
    const configPath = path.join(directory, 'tsconfig.json');
    writeFileSync(configPath, '{}');

    expect(getConfigPath(directory)).toBe(configPath);
    expect(getConfigPath(directory, { ancestorsLookup: true })).toBe(configPath);
  });

  it('applies directory boundaries to custom filenames too', () => {
    const directory = path.join(root, 'build');
    mkdirSync(directory);
    writeFileSync(path.join(root, 'build.json'), '{}');

    expect(getConfigPath(directory, { filename: 'build.json' })).toBeUndefined();
    expect(getConfigPath(directory, { filename: 'build.json', ancestorsLookup: true })).toBe(
      path.join(root, 'build.json')
    );
  });

  it('preserves custom config paths within the requested directory', () => {
    const directory = path.join(root, 'app');
    mkdirSync(path.join(directory, 'config'), { recursive: true });
    const configPath = path.join(directory, 'config/tsconfig.json');
    writeFileSync(configPath, '{}');

    expect(getConfigPath(directory, { filename: 'config/tsconfig.json' })).toBe(configPath);
  });

  it('resolves relative directory paths', () => {
    expect(getConfigPath(path.relative(process.cwd(), root))).toBe(
      path.join(root, 'tsconfig.json')
    );
  });

  it('returns undefined when the requested filename cannot be found', () => {
    expect(getConfigPath(root, { filename: 'missing-strapi-config.json' })).toBeUndefined();
  });
});
