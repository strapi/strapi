import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadConfiguration } from '..';

describe('ResolvedTypeScriptConfig', () => {
  let appDir: string;

  beforeEach(() => {
    appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-resolved-typescript-'));
    fs.writeFileSync(path.join(appDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(appDir, 'config'));
  });

  afterEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true });
  });

  // ResolvedTypeScriptConfig marks no field as required: the loader sets no `typescript` default.
  // This test fails when a loader default appears, so the contract gets updated with it.
  it('sets no typescript default', () => {
    const config = loadConfiguration({ appDir, distDir: appDir });

    expect(config).not.toHaveProperty('typescript');
  });
});
