import fs from 'fs';
import os from 'os';
import path from 'path';

import { loadConfiguration } from '..';

describe('ResolvedConfig.Api', () => {
  let appDir: string;

  beforeEach(() => {
    appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-resolved-api-'));
    fs.writeFileSync(path.join(appDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(appDir, 'config'));
  });

  afterEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it('defines every field the contract marks as required with an empty user config', () => {
    const config = loadConfiguration({ appDir, distDir: appDir });

    expect(config.api.rest).toBeDefined();
    expect(config.api.rest.prefix).toBe('/api');
  });
});
