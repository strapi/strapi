import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadConfiguration } from '..';

describe('ResolvedConfig.Database', () => {
  let appDir: string;

  beforeEach(() => {
    appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-resolved-database-'));
    fs.writeFileSync(path.join(appDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(appDir, 'config'));
  });

  afterEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true });
  });

  test('the loader sets no database default', () => {
    // `ResolvedConfig.Database` marks no field as required: the loader defines nothing under
    // `database`, so with an empty `config/` the namespace stays undefined.
    const config = loadConfiguration({ appDir, distDir: appDir });

    expect(config).not.toHaveProperty('database');
  });
});
