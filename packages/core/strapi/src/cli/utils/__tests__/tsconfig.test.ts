import fs from 'fs';
import os from 'os';
import path from 'path';

import { createLogger } from '../logger';
import { loadTsConfig } from '../tsconfig';

describe('loadTsConfig', () => {
  let tmpDir: string;
  let appDir: string;

  const logger = createLogger({ silent: true });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-load-tsconfig-'));
    appDir = path.join(tmpDir, 'app');
    fs.mkdirSync(appDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads the tsconfig located in cwd', () => {
    fs.writeFileSync(
      path.join(appDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { outDir: 'dist' } })
    );

    const tsconfig = loadTsConfig({ cwd: appDir, path: 'tsconfig.json', logger });

    expect(tsconfig?.path).toBe(path.join(appDir, 'tsconfig.json'));
    expect(tsconfig?.config.options.outDir).toBe(path.join(appDir, 'dist'));
  });

  it('returns undefined when cwd has no tsconfig', () => {
    expect(loadTsConfig({ cwd: appDir, path: 'tsconfig.json', logger })).toBeUndefined();
  });

  it('ignores a tsconfig located in a parent directory', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { outDir: 'dist' } })
    );

    expect(loadTsConfig({ cwd: appDir, path: 'tsconfig.json', logger })).toBeUndefined();
  });
});
