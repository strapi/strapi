import fs from 'fs';
import os from 'os';
import path from 'path';

import { stripJsonComments, tryQuickOutDir } from '../try-quick-outdir';

const vanillaTsconfig = `{
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "."
  },
  "include": [
    // Include root files
    "./",
    // Include all ts files
    "./**/*.ts"
  ]
}`;

describe('stripJsonComments', () => {
  it('removes line comments outside strings', () => {
    expect(stripJsonComments('{"a": 1} // trailing')).toBe('{"a": 1} ');
    expect(stripJsonComments(vanillaTsconfig)).not.toContain('//');
  });

  it('preserves slashes inside strings', () => {
    expect(stripJsonComments('{"path": "https://example.com/a//b"}')).toBe(
      '{"path": "https://example.com/a//b"}'
    );
  });
});

describe('tryQuickOutDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-start-outdir-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeTsconfig = (contents: string) => {
    const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
    fs.writeFileSync(tsconfigPath, contents);
    return tsconfigPath;
  };

  it('resolves the default outDir for a commented scaffold tsconfig', () => {
    const tsconfigPath = writeTsconfig(vanillaTsconfig);

    expect(tryQuickOutDir(tmpDir, tsconfigPath)).toBe(path.join(tmpDir, 'dist'));
  });

  it('resolves a custom local outDir', () => {
    const tsconfigPath = writeTsconfig(
      JSON.stringify({ compilerOptions: { outDir: './build-out' } })
    );

    expect(tryQuickOutDir(tmpDir, tsconfigPath)).toBe(path.join(tmpDir, 'build-out'));
  });

  it('returns null when extends may own outDir', () => {
    const tsconfigPath = writeTsconfig(JSON.stringify({ extends: '@strapi/tsconfig/base' }));

    expect(tryQuickOutDir(tmpDir, tsconfigPath)).toBeNull();
  });

  it('uses a local outDir when extends is present', () => {
    const tsconfigPath = writeTsconfig(
      JSON.stringify({
        extends: '@strapi/tsconfig/base',
        compilerOptions: { outDir: 'dist' },
      })
    );

    expect(tryQuickOutDir(tmpDir, tsconfigPath)).toBe(path.join(tmpDir, 'dist'));
  });

  it('returns null for invalid config', () => {
    const tsconfigPath = writeTsconfig('{ not json');

    expect(tryQuickOutDir(tmpDir, tsconfigPath)).toBeNull();
  });
});
