import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { loadConfiguration } from '..';

describe('loadConfiguration', () => {
  let appDir: string;

  beforeEach(() => {
    appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-load-config-'));
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({ name: 'app' }));
    fs.mkdirSync(path.join(appDir, 'config'));
  });

  afterEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it('loads a user config/open file even when the open option is set', () => {
    fs.writeFileSync(
      path.join(appDir, 'config', 'open.js'),
      "module.exports = { provider: 'custom', enabled: true };"
    );

    const config = loadConfiguration({ appDir, distDir: appDir, open: true });

    expect(config.open).toEqual({ provider: 'custom', enabled: true });
  });

  it('does not add the open option to the app config', () => {
    const config = loadConfiguration({ appDir, distDir: appDir, open: false });

    expect(config).not.toHaveProperty('open');
  });
});
