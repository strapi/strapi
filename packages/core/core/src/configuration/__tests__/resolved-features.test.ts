import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadConfiguration } from '..';

describe('ResolvedFeaturesConfig', () => {
  let appDir: string;

  beforeEach(() => {
    appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-resolved-features-'));
    fs.writeFileSync(path.join(appDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(appDir, 'config'));
  });

  afterEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true });
  });

  // The loader sets no `features` default, so `ResolvedFeaturesConfig` marks no field as
  // required. This test guards that: a new loader default must also update the type.
  it('leaves features undefined without a config file', () => {
    const config = loadConfiguration({ appDir, distDir: appDir });

    expect(config).not.toHaveProperty('features');
  });
});
