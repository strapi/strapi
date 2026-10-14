import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadConfiguration } from '..';

describe('ResolvedConfig.Middlewares', () => {
  let appDir: string;

  beforeEach(() => {
    appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-resolved-middlewares-'));
    fs.writeFileSync(path.join(appDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(appDir, 'config'));
  });

  afterEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true });
  });

  // The loader sets no `middlewares` default, so `ResolvedConfig.Middlewares` marks no field as
  // required; `register-middlewares.ts` applies its list at the read site. This test guards that:
  // a new loader default must also update the type.
  it('leaves middlewares undefined without a config file', () => {
    const config = loadConfiguration({ appDir, distDir: appDir });

    expect(config).not.toHaveProperty('middlewares');
  });
});
