const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  writePinnedAppConfig,
  CONFIG_FILES,
} = require('../../../../examples/complex/scripts/write-pinned-app-config');

describe('writePinnedAppConfig', () => {
  test('writes CJS configs without monorepo-only APIs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pinned-config-'));
    try {
      // Pretend a develop-era TS config was copied first
      fs.mkdirSync(path.join(dir, 'config'));
      fs.writeFileSync(
        path.join(dir, 'config', 'database.ts'),
        "import { isDatabaseClientKind } from '@strapi/database';\n"
      );

      writePinnedAppConfig(dir);

      expect(fs.existsSync(path.join(dir, 'config', 'database.ts'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'config', 'database.js'))).toBe(false);

      const databaseTs = fs.readFileSync(path.join(dir, 'config', 'database.ts'), 'utf8');
      expect(databaseTs).not.toMatch(/isDatabaseClientKind/);
      expect(databaseTs).toMatch(/DATABASE_CLIENT/);

      const adminTs = fs.readFileSync(path.join(dir, 'config', 'admin.ts'), 'utf8');
      expect(adminTs).not.toMatch(/docLinks/);

      expect(Object.keys(CONFIG_FILES).sort()).toEqual(
        [
          'admin.ts',
          'api.ts',
          'database.ts',
          'features.ts',
          'middlewares.ts',
          'plugins.ts',
          'server.ts',
        ].sort()
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
