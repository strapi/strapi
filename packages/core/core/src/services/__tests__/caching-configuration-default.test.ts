import path from 'path';
import fs from 'fs';
import os from 'os';
import { loadConfiguration } from '../../configuration';

describe('loadConfiguration server.cache defaults', () => {
  it('includes defaultProvider memory and empty providers', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-config-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.0.0' }),
        'utf8'
      );
      fs.mkdirSync(path.join(tmp, 'config'), { recursive: true });

      const config = loadConfiguration({
        appDir: tmp,
        distDir: tmp,
        autoReload: false,
        serveAdminPanel: true,
      });

      expect(config.server.cache).toEqual({
        defaultProvider: 'memory',
        providers: {},
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
