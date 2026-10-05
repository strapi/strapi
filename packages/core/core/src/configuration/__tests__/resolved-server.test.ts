import fs from 'fs';
import os from 'os';
import path from 'path';
import _ from 'lodash';

import { loadConfiguration } from '..';

describe('ResolvedConfig.Server', () => {
  let appDir: string;

  beforeEach(() => {
    appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-resolved-server-'));
    fs.writeFileSync(path.join(appDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(appDir, 'config'));
  });

  afterEach(() => {
    fs.rmSync(appDir, { recursive: true, force: true });
  });

  // Every path `ResolvedConfig.Server` marks as required. A new required field must be added here.
  it.each([
    'host',
    'port',
    'url',
    'absoluteUrl',
    'proxy',
    'cron.enabled',
    'dirs.public',
    'transfer.remote.enabled',
    'logger.updates.enabled',
    'logger.startup.enabled',
    'openapi.content-api.access',
    'openapi.content-api.route.path',
    'openapi.content-api.cache.enabled',
    'openapi.content-api.cache.maxAgeMs',
    'openapi.content-api.cache.filePath',
    'openapi.admin.access',
    'openapi.admin.route.path',
    'openapi.admin.cache.enabled',
    'openapi.admin.cache.maxAgeMs',
    'openapi.admin.cache.filePath',
  ])('defines server.%s without a config file', (field) => {
    const config = loadConfiguration({ appDir, distDir: appDir });

    expect(_.get(config.server, field.split('.'))).not.toBeUndefined();
  });
});
